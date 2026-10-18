// Business feature routes use direct Bedrock Converse; Agents Classic is unavailable to new accounts.
import { Router, Request, Response } from 'express'
import { generateFeature, streamAssistantReply } from '../bedrock/generation.js'
import { verifyBusinessProfile } from './profileValidation.js'

import {
    extractBalancedJsonObject,
    escapeControlCharsInJsonStrings,
    stripTrailingJsonCommas,
} from '../utils/extractBalancedJson.js'

const router = Router()

const MAX_RETRIES = 2

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

/** Max Bedrock model calls per HTTP request (document generator). */
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
 * Invoke a Bedrock model and return the raw response string.
 * Automatically retries up to 3 times on throttle errors with exponential backoff.
 * Handles throttle errors that occur both during client.send() AND during stream iteration.
 */

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

    console.log('=== inputText sent to Bedrock model ===\n', inputText)

    // ─── Retry loop: keep invoking until we get valid JSON (max 5 attempts) ──
    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // Use a unique session per attempt so conversations don't bleed

        try {
            const raw = await generateFeature('marketing', inputText)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
})

//Invoke a Bedrock model by explicit agent ID + alias ID.

// ─── POST /api/bedrock/startup ────────────────────────────────────────────────
// Generates using the startup registration Bedrock model and returns parsed JSON.

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


    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Business Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        currentFunds ? `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}` : null,
    ].filter(Boolean).join('\n')

    console.log('=== [startup] inputText sent to Bedrock model ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const raw = await generateFeature('startup', inputText)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
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

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
    ].join('\n')

    console.log('=== [fund-allocation] inputText sent to Bedrock model ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const raw = await generateFeature('fund-allocation', inputText)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
})

// ─── POST /api/bedrock/office-location ───────────────────────────────────────
// Generates using the office & location finder Bedrock model.
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

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Business Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
    ].join('\n')

    console.log('=== [office-location] inputText sent to Bedrock model ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const raw = await generateFeature('office-location', inputText)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
})

// ─── POST /api/bedrock/risk-analyzer ─────────────────────────────────────────
// Generates using the risk & regulations Bedrock model.
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

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Business Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        currentFunds ? `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}` : null,
    ].filter(Boolean).join('\n')

    console.log('=== [risk-analyzer] inputText sent to Bedrock model ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const raw = await generateFeature('risk-analyzer', inputText)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
})

// ─── POST /api/bedrock/marketing-guidelines ───────────────────────────────────
// Generates using the marketing guidelines agent with the marketing plan JSON as input.
// Returns a structured JSON with feasibilityAudit, detailedRoadmap, and
// resourceRequirements. Retries up to 5 times if the response is not valid JSON.

router.post('/marketing-guidelines', async (req: Request, res: Response) => {
    const { marketingPlanJson } = req.body as { marketingPlanJson: string }

    if (!marketingPlanJson) {
        res.status(400).json({ error: 'marketingPlanJson is required.' })
        return
    }

    console.log('=== [marketing-guidelines] Invoking agent with marketing plan ===')

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const raw = await generateFeature('marketing-guidelines', marketingPlanJson)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
})

// ─── POST /api/bedrock/marketing-forecast ─────────────────────────────────────
// Generates using the marketing forecast agent with the marketing plan JSON as input.
// Returns a structured JSON with executiveSummary, timeSeriesData, phaseProjections,
// and benchmarking. Retries up to 5 times if the response is not valid JSON.

router.post('/marketing-forecast', async (req: Request, res: Response) => {
    const { marketingPlanJson } = req.body as { marketingPlanJson: string }

    if (!marketingPlanJson) {
        res.status(400).json({ error: 'marketingPlanJson is required.' })
        return
    }

    console.log('=== [marketing-forecast] Generating forecast from marketing plan ===')

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const inputJson = extractJsonString(marketingPlanJson)
            // console.log(`input: ${inputJson}`)
            const raw = await generateFeature('marketing-forecast', inputJson)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
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

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
        `Business Goal: ${mainGoal?.trim() || 'Grow the business sustainably'}`,
        `Budget Allocation: ${budgetAllocation?.trim() || 'Not yet allocated'}`,
    ].join('\n')

    console.log('=== [revenue-projection] inputText sent to Bedrock model ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const raw = await generateFeature('revenue-projection', inputText)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
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

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
    ].join('\n')

    console.log('=== [loans-funding] inputText sent to Bedrock model ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const raw = await generateFeature('loans-funding', inputText)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
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

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Goal: ${mainGoal?.trim() || 'Grow the business sustainably'}`,
    ].join('\n')

    console.log('=== [investor-funding] inputText sent to Bedrock model ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const raw = await generateFeature('investor-funding', inputText)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
})

// ─── POST /api/bedrock/profile-verification ──────────────────────────────────
// Generates using the profileVerificationAgent to validate the user's business profile.
// The agent returns either "pass" (profile is valid) or a plain-text reason
// explaining what is wrong.
//

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

    console.log('=== [profile-verification] inputText sent to Bedrock model ===\n', inputText)

    try {
        const raw = await verifyBusinessProfile(inputText)

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
// Generates using the competitor pricing analysis Bedrock model.
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

    console.log('=== [competitor-pricing] inputText sent to Bedrock model ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const raw = await generateFeature('competitor-pricing', inputText)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
})

// ─── POST /api/bedrock/smart-pricing ─────────────────────────────────────────
//
// Generates using the smart pricing suggestions Bedrock model.
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

    console.log('=== [smart-pricing] inputText sent to Bedrock model ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const raw = await generateFeature('smart-pricing', inputText)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
})

// ─── POST /api/bedrock/analytics-dashboard ───────────────────────────────────
// Generates using the AnalyticsDashboard Bedrock model (9VWWUJ0WX2 / WJZ0N9RES5).
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

    console.log('=== [analytics-dashboard] inputText sent to Bedrock model ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {
            const raw = await generateFeature('analytics-dashboard', inputText)
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
    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
})

// ─── POST /api/bedrock/assistant ─────────────────────────────────────────────
// Streams the AI Assistant agent's reply token-by-token over SSE. The client
// passes a free-form `message` (the user's question) plus an optional
// `context` blob (profile, cached widget outputs, live in-memory state, the
// section the user is currently viewing). The route stitches everything into
// a single inputText for the agent and forwards each chunk as it arrives.
//
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
    const sessionId = typeof clientSessionId === 'string' && clientSessionId.length > 0
        ? clientSessionId
        : `assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const inputText = context
        ? `Business context (reference data):\n${JSON.stringify(context)}\n\nUser question: ${message}`
        : message
    const controller = new AbortController()
    const onClose = () => controller.abort()
    res.on('close', onClose)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()
    try {
        for await (const delta of streamAssistantReply(inputText, sessionId, controller.signal)) {
            if (!res.destroyed) res.write(`data: ${JSON.stringify({ delta })}\n\n`)
        }
    } catch (err) {
        console.error('[SMEwise] /api/bedrock/assistant error:', err)
        if (!res.destroyed) res.write(`data: ${JSON.stringify({ error: 'The AI response could not complete. Please retry.' })}\n\n`)
    } finally {
        res.off('close', onClose)
        if (!res.destroyed) {
            res.write('data: [DONE]\n\n')
            res.end()
        }
    }
})

// ─── POST /api/bedrock/document-generator ────────────────────────────────────
// Generates using the ReportandDocumentGenerator Bedrock model (4K4BZVI9F8 / TCYVOZAWOA).
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

        console.log('=== [document-generator] inputText sent to Bedrock model ===\n', inputText)

        let lastRaw = ''

        for (let attempt = 1; attempt <= DOCUMENT_GENERATOR_MAX_INVOCATIONS; attempt++) {

            try {
                const raw = await generateFeature('document-generator', inputText)
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
                        res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
                        return
                    }

                    if (attempt < DOCUMENT_GENERATOR_MAX_INVOCATIONS) {
                        const waitMs = 4_000
                        console.warn(`[document-generator] Waiting ${waitMs}ms before JSON retry...`)
                        await sleep(waitMs)
                        continue
                    }

                    res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
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
            res.status(502).json({ error: lastRaw ? 'The AI response did not match the required format. Please retry.' : 'The AI service could not generate this result. Please retry.' })
            return
        }

        res.status(502).json({
            error: 'Document generation failed after several attempts. Please try again in a minute.',
        })
    })
})

export default router
