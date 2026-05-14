/**
 * Bedrock Agent proxy routes
 *
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
    // In production (App Runner / ECS / EC2) credentials come from the
    // attached IAM role via the default credential provider chain.
    // In local dev we fall back to env vars loaded from .env.
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
    } = req.body as {
        companyName: string
        industry: string
        businessStage: string
        currentFunds: number
        mainGoal?: string
        businessType: string
    }

    if (!companyName || !industry || !businessStage || !currentFunds || !businessType) {
        res.status(400).json({
            error: 'companyName, industry, businessStage, currentFunds, and businessType are required.',
        })
        return
    }

    const REVENUE_AGENT_ID = process.env.BEDROCK_REVENUE_AGENT_ID ?? 'B2WJZPIFMU'
    const REVENUE_AGENT_ALIAS_ID = process.env.BEDROCK_REVENUE_AGENT_ALIAS_ID ?? 'ZWVMV74XKS'

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
        mainGoal ? `Business Goal: ${mainGoal}` : null,
    ]
        .filter(Boolean)
        .join('\n')

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

export default router
