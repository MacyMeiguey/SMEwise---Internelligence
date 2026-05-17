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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

    // Try to isolate the first { ... } block if there's surrounding text
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.slice(start, end + 1)
    }

    return cleaned
}

/**
 * Invoke a Bedrock agent and return the raw response string.
 */
async function invokeAgent(
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
        // Log any trace or error events from the agent stream
        if (chunk.trace) {
            console.log(`[Bedrock agent trace] agentId=${agentId}`, JSON.stringify(chunk.trace).slice(0, 300))
        }
    }

    if (raw.length === 0) {
        console.warn(`[Bedrock] agentId=${agentId} aliasId=${agentAliasId} returned EMPTY response. Check: 1) alias is PREPARED in AWS console, 2) agent has correct region, 3) action groups are enabled.`)
    }

    return raw
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
    const FUND_AGENT_ALIAS_ID = process.env.BEDROCK_FUND_AGENT_ALIAS_ID ?? 'RDAMSJUEK5'

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

    const OFFICE_AGENT_ID       = process.env.BEDROCK_OFFICE_AGENT_ID       ?? 'SYN0JX0DXX'
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

    const RISK_AGENT_ID       = process.env.BEDROCK_RISK_AGENT_ID       ?? '4RYTKWLEVB'
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
    const FORECAST_AGENT_ALIAS_ID = process.env.BEDROCK_FORECAST_AGENT_ALIAS_ID ?? 'QUI6ZWQMMZ'

    console.log('=== [marketing-forecast] Invoking agent with marketing plan ===')

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `forecast-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgent(marketingPlanJson, sessionId, FORECAST_AGENT_ID, FORECAST_AGENT_ALIAS_ID)
            lastRaw = raw

            console.log(
                `[marketing-forecast] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )

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
    const REVENUE_AGENT_ALIAS_ID = process.env.BEDROCK_REVENUE_AGENT_ALIAS_ID ?? 'ZXGWJBOBUT'

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

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString) // validate

            console.log(`[revenue-projection] Attempt ${attempt} returned valid JSON`)
            res.status(200).json({ content: raw })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[revenue-projection] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (attempt < MAX_RETRIES ? 'Retrying...' : 'No retries left.'),
                )
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

    const INVESTOR_AGENT_ID       = process.env.BEDROCK_INVESTOR_AGENT_ID       ?? 'K5UUZVS6JI'
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

    const COMPETITOR_AGENT_ID       = process.env.BEDROCK_COMPETITOR_AGENT_ID       ?? 'U1JHBRBYCD'
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

    const SMART_AGENT_ID       = process.env.BEDROCK_SMART_PRICING_AGENT_ID       ?? 'MBTQYPGAAU'
    const SMART_AGENT_ALIAS_ID = process.env.BEDROCK_SMART_PRICING_AGENT_ALIAS_ID ?? 'EKWPIHADSF'

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

    const AGENT_ID       = process.env.BEDROCK_ANALYTICS_AGENT_ID       ?? '9VWWUJ0WX2'
    const AGENT_ALIAS_ID = process.env.BEDROCK_ANALYTICS_AGENT_ALIAS_ID ?? 'WJZ0N9RES5'

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Business Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
        targetCustomer ? `Target Customer: ${targetCustomer}` : null,
        mainGoal       ? `Main Business Goal: ${mainGoal}`    : null,
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

            const awsErr = err as { name?: string; message?: string }
            console.error(`[SMEwise] /api/bedrock/analytics-dashboard error on attempt ${attempt}:`, {
                name: awsErr.name,
                message: awsErr.message,
                full: err,
            })
            res.status(500).json({
                error: `Agent error: ${awsErr.name ?? 'Unknown'} — ${awsErr.message ?? 'No message'}`,
            })
            return
        }
    }

    console.error(`[analytics-dashboard] All ${MAX_RETRIES} attempts failed. Returning last raw response.`)
    res.status(200).json({ content: lastRaw })
})

export default router
