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
 */

import { Router, Request, Response } from 'express'
import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime'

const router = Router()

const client = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION ?? 'ap-southeast-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
})

const AGENT_ID = process.env.BEDROCK_AGENT_ID ?? 'HOG3CDST5J'
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID ?? 'UBOYDO9UHN'

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
    // fundAllocation is a string like "20%" or "20% for marketing"
    // Extract the numeric percentage; fall back to 20% if unparseable
    const pctMatch = fundAllocation?.match(/(\d+(\.\d+)?)/)
    const marketingPct = pctMatch ? parseFloat(pctMatch[1]) : 20

    const fundAllocationLine = fundAllocation
        ?? `${marketingPct}% of current funds (RM ${Number(currentFunds).toLocaleString('en-MY')}) allocated to marketing`

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

    console.log("=== inputText sent to Bedrock agent ===\n", inputText)
    // Use a unique session per request so conversations don't bleed into each other
    const sessionId = `marketing-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const command = new InvokeAgentCommand({
        agentId: AGENT_ID,
        agentAliasId: AGENT_ALIAS_ID,
        sessionId,
        inputText,
    })

    try {
        const agentResponse = await client.send(command)

        // Collect all streamed chunks into one string
        let raw = ''
        for await (const chunk of agentResponse.completion ?? []) {
            if (chunk.chunk?.bytes) {
                const decoded = new TextDecoder().decode(chunk.chunk.bytes)
                console.log('[Bedrock] chunk received:', decoded)
                raw += decoded
            }
        }

        // ─── Debug: inspect the full raw response ────────────────────────────
        console.log('=== Bedrock raw response (full) ===')
        console.log(raw)
        console.log('=== Bedrock raw response length:', raw.length, 'chars ===')

        let cleanRaw = raw.trim();
        if (cleanRaw.startsWith('```')) {
            cleanRaw = cleanRaw
                .replace(/^```(?:json)?\n?/i, '') // Remove starting ```json or ```
                .replace(/\n?```$/, '')           // Remove ending ```
                .trim();
        }

        // 2. Try to parse the cleaned string as JSON
        try {
            const parsed = JSON.parse(cleanRaw);
            console.log('=== Bedrock response parsed as JSON ===');
            
            // Optional: If you want to send the cleaned JSON back to the client
            // instead of the raw string, you can do:
            // res.status(200).json({ content: parsed });
            // return;
        } catch (parseError) {
            console.log('=== Bedrock response is NOT valid JSON (plain text or partial) ===');
            console.error(parseError);
        }
        // ─────────────────────────────────────────────────────────────────────

        res.status(200).json({ content: raw })
    } catch (err) {
        console.error('[SMEwise] /api/bedrock/marketing error:', err)
        res.status(500).json({
            error: 'Something went wrong while generating the marketing plan. Please try again.',
        })
    }
})

export default router
