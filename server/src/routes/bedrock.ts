/**
 * Bedrock Agent proxy routes
 *
 * POST /api/bedrock/marketing   — marketing plan agent
 * POST /api/bedrock/startup     — startup registration agent
 * POST /api/bedrock/marketing
 *   Invokes the marketing-plan Bedrock agent with a prompt built from the
 *   submitted BusinessProfile, collects the streamed response chunks, and
 *   returns the assembled JSON string as { content: string }.
 *
 *   The agent is expected to return a single JSON object that matches the
 *   MarketingPlan schema consumed by the client-side MarketingPlan component.
 *
 *   If the agent does not return valid JSON, the request is retried up to
 *   5 times before returning an error.
 *
 * POST /api/bedrock/fund-allocation
 *   Invokes the fund-allocation Bedrock agent (RMJF0EXRHR / RDAMSJUEK5).
 *   Accepts BusinessProfile fields, returns a JSON budget allocation plan
 *   matching the FundAllocationPlan schema.
 */

import { Router, Request, Response } from 'express'
import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime'

import {
    extractBalancedJsonObject,
    escapeControlCharsInJsonStrings,
    stripTrailingJsonCommas,
} from '../utils/extractBalancedJson'

const router = Router()

const client = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION ?? 'ap-southeast-1',
    ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        }
        : {}),
})

const MAX_RETRIES = 5

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Bedrock may surface throttling as ThrottlingException or a generic Error message. */
function isThrottlingError(err: unknown): boolean {
    const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } }
    const msg = (e.message ?? '').toLowerCase()
    return (
        e.name === 'ThrottlingException' ||
        e.name === 'TooManyRequestsException' ||
        e.$metadata?.httpStatusCode === 429 ||
        msg.includes('rate is too high') ||
        msg.includes('throttl') ||
        msg.includes('too many requests')
    )
}

function throttleBackoffMs(attempt: number): number {
    const base = Math.min(45_000, 5_000 * 2 ** (attempt - 1))
    return base + Math.floor(Math.random() * 600)
}

const THROTTLE_USER_MESSAGE =
    'Our AI service is busy right now. Please wait a moment and try again.'

/** Max Bedrock InvokeAgent calls per HTTP request (document generator). */
const DOCUMENT_GENERATOR_MAX_INVOCATIONS = 3

/** Serialize document-generator calls so Owner Tools + manual clicks don't stack TPS. */
let documentGeneratorQueue: Promise<void> = Promise.resolve()

function enqueueDocumentGenerator<T>(fn: () => Promise<T>): Promise<T> {
    const run = documentGeneratorQueue.then(fn, fn)
    documentGeneratorQueue = run.then(
        () => undefined,
        () => undefined,
    )
    return run
}

function looksLikeJsonObject(raw: string): boolean {
    const t = raw.trim()
    return t.includes('{') && t.includes('}')
}

function shouldRetryAfterInvalidJson(raw: string): boolean {
    if (!looksLikeJsonObject(raw)) return false
    const t = raw.trim()
    // Likely truncated JSON — worth one slow retry; short prose/errors are not.
    return t.length > 400 || (t.startsWith('{') && !t.endsWith('}'))
}

function looksLikeAgentClarification(raw: string): boolean {
    const t = raw.trim().toLowerCase()
    return (
        (t.includes('?') &&
            (t.includes('can you provide') ||
                t.includes('could you provide') ||
                t.includes('more details') ||
                t.includes('what type of') ||
                t.includes('please provide'))) ||
        t.startsWith('can you ') ||
        t.startsWith('could you ')
    )
}

const DOCUMENT_JSON_SCHEMA_HINT = `{
  "documentType": string,
  "companyName": string,
  "generatedAt": string,
  "sections": [{
    "title": string,
    "content": string | string[],
    "chart"?: { "type": "bar" | "line", "yAxisLabel"?: string, "series": [{ "label": string, "value": number }] }
  }],
  "disclaimer": string
}`

function buildDocumentGeneratorInputText(fields: {
    documentType: string
    companyName: string
    businessType: string
    industry: string
    businessStage: string
    city: string
    targetCustomer?: string
    mainGoal?: string
    currentFunds?: number
    templateText?: string
    additionalContext?: string
    forceAssumeDefaults?: boolean
    priorAgentQuestion?: string
}): string {
    const profileLines = [
        `Report brief to generate: ${fields.documentType}`,
        `Company: ${fields.companyName}`,
        `Business Type: ${fields.businessType}`,
        `Industry: ${fields.industry}`,
        `Business Stage: ${fields.businessStage}`,
        `Location: ${fields.city}, Malaysia`,
        fields.targetCustomer
            ? `Target Customer: ${fields.targetCustomer}`
            : null,
        fields.mainGoal ? `Main Business Goal: ${fields.mainGoal}` : null,
        fields.currentFunds != null
            ? `Current Funds: RM ${Number(fields.currentFunds).toLocaleString('en-MY')}`
            : null,
        fields.templateText ? `Template Reference:\n${fields.templateText}` : null,
    ].filter((line): line is string => line != null && line !== '')

    const outputRules = [
        'TASK: Write the full business report requested below for a Malaysian SME.',
        'OUTPUT RULES (mandatory):',
        '- Return ONLY valid JSON matching the schema — no markdown fences, no preamble, no questions to the user.',
        '- Do NOT ask for more information. Never reply with clarifying questions.',
        '- Use professional English suitable for banks, grants, or internal planning.',
        `JSON schema: ${DOCUMENT_JSON_SCHEMA_HINT}`,
        '- Prefer string[] for bullet lists (one bullet per array item). Never put literal line breaks inside a JSON string — use \\n only if you must use a single string.',
        '- For tables or timelines use ONE string with pipe-separated rows: "Col A | Col B\\nrow1a | row1b" (no raw newlines breaking JSON).',
        '- Optional per section: include "chart" only when you have at least two numeric data points. Use type "bar" for categories, "line" for time series. Omit "chart" when not needed.',
    ]

    if (fields.forceAssumeDefaults) {
        outputRules.push(
            '- The user chose to proceed without more detail: invent plausible product/service assumptions for this industry and city, label them clearly in one section, then complete the full report.',
        )
    } else if (fields.additionalContext?.trim()) {
        outputRules.push(
            '- The user supplied additional detail below — treat it as authoritative and complete the report without asking anything else.',
        )
    } else {
        outputRules.push(
            '- If product/menu specifics are missing (e.g. generic F&B), assume a plausible offering for the industry and city, label assumptions in one section, then complete the report.',
        )
    }

    const blocks: string[] = [...outputRules, '', '--- BUSINESS PROFILE ---', ...profileLines]

    if (fields.additionalContext?.trim()) {
        blocks.push(
            '',
            '--- ADDITIONAL DETAILS FROM USER (use directly; do not ask again) ---',
            fields.additionalContext.trim(),
        )
    }

    if (fields.priorAgentQuestion?.trim()) {
        blocks.push(
            '',
            '--- PRIOR AGENT MESSAGE (already answered above; do not repeat this question) ---',
            fields.priorAgentQuestion.trim(),
        )
    }

    return blocks.join('\n')
}

/**
 * Returns true if the error is an AWS throttling / rate-limit error.
 * Checks both the message string and AWS SDK error name/code fields.
 */
function isThrottleError(err: unknown): boolean {
    if (err == null) return false
    const e = err as Record<string, unknown>

    // Check AWS SDK error name / code
    const name = String(e.name ?? '').toLowerCase()
    const code = String(e.code ?? '').toLowerCase()
    if (
        name.includes('throttling') ||
        name.includes('toomanyrequests') ||
        code.includes('throttling') ||
        code.includes('toomanyrequests')
    ) return true

    // Check message string
    if (err instanceof Error) {
        const msg = err.message.toLowerCase()
        return (
            msg.includes('too many requests') ||
            msg.includes('request rate is too high') ||
            msg.includes('throttlingexception') ||
            msg.includes('toomanyrequestsexception') ||
            msg.includes('reduce the frequency')
        )
    }
    return false
}

/**
 * Strip markdown code fences and extract the JSON object from a raw string.
 * Returns the cleaned string (may or may not be valid JSON).
 */
function extractJsonString(raw: string): string {
    let cleaned = raw.trim()

    // Remove markdown code fences if present
    if (cleaned.startsWith('```')) {
        cleaned = cleaned
            .replace(/^```(?:json)?\n?/i, '')
            .replace(/\n?```$/, '')
            .trim()
    }

    // Isolate the first complete JSON object (respects `}` inside strings)
    const balanced = extractBalancedJsonObject(cleaned)
    if (balanced) {
        cleaned = balanced
    } else {
        const start = cleaned.indexOf('{')
        const end = cleaned.lastIndexOf('}')
        if (start !== -1 && end !== -1 && end > start) {
            cleaned = cleaned.slice(start, end + 1)
        }
    }

    return stripTrailingJsonCommas(escapeControlCharsInJsonStrings(cleaned))
}

/**
 * Invoke a Bedrock agent and return the raw response string.
 * Automatically retries up to 3 times on throttle errors with exponential backoff.
 * Handles throttle errors that occur both during client.send() AND during stream iteration.
 */
async function invokeAgent(
    inputText: string,
    sessionId: string,
    agentId: string,
    agentAliasId: string,
): Promise<string> {
    const THROTTLE_RETRIES = 5
    for (let t = 1; t <= THROTTLE_RETRIES; t++) {
        try {
            const command = new InvokeAgentCommand({
                agentId,
                agentAliasId,
                sessionId,
                inputText,
            })

            const agentResponse = await client.send(command)

            let raw = ''
            try {
                for await (const chunk of agentResponse.completion ?? []) {
                    if (chunk.chunk?.bytes) {
                        raw += new TextDecoder().decode(chunk.chunk.bytes)
                    }
                    if (chunk.trace) {
                        console.log(`[Bedrock agent trace] agentId=${agentId}`, JSON.stringify(chunk.trace).slice(0, 300))
                    }
                }
            } catch (streamErr) {
                // Throttle errors often surface here during stream iteration
                if (isThrottleError(streamErr) && t < THROTTLE_RETRIES) {
                    const delay = 5000 * (t * 0.5)
                    console.warn(`[Bedrock] Throttled during stream on attempt ${t}/${THROTTLE_RETRIES}. Waiting ${delay}ms...`)
                    await sleep(delay)
                    continue
                }
                throw streamErr
            }

            if (raw.length === 0) {
                console.warn(`[Bedrock] agentId=${agentId} aliasId=${agentAliasId} returned EMPTY response.`)
            }

            return raw
        } catch (err) {
            if (isThrottleError(err) && t < THROTTLE_RETRIES) {
                const delay = 5000 * (t * 0.5)
                console.warn(`[Bedrock] Throttled on attempt ${t}/${THROTTLE_RETRIES}. Waiting ${delay}ms before retry...`)
                await sleep(delay)
                continue
            }
            throw err
        }
    }
    throw new Error('invokeAgent: all throttle retries exhausted')
}

// ─── POST /api/bedrock/marketing ─────────────────────────────────────────────

router.post('/marketing', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        businessStage,
        city,
        targetCustomer,
        mainGoal,
        currentFunds,
        businessType,
        fundAllocation,
    } = req.body as {
        companyName: string
        industry: string
        businessStage: string
        city: string
        targetCustomer: string
        mainGoal?: string
        currentFunds: number
        businessType: string
        fundAllocation?: string
    }

    if (!companyName || !industry || !city) {
        res.status(400).json({ error: 'companyName, industry, and city are required.' })
        return
    }

    // ─── Derive marketing budget from fund allocation ─────────────────────────
    const pctMatch = fundAllocation?.match(/(\d+(\.\d+)?)/)
    const marketingPct = pctMatch ? parseFloat(pctMatch[1]) : 20

    const fundAllocationLine =
        fundAllocation ??
        `${marketingPct}% of current funds (RM ${Number(currentFunds).toLocaleString('en-MY')}) allocated to marketing`

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Target Customer: ${targetCustomer}`,
        mainGoal ? `Goal: ${mainGoal}` : null,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
        `Fund Allocation: ${fundAllocationLine}`,
    ]
        .filter(Boolean)
        .join('\n')

    console.log('=== inputText sent to Bedrock agent ===\n', inputText)

    // ─── Retry loop: keep invoking until we get valid JSON (max 5 attempts) ──
    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // Use a unique session per attempt so conversations don't bleed
        const sessionId = `marketing-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(
                inputText,
                sessionId,
                'HOG3CDST5J',
                '5YJAUY5OSD',
            )
            lastRaw = raw

            console.log(`[Bedrock] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`)

            const jsonString = extractJsonString(raw)

            // Validate that it's parseable JSON
            JSON.parse(jsonString)

            // Success — return the raw response (client does its own extraction)
            console.log(`[Bedrock] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            // If it's a JSON parse error, retry
            if (err instanceof SyntaxError) {
                console.warn(
                    `[Bedrock] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying...' : 'No retries left.'),
                )
                continue
            }

            // For any other error (network, SDK), fail immediately
            console.error(`[SMEwise] /api/bedrock/marketing error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating the marketing plan. Please try again.',
            })
            return
        }
    }

    // All retries exhausted — return the last raw response anyway so the client
    // can attempt to display whatever partial content was returned.
    console.error(
        `[Bedrock] All ${MAX_RETRIES} attempts failed to return valid JSON. Returning last raw response.`,
    )
    res.status(200).json({ content: lastRaw })
})


//Invoke a Bedrock agent by explicit agent ID + alias ID.
async function invokeAgentById(
    inputText: string,
    sessionId: string,
    agentId: string,
    agentAliasId: string,
): Promise<string> {
    const command = new InvokeAgentCommand({
        agentId,
        agentAliasId,
        sessionId,
        inputText,
    })

    const agentResponse = await client.send(command)

    let raw = ''
    for await (const chunk of agentResponse.completion ?? []) {
        if (chunk.chunk?.bytes) {
            raw += new TextDecoder().decode(chunk.chunk.bytes)
        }
    }

    return raw
}

// ─── POST /api/bedrock/startup ────────────────────────────────────────────────
// Invokes the startup registration Bedrock agent and returns parsed JSON.

router.post('/startup', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        businessStage,
        city,
        businessType,
        currentFunds,
    } = req.body as {
        companyName: string
        industry: string
        businessStage: string
        city: string
        businessType: string
        currentFunds?: number
    }

    if (!companyName || !industry || !city || !businessStage || !businessType) {
        res.status(400).json({
            error: 'companyName, industry, city, businessStage, and businessType are required.',
        })
        return
    }

    const AGENT_ID = process.env.BEDROCK_STARTUP_AGENT_ID ?? 'A4YPNQR3RX'
    const AGENT_ALIAS_ID = process.env.BEDROCK_STARTUP_AGENT_ALIAS_ID ?? 'IW25PK2WCB'

    if (!AGENT_ID) {
        res.status(500).json({ error: 'Startup agent is not configured. Set BEDROCK_STARTUP_AGENT_ID in .env.' })
        return
    }

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Business Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        currentFunds ? `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}` : null,
    ].filter(Boolean).join('\n')

    console.log('=== [startup] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `startup-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgentById(inputText, sessionId, AGENT_ID, AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(`[Bedrock/startup] Attempt ${attempt}/${MAX_RETRIES} — ${raw.length} chars`)

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString) // validate

            console.log(`[Bedrock/startup] Attempt ${attempt} returned valid JSON`)
            console.log(`[Bedrock/startup] Raw response preview:`, raw.slice(0, 500))
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[Bedrock/startup] Attempt ${attempt}/${MAX_RETRIES} invalid JSON.` +
                    (attempt < MAX_RETRIES ? ' Retrying...' : ' No retries left.'),
                )
                continue
            }

            console.error(`[Bedrock/startup] Error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating the startup guide. Please try again.',
            })
            return
        }
    }

    console.error(`[Bedrock/startup] All ${MAX_RETRIES} attempts failed. Returning last raw response.`)
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/fund-allocation ───────────────────────────────────────

router.post('/fund-allocation', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        businessStage,
        city,
        currentFunds,
        businessType,
    } = req.body as {
        companyName: string
        industry: string
        businessStage: string
        city: string
        currentFunds: number
        businessType: string
    }

    if (!companyName || !industry || !city || !businessStage || !businessType || !currentFunds) {
        res.status(400).json({
            error: 'companyName, industry, city, businessStage, businessType, and currentFunds are required.',
        })
        return
    }

    const FUND_AGENT_ID = process.env.BEDROCK_FUND_AGENT_ID ?? 'RMJF0EXRHR'
    const FUND_AGENT_ALIAS_ID = process.env.BEDROCK_FUND_AGENT_ALIAS_ID ?? 'UUHZO1BLOO'

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
    ].join('\n')

    console.log('=== [fund-allocation] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `fund-alloc-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(inputText, sessionId, FUND_AGENT_ID, FUND_AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(
                `[fund-allocation] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString) // validate

            console.log(`[fund-allocation] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[fund-allocation] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying...' : 'No retries left.'),
                )
                continue
            }

            console.error(`[SMEwise] /api/bedrock/fund-allocation error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating the fund allocation plan. Please try again.',
            })
            return
        }
    }

    console.error(
        `[fund-allocation] All ${MAX_RETRIES} attempts failed to return valid JSON. Returning last raw response.`,
    )
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/office-location ───────────────────────────────────────
// Invokes the office & location finder Bedrock agent.
// Returns a structured JSON workspace recommendation guide for Malaysian SMEs.

router.post('/office-location', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        businessStage,
        city,
        businessType,
        currentFunds,
    } = req.body as {
        companyName: string
        industry: string
        businessStage: string
        city: string
        businessType: string
        currentFunds: number
    }

    if (!companyName || !industry || !city || !businessStage || !businessType || !currentFunds) {
        res.status(400).json({
            error: 'companyName, industry, city, businessStage, businessType, and currentFunds are required.',
        })
        return
    }

    const OFFICE_AGENT_ID = process.env.BEDROCK_OFFICE_AGENT_ID ?? 'SYN0JX0DXX'
    const OFFICE_AGENT_ALIAS_ID = process.env.BEDROCK_OFFICE_AGENT_ALIAS_ID ?? 'DVRSIKLAPX'

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Business Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
    ].join('\n')

    console.log('=== [office-location] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `office-loc-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(inputText, sessionId, OFFICE_AGENT_ID, OFFICE_AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(
                `[office-location] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )
            console.log(`[office-location] Raw preview:`, raw.slice(0, 300))

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString) // validate

            console.log(`[office-location] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[office-location] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying in 3s...' : 'No retries left.'),
                )
                if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 3000))
                continue
            }

            console.error(`[SMEwise] /api/bedrock/office-location error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating the office & location guide. Please try again.',
            })
            return
        }
    }

    console.error(
        `[office-location] All ${MAX_RETRIES} attempts failed to return valid JSON. Returning last raw response.`,
    )
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/risk-analyzer ─────────────────────────────────────────
// Invokes the risk & regulations Bedrock agent.
// Returns structured JSON with riskSummary, risks array, and disclaimer.

router.post('/risk-analyzer', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        businessStage,
        city,
        businessType,
        currentFunds,
    } = req.body as {
        companyName: string
        industry: string
        businessStage: string
        city: string
        businessType: string
        currentFunds: number
    }

    if (!companyName || !industry || !city || !businessStage || !businessType) {
        res.status(400).json({
            error: 'companyName, industry, city, businessStage, and businessType are required.',
        })
        return
    }

    const RISK_AGENT_ID = process.env.BEDROCK_RISK_AGENT_ID ?? '4RYTKWLEVB'
    const RISK_AGENT_ALIAS_ID = process.env.BEDROCK_RISK_AGENT_ALIAS_ID ?? 'ODFAKDIZFV'

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Business Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        currentFunds ? `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}` : null,
    ].filter(Boolean).join('\n')

    console.log('=== [risk-analyzer] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `risk-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(inputText, sessionId, RISK_AGENT_ID, RISK_AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(`[risk-analyzer] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`)
            console.log(`[risk-analyzer] Raw preview:`, raw.slice(0, 300))

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString) // validate

            console.log(`[risk-analyzer] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[risk-analyzer] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying in 3s...' : 'No retries left.'),
                )
                if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 3000))
                continue
            }

            console.error(`[SMEwise] /api/bedrock/risk-analyzer error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating the risk analysis. Please try again.',
            })
            return
        }
    }

    console.error(`[risk-analyzer] All ${MAX_RETRIES} attempts failed. Returning last raw response.`)
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/marketing-guidelines ───────────────────────────────────
// Invokes the marketing guidelines agent with the marketing plan JSON as input.
// Returns a structured JSON with feasibilityAudit, detailedRoadmap, and
// resourceRequirements. Retries up to 5 times if the response is not valid JSON.

router.post('/marketing-guidelines', async (req: Request, res: Response) => {
    const { marketingPlanJson } = req.body as { marketingPlanJson: string }

    if (!marketingPlanJson) {
        res.status(400).json({ error: 'marketingPlanJson is required.' })
        return
    }

    const GUIDELINES_AGENT_ID = process.env.BEDROCK_GUIDELINES_AGENT_ID ?? 'XHNLKLW8ZR'
    const GUIDELINES_AGENT_ALIAS_ID = process.env.BEDROCK_GUIDELINES_AGENT_ALIAS_ID ?? 'QZZPYAYXRR'

    console.log('=== [marketing-guidelines] Invoking agent with marketing plan ===')

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `guidelines-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(marketingPlanJson, sessionId, GUIDELINES_AGENT_ID, GUIDELINES_AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(
                `[marketing-guidelines] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString) // validate

            console.log(`[marketing-guidelines] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[marketing-guidelines] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying...' : 'No retries left.'),
                )
                continue
            }

            console.error(`[SMEwise] /api/bedrock/marketing-guidelines error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating the marketing guidelines. Please try again.',
            })
            return
        }
    }

    console.error(
        `[marketing-guidelines] All ${MAX_RETRIES} attempts failed to return valid JSON. Returning last raw response.`,
    )
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/marketing-forecast ─────────────────────────────────────
// Invokes the marketing forecast agent with the marketing plan JSON as input.
// Returns a structured JSON with executiveSummary, timeSeriesData, phaseProjections,
// and benchmarking. Retries up to 5 times if the response is not valid JSON.

router.post('/marketing-forecast', async (req: Request, res: Response) => {
    const { marketingPlanJson } = req.body as { marketingPlanJson: string }

    if (!marketingPlanJson) {
        res.status(400).json({ error: 'marketingPlanJson is required.' })
        return
    }

    const FORECAST_AGENT_ID = process.env.BEDROCK_FORECAST_AGENT_ID ?? 'HSXW0AKDZF'
    const FORECAST_AGENT_ALIAS_ID = process.env.BEDROCK_FORECAST_AGENT_ALIAS_ID ?? 'ELIECSQ2L5'

    console.log('=== [marketing-forecast] Invoking agent with marketing plan ===')

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `forecast-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const inputJson = extractJsonString(marketingPlanJson)
            // console.log(`input: ${inputJson}`)
            const raw = await invokeAgent(inputJson, sessionId, FORECAST_AGENT_ID, FORECAST_AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(
                `[marketing-forecast] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )
            // console.log(`raw: ${raw}`)
            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString) // validate

            console.log(`[marketing-forecast] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[marketing-forecast] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying...' : 'No retries left.'),
                )
                continue
            }

            console.error(`[SMEwise] /api/bedrock/marketing-forecast error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating the marketing forecast. Please try again.',
            })
            return
        }
    }

    console.error(
        `[marketing-forecast] All ${MAX_RETRIES} attempts failed to return valid JSON. Returning last raw response.`,
    )
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/revenue-projection ────────────────────────────────────

router.post('/revenue-projection', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        businessStage,
        currentFunds,
        mainGoal,
        businessType,
        budgetAllocation,
    } = req.body as {
        companyName: string
        industry: string
        businessStage: string
        currentFunds: number
        mainGoal?: string
        businessType: string
        budgetAllocation?: string
    }

    if (!companyName || !industry || !businessStage || !currentFunds || !businessType) {
        res.status(400).json({
            error: 'companyName, industry, businessStage, currentFunds, and businessType are required.',
        })
        return
    }

    const REVENUE_AGENT_ID = process.env.BEDROCK_REVENUE_AGENT_ID ?? 'B2WJZPIFMU'
    const REVENUE_AGENT_ALIAS_ID = process.env.BEDROCK_REVENUE_AGENT_ALIAS_ID ?? 'O3XJLAUA27'

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
        `Business Goal: ${mainGoal?.trim() || 'Grow the business sustainably'}`,
        `Budget Allocation: ${budgetAllocation?.trim() || 'Not yet allocated'}`,
    ].join('\n')

    console.log('=== [revenue-projection] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `revenue-proj-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(inputText, sessionId, REVENUE_AGENT_ID, REVENUE_AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(
                `[revenue-projection] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )
            if (raw.length < 5000) {
                console.log(`[revenue-projection] Raw response:\n${raw}`)
            } else {
                console.log(`[revenue-projection] Raw preview (first 500):\n${raw.slice(0, 500)}`)
            }

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString) // validate

            console.log(`[revenue-projection] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[revenue-projection] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying in 3s...' : 'No retries left.'),
                )
                if (attempt < MAX_RETRIES) await sleep(3000)
                continue
            }

            console.error(`[SMEwise] /api/bedrock/revenue-projection error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating the revenue projection. Please try again.',
            })
            return
        }
    }

    console.error(
        `[revenue-projection] All ${MAX_RETRIES} attempts failed to return valid JSON. Returning last raw response.`,
    )
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/loans-funding ─────────────────────────────────────────

router.post('/loans-funding', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        businessStage,
        city,
        currentFunds,
        businessType,
    } = req.body as {
        companyName: string
        industry: string
        businessStage: string
        city: string
        currentFunds: number
        businessType: string
    }

    if (!companyName || !industry || !businessStage || !city || !currentFunds || !businessType) {
        res.status(400).json({
            error: 'companyName, industry, businessStage, city, currentFunds, and businessType are required.',
        })
        return
    }

    const LOANS_AGENT_ID = process.env.BEDROCK_LOANS_AGENT_ID ?? '5I7B8BCVX0'
    const LOANS_AGENT_ALIAS_ID = process.env.BEDROCK_LOANS_AGENT_ALIAS_ID ?? 'BUJMARJWNU'

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
    ].join('\n')

    console.log('=== [loans-funding] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `loans-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(inputText, sessionId, LOANS_AGENT_ID, LOANS_AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(
                `[loans-funding] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString)

            console.log(`[loans-funding] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[loans-funding] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying...' : 'No retries left.'),
                )
                continue
            }

            console.error(`[SMEwise] /api/bedrock/loans-funding error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating the loans & funding plan. Please try again.',
            })
            return
        }
    }

    console.error(
        `[loans-funding] All ${MAX_RETRIES} attempts failed to return valid JSON. Returning last raw response.`,
    )
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/investor-funding ──────────────────────────────────────

router.post('/investor-funding', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        businessStage,
        city,
        mainGoal,
        businessType,
    } = req.body as {
        companyName: string
        industry: string
        businessStage: string
        city: string
        mainGoal?: string
        businessType: string
    }

    if (!companyName || !industry || !businessStage || !city || !businessType) {
        res.status(400).json({
            error: 'companyName, industry, businessStage, city, and businessType are required.',
        })
        return
    }

    const INVESTOR_AGENT_ID = process.env.BEDROCK_INVESTOR_AGENT_ID ?? 'K5UUZVS6JI'
    const INVESTOR_AGENT_ALIAS_ID = process.env.BEDROCK_INVESTOR_AGENT_ALIAS_ID ?? 'ZRJVGFTYSU'

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Goal: ${mainGoal?.trim() || 'Grow the business sustainably'}`,
    ].join('\n')

    console.log('=== [investor-funding] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `investor-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(inputText, sessionId, INVESTOR_AGENT_ID, INVESTOR_AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(
                `[investor-funding] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )

            if (raw.length === 0) {
                console.warn(`[investor-funding] Attempt ${attempt}: empty response — agent may not be prepared or alias is wrong.`)
                // Treat empty as a retryable failure (same as bad JSON)
                continue
            }

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString)

            console.log(`[investor-funding] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[investor-funding] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying...' : 'No retries left.'),
                )
                continue
            }

            console.error(`[SMEwise] /api/bedrock/investor-funding error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating investor & funding suggestions. Please try again.',
            })
            return
        }
    }

    console.error(
        `[investor-funding] All ${MAX_RETRIES} attempts failed to return valid JSON. Returning last raw response.`,
    )
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/profile-verification ──────────────────────────────────
// Invokes the profileVerificationAgent to validate the user's business profile.
// The agent returns either "pass" (profile is valid) or a plain-text reason
// explaining what is wrong.
//
// Agent ID:       EBDJERK2DV
// Agent Alias ID: IDVDZBTZIK

router.post('/profile-verification', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        businessStage,
        city,
        targetCustomer,
        mainGoal,
        currentFunds,
        businessType,
    } = req.body as {
        companyName: string
        industry: string
        businessStage: string
        city: string
        targetCustomer: string
        mainGoal?: string
        currentFunds: number
        businessType: string
    }

    if (!companyName || !industry || !businessStage || !city || !targetCustomer || !businessType || currentFunds === undefined) {
        res.status(400).json({
            error: 'companyName, industry, businessStage, city, targetCustomer, businessType, and currentFunds are required.',
        })
        return
    }

    const PROFILE_AGENT_ID = process.env.BEDROCK_PROFILE_AGENT_ID ?? 'EBDJERK2DV'
    const PROFILE_AGENT_ALIAS_ID = process.env.BEDROCK_PROFILE_AGENT_ALIAS_ID ?? 'IDVDZBTZIK'

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Location: ${city}`,
        `Target Customer: ${targetCustomer}`,
        mainGoal?.trim() ? `Goal: ${mainGoal.trim()}` : null,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
    ]
        .filter(Boolean)
        .join('\n')

    console.log('=== [profile-verification] inputText sent to Bedrock agent ===\n', inputText)

    const sessionId = `profile-verify-${Date.now()}-${Math.random().toString(36).slice(2)}`

    try {
        const raw = await invokeAgent(inputText, sessionId, PROFILE_AGENT_ID, PROFILE_AGENT_ALIAS_ID)

        console.log(`[profile-verification] Agent response: "${raw}"`)

        // Normalise: trim whitespace so "pass\n" still matches
        const result = raw.trim()

        res.status(200).json({ result })
    } catch (err) {
        console.error('[SMEwise] /api/bedrock/profile-verification error:', err)
        res.status(500).json({
            error: 'Something went wrong while verifying your profile. Please try again.',
        })
    }
})

// ─── POST /api/bedrock/competitor-pricing ────────────────────────────────────
//
// Invokes the competitor pricing analysis Bedrock agent.
// Agent IDs: U1JHBRBYCD / AU3DKNFIFF (competitor analysis)
//
// Request body:
//   companyName, industry, city, targetCustomer, businessType,
//   monthlyRevenue (optional), products (optional array of { name, cost })
//
// Returns: { content: string }  — raw JSON from the agent

router.post('/competitor-pricing', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        city,
        targetCustomer,
        businessType,
        monthlyRevenue,
        products,
    } = req.body as {
        companyName: string
        industry: string
        city: string
        targetCustomer: string
        businessType: string
        monthlyRevenue?: string
        products?: Array<{ name: string; cost: string }>
    }

    if (!companyName || !industry || !city) {
        res.status(400).json({ error: 'companyName, industry, and city are required.' })
        return
    }

    const COMPETITOR_AGENT_ID = process.env.BEDROCK_COMPETITOR_AGENT_ID ?? 'U1JHBRBYCD'
    const COMPETITOR_AGENT_ALIAS_ID = process.env.BEDROCK_COMPETITOR_AGENT_ALIAS_ID ?? 'AU3DKNFIFF'

    // Build the same input format that works in the test script
    const productLines = products && products.length > 0
        ? [
            '',
            'Products/Services:',
            ...products.map(p => p.name),
            '',
            'Cost Per Product:',
            ...products.map(p => `${p.name}: ${p.cost}`),
        ]
        : []

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Location: ${city}, Malaysia`,
        `Target Customer: ${targetCustomer || 'General public'}`,
        monthlyRevenue ? `Monthly Revenue: ${monthlyRevenue}` : null,
        `Business Type: ${businessType}`,
        ...productLines,
    ]
        .filter((l) => l !== null)
        .join('\n')

    console.log('=== [competitor-pricing] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `competitor-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(inputText, sessionId, COMPETITOR_AGENT_ID, COMPETITOR_AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(
                `[competitor-pricing] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString) // validate

            console.log(`[competitor-pricing] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[competitor-pricing] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying...' : 'No retries left.'),
                )
                continue
            }

            console.error(`[SMEwise] /api/bedrock/competitor-pricing error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating the competitor pricing analysis. Please try again.',
            })
            return
        }
    }

    console.error(
        `[competitor-pricing] All ${MAX_RETRIES} attempts failed to return valid JSON. Returning last raw response.`,
    )
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/smart-pricing ─────────────────────────────────────────
//
// Invokes the smart pricing suggestions Bedrock agent.
// Agent IDs: MBTQYPGAAU / EKWPIHADSF
//
// The smart pricing agent requires competitor analysis JSON as part of its input.
// Request body:
//   companyName, industry, city, targetCustomer, businessType, mainGoal (opt),
//   monthlyRevenue (opt), products (opt array of { name, cost }),
//   competitorJson (opt — stringified competitor analysis result)

router.post('/smart-pricing', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        city,
        targetCustomer,
        businessType,
        mainGoal,
        monthlyRevenue,
        products,
        competitorJson,
    } = req.body as {
        companyName: string
        industry: string
        city: string
        targetCustomer: string
        businessType: string
        mainGoal?: string
        monthlyRevenue?: string
        products?: Array<{ name: string; cost: string }>
        competitorJson?: string
    }

    if (!companyName || !industry || !city) {
        res.status(400).json({ error: 'companyName, industry, and city are required.' })
        return
    }

    const SMART_AGENT_ID = process.env.BEDROCK_SMART_PRICING_AGENT_ID ?? 'MBTQYPGAAU'
    const SMART_AGENT_ALIAS_ID = process.env.BEDROCK_SMART_PRICING_AGENT_ALIAS_ID ?? 'EVH8JQ9YQ4'

    const productLines = products && products.length > 0
        ? [
            '',
            'Products/Services:',
            ...products.map(p => p.name),
            '',
            'Cost Per Product:',
            ...products.map(p => `${p.name}: ${p.cost}`),
        ]
        : []

    const inputLines: string[] = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Location: ${city}, Malaysia`,
        `Target Customer: ${targetCustomer || 'General public'}`,
        ...(monthlyRevenue ? [`Monthly Revenue: ${monthlyRevenue}`] : []),
        ...(mainGoal ? [`Business Goal: ${mainGoal}`] : []),
        `Business Type: ${businessType}`,
        ...productLines,
    ]

    // Append competitor analysis JSON — the smart pricing agent uses it as
    // market intelligence per its instruction schema
    if (competitorJson) {
        inputLines.push('', 'Competitor Analysis Result:', competitorJson)
    }

    const inputText = inputLines.join('\n')

    console.log('=== [smart-pricing] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `smart-pricing-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(inputText, sessionId, SMART_AGENT_ID, SMART_AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(`[smart-pricing] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`)

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString)

            console.log(`[smart-pricing] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[smart-pricing] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying...' : 'No retries left.'),
                )
                continue
            }

            console.error(`[SMEwise] /api/bedrock/smart-pricing error on attempt ${attempt}:`, err)
            res.status(500).json({
                error: 'Something went wrong while generating smart pricing suggestions. Please try again.',
            })
            return
        }
    }

    console.error(`[smart-pricing] All ${MAX_RETRIES} attempts failed. Returning last raw response.`)
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/analytics-dashboard ───────────────────────────────────
// Invokes the AnalyticsDashboard Bedrock agent (9VWWUJ0WX2 / WJZ0N9RES5).
// Accepts a business profile, returns structured JSON with revenue, expenses, KPIs, and projections.

router.post('/analytics-dashboard', async (req: Request, res: Response) => {
    const {
        companyName,
        industry,
        businessStage,
        city,
        businessType,
        currentFunds,
        targetCustomer,
        mainGoal,
    } = req.body as {
        companyName: string
        industry: string
        businessStage: string
        city: string
        businessType: string
        currentFunds: number
        targetCustomer?: string
        mainGoal?: string
    }

    if (!companyName || !industry || !businessStage || !city || !businessType || !currentFunds) {
        res.status(400).json({
            error: 'companyName, industry, businessStage, city, businessType, and currentFunds are required.',
        })
        return
    }

    const AGENT_ID = process.env.BEDROCK_ANALYTICS_AGENT_ID ?? '9VWWUJ0WX2'
    const AGENT_ALIAS_ID = process.env.BEDROCK_ANALYTICS_AGENT_ALIAS_ID ?? 'WJZ0N9RES5'

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Business Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
        targetCustomer ? `Target Customer: ${targetCustomer}` : null,
        mainGoal ? `Main Business Goal: ${mainGoal}` : null,
    ].filter(Boolean).join('\n')

    console.log('=== [analytics-dashboard] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `analytics-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(inputText, sessionId, AGENT_ID, AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(`[analytics-dashboard] Attempt ${attempt}/${MAX_RETRIES} — ${raw.length} chars`)

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString) // validate

            console.log(`[analytics-dashboard] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[analytics-dashboard] Attempt ${attempt}/${MAX_RETRIES} invalid JSON.` +
                    (attempt < MAX_RETRIES ? ' Retrying...' : ' No retries left.'),
                )
                continue
            }

            if (isThrottlingError(err) && attempt < MAX_RETRIES) {
                const waitMs = throttleBackoffMs(attempt)
                console.warn(
                    `[analytics-dashboard] Throttled on attempt ${attempt}/${MAX_RETRIES}. Waiting ${waitMs}ms...`,
                )
                await sleep(waitMs)
                continue
            }

            const awsErr = err as { name?: string; message?: string }
            console.error(`[SMEwise] /api/bedrock/analytics-dashboard error on attempt ${attempt}:`, {
                name: awsErr.name,
                message: awsErr.message,
            })
            res.status(isThrottlingError(err) ? 429 : 500).json({
                error: isThrottlingError(err)
                    ? THROTTLE_USER_MESSAGE
                    : `Agent error: ${awsErr.name ?? 'Unknown'} — ${awsErr.message ?? 'No message'}`,
            })
            return
        }
    }

    console.error(`[analytics-dashboard] All ${MAX_RETRIES} attempts failed. Returning last raw response.`)
    res.status(200).json({ content: lastRaw })
})

// ─── POST /api/bedrock/assistant ─────────────────────────────────────────────
// Streams the AI Assistant agent's reply token-by-token over SSE. The client
// passes a free-form `message` (the user's question) plus an optional
// `context` blob (profile, cached widget outputs, live in-memory state, the
// section the user is currently viewing). The route stitches everything into
// a single inputText for the agent and forwards each chunk as it arrives.
//
// Agent ID:       3UUYBVADJS
// Agent Alias ID: R4UVOCXUYC
//
// SSE wire format (matches /converse/stream so the client can reuse parsers):
//   data: {"delta":"...partial text..."}\n\n
//   data: [DONE]\n\n

router.post('/assistant', async (req: Request, res: Response) => {
    const { message, context, sessionId: clientSessionId } = req.body as {
        message: string
        context?: Record<string, unknown>
        sessionId?: string
    }

    if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'message is required.' })
        return
    }

    const ASSISTANT_AGENT_ID = process.env.BEDROCK_ASSISTANT_AGENT_ID ?? '3UUYBVADJS'
    const ASSISTANT_AGENT_ALIAS_ID = process.env.BEDROCK_ASSISTANT_AGENT_ALIAS_ID ?? 'R4UVOCXUYC'

    // Compose the agent's input. The agent sees one concatenated message per
    // turn — context first (so the model can ground answers in it), then the
    // user's question. The client builds the context object; we just serialise
    // it here.
    const contextSection = context
        ? `--- CONTEXT (do not echo back verbatim, use only as reference) ---\n${JSON.stringify(context, null, 2)}\n--- END CONTEXT ---\n\n`
        : ''
    const inputText = `${contextSection}USER MESSAGE:\n${message}`

    console.log(
        `[assistant] inputText length=${inputText.length} chars ` +
        `context.keys=${context ? Object.keys(context).join(',') : '(none)'}`,
    )

    // Reuse the same session across turns when the client provides one so the
    // agent can keep memory of the conversation. Fall back to a fresh session.
    const sessionId = clientSessionId && clientSessionId.length > 0
        ? clientSessionId
        : `assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Set SSE headers up front so the browser starts rendering immediately.
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    try {
        const command = new InvokeAgentCommand({
            agentId: ASSISTANT_AGENT_ID,
            agentAliasId: ASSISTANT_AGENT_ALIAS_ID,
            sessionId,
            inputText,
        })

        const agentResponse = await client.send(command)

        let totalChars = 0
        let eventCount = 0

        for await (const event of agentResponse.completion ?? []) {
            eventCount++

            // Forward each chunk to the client as it arrives.
            if (event.chunk?.bytes) {
                const text = new TextDecoder().decode(event.chunk.bytes)
                totalChars += text.length
                res.write(`data: ${JSON.stringify({ delta: text })}\n\n`)
                continue
            }

            // Surface error events so the user sees a usable message instead
            // of a silent stream end.
            const errorEvent =
                event.accessDeniedException ??
                event.badGatewayException ??
                event.conflictException ??
                event.dependencyFailedException ??
                event.internalServerException ??
                event.modelNotReadyException ??
                event.resourceNotFoundException ??
                event.serviceQuotaExceededException ??
                event.throttlingException ??
                event.validationException
            if (errorEvent) {
                const errorType =
                    Object.keys(event).find(
                        (k) => (event as unknown as Record<string, unknown>)[k] === errorEvent,
                    ) ?? 'unknownException'
                const msg = (errorEvent as { message?: string }).message ?? '(no message)'
                console.error(
                    `[assistant] ERROR EVENT type=${errorType} message=${msg}`,
                )
                res.write(`data: ${JSON.stringify({ error: `Agent ${errorType}: ${msg}` })}\n\n`)
                continue
            }
        }

        console.log(
            `[assistant] stream finished events=${eventCount} chars=${totalChars} session=${sessionId}`,
        )

        res.write('data: [DONE]\n\n')
        res.end()
    } catch (err) {
        console.error('[SMEwise] /api/bedrock/assistant error:', err)
        const error = err as { name?: string; message?: string }

        // We've already flushed SSE headers, so we can't switch to JSON now.
        res.write(
            `data: ${JSON.stringify({
                error: error.name === 'ThrottlingException'
                    ? 'Our AI service is busy right now. Please wait a moment and try again.'
                    : `Something went wrong: ${error.message ?? 'unknown error'}`,
            })}\n\n`,
        )
        res.write('data: [DONE]\n\n')
        res.end()
    }
})

// ─── POST /api/bedrock/document-generator ────────────────────────────────────
// Invokes the ReportandDocumentGenerator Bedrock agent (4K4BZVI9F8 / TCYVOZAWOA).
// Accepts a business profile + document type, returns structured JSON.

router.post('/document-generator', async (req: Request, res: Response) => {
    await enqueueDocumentGenerator(async () => {
        const {
            companyName,
            businessType,
            industry,
            businessStage,
            city,
            targetCustomer,
            mainGoal,
            documentType,
            templateText,
            currentFunds,
            additionalContext,
            forceAssumeDefaults,
            priorAgentQuestion,
        } = req.body as {
            companyName: string
            businessType: string
            industry: string
            businessStage: string
            city: string
            targetCustomer?: string
            mainGoal?: string
            documentType: string
            templateText?: string
            currentFunds?: number
            additionalContext?: string
            forceAssumeDefaults?: boolean
            priorAgentQuestion?: string
        }

        if (!companyName || !businessType || !industry || !businessStage || !city || !documentType) {
            res.status(400).json({
                error: 'companyName, businessType, industry, businessStage, city, and documentType are required.',
            })
            return
        }

        const AGENT_ID = process.env.BEDROCK_DOCUMENT_AGENT_ID ?? '4K4BZVI9F8'
        const AGENT_ALIAS_ID = process.env.BEDROCK_DOCUMENT_AGENT_ALIAS_ID ?? 'TCYVOZAWOA'

        const inputText = buildDocumentGeneratorInputText({
            documentType,
            companyName,
            businessType,
            industry,
            businessStage,
            city,
            targetCustomer,
            mainGoal,
            currentFunds,
            templateText,
            additionalContext,
            forceAssumeDefaults: Boolean(forceAssumeDefaults),
            priorAgentQuestion,
        })

        console.log('=== [document-generator] inputText sent to Bedrock agent ===\n', inputText)

        let lastRaw = ''

        for (let attempt = 1; attempt <= DOCUMENT_GENERATOR_MAX_INVOCATIONS; attempt++) {
            const sessionId = `doc-gen-${Date.now()}-${Math.random().toString(36).slice(2)}`

            try {
                const raw = await invokeAgent(inputText, sessionId, AGENT_ID, AGENT_ALIAS_ID)
                lastRaw = raw

                console.log(
                    `[document-generator] Invocation ${attempt}/${DOCUMENT_GENERATOR_MAX_INVOCATIONS} — ${raw.length} chars`,
                )

                if (!looksLikeJsonObject(raw)) {
                    const clarification = looksLikeAgentClarification(raw)
                    console.warn(
                        clarification
                            ? '[document-generator] Agent asked for clarification instead of JSON.'
                            : '[document-generator] Agent reply is not JSON; returning as plain text.',
                    )
                    console.warn('[document-generator] preview:', raw.slice(0, 280))
                    res.status(200).json({
                        content: raw,
                        ...(clarification ? { agentAskedForInput: true } : {}),
                    })
                    return
                }

                const jsonString = extractJsonString(raw)
                JSON.parse(jsonString)

                console.log(`[document-generator] Invocation ${attempt} returned valid JSON`)
                res.status(200).json({ content: raw })
                return
            } catch (err) {
                if (err instanceof SyntaxError) {
                    console.warn(
                        `[document-generator] Invocation ${attempt} invalid JSON. preview:`,
                        lastRaw.slice(0, 280),
                    )

                    if (!shouldRetryAfterInvalidJson(lastRaw)) {
                        res.status(200).json({ content: lastRaw })
                        return
                    }

                    if (attempt < DOCUMENT_GENERATOR_MAX_INVOCATIONS) {
                        const waitMs = 4_000
                        console.warn(`[document-generator] Waiting ${waitMs}ms before JSON retry...`)
                        await sleep(waitMs)
                        continue
                    }

                    res.status(200).json({ content: lastRaw })
                    return
                }

                if (isThrottlingError(err) && attempt < DOCUMENT_GENERATOR_MAX_INVOCATIONS) {
                    const waitMs = throttleBackoffMs(attempt)
                    console.warn(
                        `[document-generator] Throttled on invocation ${attempt}/${DOCUMENT_GENERATOR_MAX_INVOCATIONS}. Waiting ${waitMs}ms...`,
                    )
                    await sleep(waitMs)
                    continue
                }

                const awsErr = err as { name?: string; message?: string }
                console.error(`[SMEwise] /api/bedrock/document-generator error on invocation ${attempt}:`, {
                    name: awsErr.name,
                    message: awsErr.message,
                })

                if (isThrottlingError(err) && lastRaw) {
                    res.status(200).json({
                        content: lastRaw,
                        warning: THROTTLE_USER_MESSAGE,
                    })
                    return
                }

                res.status(isThrottlingError(err) ? 429 : 500).json({
                    error: isThrottlingError(err)
                        ? THROTTLE_USER_MESSAGE
                        : `Agent error: ${awsErr.name ?? 'Unknown'} — ${awsErr.message ?? 'No message'}`,
                })
                return
            }
        }

        if (lastRaw) {
            console.warn('[document-generator] Max invocations reached; returning last raw response.')
            res.status(200).json({ content: lastRaw })
            return
        }

        res.status(502).json({
            error: 'Document generation failed after several attempts. Please try again in a minute.',
        })
    })
})

export default router
