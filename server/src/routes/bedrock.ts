/**
 * Bedrock / AgentCore proxy routes
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
 *   Invokes the fund-allocation AgentCore harness (sr_financial_FundAllocation)
 *   via the InvokeHarness API. Accepts BusinessProfile fields, returns a JSON
 *   budget allocation plan matching the FundAllocationPlan schema.
 */

import { Router, Request, Response } from 'express'
import {
    BedrockAgentCoreClient,
    InvokeHarnessCommand,
} from '@aws-sdk/client-bedrock-agentcore'

import {
    extractBalancedJsonObject,
    escapeControlCharsInJsonStrings,
    stripTrailingJsonCommas,
} from '../utils/extractBalancedJson.js'
import { normaliseRevenuePlan } from '../utils/normaliseRevenuePlan.js'
import { validateLoansFundingPlan } from '../utils/validateLoansFundingPlan.js'
import {
    normaliseInvestorFundingPlan,
    validateInvestorFundingPlan,
} from '../utils/validateInvestorFundingPlan.js'
import { validateStartupGuide } from '../utils/validateStartupGuide.js'
import { normaliseAnalyticsDashboard } from '../utils/normaliseAnalyticsDashboard.js'
import { validateGeneratedDocument } from '../utils/validateGeneratedDocument.js'
import { validateRiskAnalysis } from '../utils/validateRiskAnalysis.js'

const router = Router()

/**
 * Resolve AWS credentials for the Bedrock clients.
 *
 * - If AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY are set (local dev), use them.
 *   AWS_SESSION_TOKEN is included when present — REQUIRED for temporary STS
 *   credentials (access keys starting with "ASIA").
 * - If no static keys are set (production), return undefined so the SDK falls
 *   back to the default credential provider chain (App Runner IAM role).
 */
function resolveAwsCredentials() {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        return {
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                ...(process.env.AWS_SESSION_TOKEN
                    ? { sessionToken: process.env.AWS_SESSION_TOKEN }
                    : {}),
            },
        }
    }
    return {}
}

const AWS_REGION = process.env.AWS_REGION ?? 'ap-southeast-1'

// ─── Bedrock AgentCore client ────────────────────────────────────────────────
//
// AgentCore ("harness") is a separate service from classic Bedrock Agents. It
// uses a different SDK package, a runtime ARN (instead of agentId/aliasId), and
// a binary payload instead of inputText. Credentials follow the same rules as
// the classic client (static keys in dev, IAM role in prod).
const agentCoreClient = new BedrockAgentCoreClient({
    region: AWS_REGION,
    ...resolveAwsCredentials(),
})

/**
 * AgentCore harness ARN for the marketing-plan harness. Harness-managed
 * runtimes must be invoked via the InvokeHarness API using the harness ARN
 * (NOT the underlying runtime ARN). Override via env var so swapping the
 * harness never requires a code change / redeploy.
 */
const MARKETING_HARNESS_ARN =
    process.env.MARKETING_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/marketingPlan-iS7SeEFIOL'

/** Optional endpoint/version qualifier for the harness (defaults to DEFAULT). */
const MARKETING_AGENT_QUALIFIER = process.env.MARKETING_AGENT_QUALIFIER || undefined

/**
 * Max tokens the harness may generate per iteration. The marketing plan is a
 * large JSON document, so the harness default is often too low and truncates
 * the answer. Override via MARKETING_MAX_TOKENS env var.
 */
const MARKETING_MAX_TOKENS = Number(process.env.MARKETING_MAX_TOKENS ?? '8192')

/**
 * AgentCore harness ARN for the marketing-guidelines harness. Invoked via the
 * InvokeHarness API using the harness ARN. Override via env var.
 *
 * NOTE: replace the default below with the real guidelines harness ARN.
 */
const GUIDELINES_HARNESS_ARN =
    process.env.GUIDELINES_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/marketingGuidelines-ALh6PBl9iQ'

/** Optional endpoint/version qualifier for the guidelines harness. */
const GUIDELINES_AGENT_QUALIFIER = process.env.GUIDELINES_AGENT_QUALIFIER || undefined

/** Max tokens the guidelines harness may generate per iteration. */
const GUIDELINES_MAX_TOKENS = Number(process.env.GUIDELINES_MAX_TOKENS ?? '32000')

/**
 * AgentCore harness ARN for the marketing-forecast harness. Invoked via the
 * InvokeHarness API using the harness ARN. Override via env var.
 *
 * NOTE: replace the default below with the real forecast harness ARN.
 */
const FORECAST_HARNESS_ARN =
    process.env.FORECAST_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/marketingForecast-NYba6i08Rk'

/** Optional endpoint/version qualifier for the forecast harness. */
const FORECAST_AGENT_QUALIFIER = process.env.FORECAST_AGENT_QUALIFIER || undefined

/** Max tokens the forecast harness may generate per iteration. */
const FORECAST_MAX_TOKENS = Number(process.env.FORECAST_MAX_TOKENS ?? '32000')

/**
 * AgentCore harness ARN for the profile-verification harness. Invoked via the
 * InvokeHarness API using the harness ARN. Override via env var.
 *
 * NOTE: replace the default below with the real profile-verification harness ARN.
 */
const PROFILE_HARNESS_ARN =
    process.env.PROFILE_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/profileVerification-URNFXarQM5'

/** Optional endpoint/version qualifier for the profile-verification harness. */
const PROFILE_AGENT_QUALIFIER = process.env.PROFILE_AGENT_QUALIFIER || undefined

/** Max tokens the profile-verification harness may generate (short output). */
const PROFILE_MAX_TOKENS = Number(process.env.PROFILE_MAX_TOKENS ?? '1024')

/**
 * AgentCore harness ARN for the fund-allocation harness. Invoked via the
 * InvokeHarness API using the harness ARN (not the underlying runtime ARN).
 * Override via env var so swapping harnesses never requires a code change.
 */
const FUND_HARNESS_ARN =
    process.env.FUND_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/sr_financial_FundAllocation-iunqjr6MYA'

/** Optional endpoint/version qualifier for the fund-allocation harness. */
const FUND_AGENT_QUALIFIER = process.env.FUND_AGENT_QUALIFIER || undefined

/**
 * Max tokens the fund-allocation harness may generate per iteration. The
 * six-category JSON is small, so 4096 is enough; raise it if the response is
 * truncated with `messageStop reason=max_tokens`.
 */
const FUND_MAX_TOKENS = Number(process.env.FUND_MAX_TOKENS ?? '4096')

/**
 * AgentCore harness ARN for the revenue-projection harness. Invoked via the
 * InvokeHarness API using the harness ARN (not the underlying runtime ARN).
 */
const REVENUE_HARNESS_ARN =
    process.env.REVENUE_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/sr_financial_RevenueProjection-mGkcG1UVK0'

/** Optional endpoint/version qualifier for the revenue-projection harness. */
const REVENUE_AGENT_QUALIFIER = process.env.REVENUE_AGENT_QUALIFIER || undefined

/**
 * Max tokens the revenue-projection harness may generate per iteration. The
 * four-period JSON with milestones/risks/actions needs more room than Fund
 * Allocation; 8192 leaves headroom without hitting the old truncation.
 */
const REVENUE_MAX_TOKENS = Number(process.env.REVENUE_MAX_TOKENS ?? '8192')

/**
 * AgentCore harness ARN for the loans & funding harness. Invoked via the
 * InvokeHarness API using the harness ARN (not the underlying runtime ARN).
 */
const LOANS_HARNESS_ARN =
    process.env.LOANS_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/sr_financial_LoansNFunding-iUoPB9AwcM'

/** Optional endpoint/version qualifier for the loans & funding harness. */
const LOANS_AGENT_QUALIFIER = process.env.LOANS_AGENT_QUALIFIER || undefined

/**
 * Max tokens the loans & funding harness may generate per iteration. The
 * response is a compact list JSON; 4096 is enough.
 */
const LOANS_MAX_TOKENS = Number(process.env.LOANS_MAX_TOKENS ?? '4096')

/**
 * AgentCore harness ARN for the investor & funding harness. Invoked via the
 * InvokeHarness API using the harness ARN (not the underlying runtime ARN).
 */
const INVESTOR_HARNESS_ARN =
    process.env.INVESTOR_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/sr_financial_InvestorFunding-gypZe9idDz'

/** Optional endpoint/version qualifier for the investor & funding harness. */
const INVESTOR_AGENT_QUALIFIER = process.env.INVESTOR_AGENT_QUALIFIER || undefined

/**
 * Max tokens the investor & funding harness may generate per iteration. The
 * response is a compact list JSON; 4096 is enough.
 */
const INVESTOR_MAX_TOKENS = Number(process.env.INVESTOR_MAX_TOKENS ?? '4096')


/**
 * AgentCore harness ARN for the risk and regulations analyzer. Invoked via the
 * InvokeHarness API using the harness ARN (not the underlying runtime ARN).
 */
const OFFICE_HARNESS_ARN =
    process.env.OFFICE_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/hew_office_location_finder-kTVYIjiGbQ'

const OFFICE_AGENT_QUALIFIER =
    process.env.OFFICE_AGENT_QUALIFIER || undefined

const OFFICE_MAX_TOKENS =
    Number(process.env.OFFICE_MAX_TOKENS) || 32000

/**
 * Response timeout for the office-location harness. It runs live web search +
 * a headless browser, so it is much slower than the text-only harnesses and
 * needs a larger timeout budget. Override via OFFICE_TIMEOUT_MS.
 */
const OFFICE_TIMEOUT_MS =
    Number(process.env.OFFICE_TIMEOUT_MS) || 300_000

/**
 * AgentCore harness ARN for the risk and regulations analyzer. Invoked via the
 * InvokeHarness API using the harness ARN (not the underlying runtime ARN).
 */
const RISK_HARNESS_ARN =
    process.env.RISK_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/hew_risk_regulations-my3Wo3YIUT'

const RISK_AGENT_QUALIFIER =
    process.env.RISK_AGENT_QUALIFIER ?? 'DEFAULT'

const RISK_MAX_TOKENS =
    Number(process.env.RISK_MAX_TOKENS) || 10000

/**
 * AgentCore harness ARN for the startup registration guide. Invoked via the
 * InvokeHarness API using the harness ARN (not the underlying runtime ARN).
 */
const STARTUP_HARNESS_ARN =
    process.env.STARTUP_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/StartupRegistrationGuidelines-Gbl8PU6k4r'

/** Optional endpoint/version qualifier for the startup registration harness. */
const STARTUP_AGENT_QUALIFIER = process.env.STARTUP_AGENT_QUALIFIER || undefined

/**
 * Max tokens the startup registration harness may generate per iteration. The
 * two-part guide is a large JSON document, so give it more headroom than the
 * compact finance lists.
 */
const STARTUP_MAX_TOKENS = Number(process.env.STARTUP_MAX_TOKENS ?? '8192')

/**
 * AgentCore harness ARN for the analytics dashboard. Invoked via the
 * InvokeHarness API using the harness ARN (not the underlying runtime ARN).
 */
const ANALYTICS_HARNESS_ARN =
    process.env.ANALYTICS_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/cindy_AnalyticsDashboard-PZrViaLlm8'

/** Optional endpoint/version qualifier for the analytics dashboard harness. */
const ANALYTICS_AGENT_QUALIFIER = process.env.ANALYTICS_AGENT_QUALIFIER || undefined

/**
 * Max tokens the analytics dashboard harness may generate per iteration. The
 * 12-month dashboard JSON needs more room than the compact finance lists.
 */
const ANALYTICS_MAX_TOKENS = Number(process.env.ANALYTICS_MAX_TOKENS ?? '8192')

/**
 * AgentCore harness ARN for the report / document generator. Invoked via the
 * InvokeHarness API using the harness ARN (not the underlying runtime ARN).
 */
const DOCUMENT_HARNESS_ARN =
    process.env.DOCUMENT_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/cindy_DocumentGenerator-lQCRH0RcWS'

/** Optional endpoint/version qualifier for the document generator harness. */
const DOCUMENT_AGENT_QUALIFIER = process.env.DOCUMENT_AGENT_QUALIFIER || undefined

/**
 * Max tokens the document generator harness may generate per iteration.
 * Reports are long, so this is much higher than the compact finance boxes.
 */
const DOCUMENT_MAX_TOKENS = Number(process.env.DOCUMENT_MAX_TOKENS ?? '16384')

/**
 * AgentCore harness ARN for the business advisor chat. Invoked via the
 * InvokeHarness API using the harness ARN (not the underlying runtime ARN).
 */
const ASSISTANT_HARNESS_ARN =
    process.env.ASSISTANT_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/Business_Advisor-AAxu3iHMvD'

/** Optional endpoint/version qualifier for the business advisor harness. */
const ASSISTANT_AGENT_QUALIFIER = process.env.ASSISTANT_AGENT_QUALIFIER || undefined

/**
 * Max tokens the advisor harness may generate per iteration. Answers are
 * capped at ~180 words by the UI, so 2048 is plenty.
 */
const ASSISTANT_MAX_TOKENS = Number(process.env.ASSISTANT_MAX_TOKENS ?? '2048')

/** AgentCore harness used for competitor pricing analysis. */
const COMPETITOR_HARNESS_ARN =
    process.env.COMPETITOR_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/CompetitorPricingAnalysis-cKXDzRuMXr'

/** Optional endpoint/version qualifier for the competitor-pricing harness. */
const COMPETITOR_AGENT_QUALIFIER = process.env.COMPETITOR_AGENT_QUALIFIER || undefined

/** Max tokens the competitor-pricing harness may generate. */
const COMPETITOR_MAX_TOKENS = Number(process.env.COMPETITOR_MAX_TOKENS ?? '4096')

/** AgentCore harness for Smart Pricing Suggestions. */
const SMART_PRICING_HARNESS_ARN =
    process.env.SMART_PRICING_HARNESS_ARN ??
    'arn:aws:bedrock-agentcore:ap-southeast-1:781897846709:harness/SmartPricingSuggestion-ZKszfEXOTJ'
const SMART_PRICING_AGENT_QUALIFIER = process.env.SMART_PRICING_AGENT_QUALIFIER || undefined
const SMART_PRICING_MAX_TOKENS = Number(process.env.SMART_PRICING_MAX_TOKENS ?? '4096')

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
 * Invoke a Bedrock AgentCore harness via the InvokeHarness API and return the
 * accumulated assistant text, with throttle retries and a response timeout.
 *
 * The prompt is sent as a single user message. The harness streams back events;
 * we accumulate the text from contentBlockDelta events for the caller to parse.
 */
async function invokeAgentCore(
    promptText: string,
    sessionId: string,
    harnessArn: string,
    qualifier?: string,
    maxTokens?: number,
    timeoutMs?: number,
): Promise<string> {
    const THROTTLE_RETRIES = 5
    // Default response timeout. Slow, tool-using harnesses (e.g. ones with a
    // browser or web-search gateway) can be given a larger budget per call.
    const AGENT_TIMEOUT_MS = timeoutMs && timeoutMs > 0 ? timeoutMs : 120_000

    // InvokeHarness requires runtimeSessionId to be at least 33 characters.
    const safeSessionId =
        sessionId.length >= 33
            ? sessionId
            : (sessionId + '-' + '0'.repeat(33)).slice(0, 48)

    for (let t = 1; t <= THROTTLE_RETRIES; t++) {
        try {
            const command = new InvokeHarnessCommand({
                harnessArn,
                qualifier,
                runtimeSessionId: safeSessionId,
                // Override the harness default so the large marketing-plan JSON
                // isn't truncated. Only sent when a positive value is provided.
                ...(maxTokens && maxTokens > 0 ? { maxTokens } : {}),
                messages: [
                    {
                        role: 'user',
                        content: [{ text: promptText }],
                    },
                ],
            })

            const invokeWithTimeout = new Promise<string>((resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error(`invokeAgentCore timeout: harness=${harnessArn} did not respond within ${AGENT_TIMEOUT_MS}ms`))
                }, AGENT_TIMEOUT_MS)

                    ; (async () => {
                        const response = await agentCoreClient.send(command)
                        let accumulated = ''
                        for await (const event of response.stream ?? []) {
                            // Assistant text arrives as contentBlockDelta.delta.text
                            const deltaText = event.contentBlockDelta?.delta?.text
                            if (deltaText) accumulated += deltaText

                            // Log the stop reason so truncation (max_tokens) is visible.
                            if (event.messageStop?.stopReason) {
                                console.log(`[AgentCore] messageStop reason=${event.messageStop.stopReason}`)
                            }
                            if (event.metadata?.usage) {
                                const u = event.metadata.usage
                                console.log(`[AgentCore] usage input=${u.inputTokens} output=${u.outputTokens} total=${u.totalTokens}`)
                            }

                            // Surface harness-side errors instead of silently timing out.
                            if (event.validationException) {
                                throw new Error(`Harness validation error: ${event.validationException.message}`)
                            }
                            if (event.internalServerException) {
                                throw new Error(`Harness internal error: ${event.internalServerException.message}`)
                            }
                            if (event.runtimeClientError) {
                                throw new Error(`Harness runtime client error: ${event.runtimeClientError.message}`)
                            }
                        }
                        clearTimeout(timer)
                        resolve(accumulated)
                    })().catch((err) => {
                        clearTimeout(timer)
                        reject(err)
                    })
            })

            const raw = await invokeWithTimeout

            if (raw.length === 0) {
                console.warn(`[AgentCore] harness=${harnessArn} returned EMPTY response.`)
            }

            return raw
        } catch (err) {
            if (isThrottleError(err) && t < THROTTLE_RETRIES) {
                const delay = 5000 * (t * 0.5)
                console.warn(`[AgentCore] Throttled on attempt ${t}/${THROTTLE_RETRIES}. Waiting ${delay}ms before retry...`)
                await sleep(delay)
                continue
            }
            throw err
        }
    }
    throw new Error('invokeAgentCore: all throttle retries exhausted')
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
            const raw = await invokeAgentCore(
                inputText,
                sessionId,
                MARKETING_HARNESS_ARN,
                MARKETING_AGENT_QUALIFIER,
                MARKETING_MAX_TOKENS,
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


// ─── POST /api/bedrock/startup ────────────────────────────────────────────────
// Invokes the startup registration AgentCore harness and returns parsed JSON.

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

    console.log('=== [startup] inputText sent to AgentCore harness ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `startup-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgentCore(
                inputText,
                sessionId,
                STARTUP_HARNESS_ARN,
                STARTUP_AGENT_QUALIFIER,
                STARTUP_MAX_TOKENS,
            )
            lastRaw = raw

            console.log(`[Bedrock/startup] Attempt ${attempt}/${MAX_RETRIES} — ${raw.length} chars`)

            const jsonString = extractJsonString(raw)
            const parsed = JSON.parse(jsonString) as unknown
            const guide = validateStartupGuide(parsed)

            console.log(`[Bedrock/startup] Attempt ${attempt} returned a valid, validated guide`)
            res.status(200).json({ content: JSON.stringify(guide) })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[Bedrock/startup] Attempt ${attempt}/${MAX_RETRIES} invalid guide.` +
                    (attempt < MAX_RETRIES ? ' Retrying...' : ' No retries left.'),
                )
                console.warn(`  reason: ${err.message}`)
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

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
    ].join('\n')

    console.log('=== [fund-allocation] inputText sent to AgentCore harness ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `fund-alloc-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgentCore(
                inputText,
                sessionId,
                FUND_HARNESS_ARN,
                FUND_AGENT_QUALIFIER,
                FUND_MAX_TOKENS,
            )
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

    // Convert currentFunds to number
    const funds = Number(currentFunds)

    // Validate input
    if (
        !companyName ||
        !industry ||
        !city ||
        !businessStage ||
        !businessType ||
        !Number.isFinite(funds) ||
        funds < 0
    ) {
        res.status(400).json({
            error:
                'companyName, industry, city, businessStage, businessType, and valid currentFunds are required.',
        })
        return
    }


    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Business Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${funds.toLocaleString('en-MY')}`,
    ].join('\n')

    console.log(
        '=== [office-location] inputText sent to AgentCore Harness ===\n',
        inputText,
    )

    let lastRaw = ''

    // retry loop
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        // New session for each attempt
        const sessionId =
            `office-loc-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`

        try {
            // INVOKE OFFICE & LOCATION HARNESS

            const raw = await invokeAgentCore(
                inputText,
                sessionId,
                OFFICE_HARNESS_ARN,
                OFFICE_AGENT_QUALIFIER,
                OFFICE_MAX_TOKENS,
                OFFICE_TIMEOUT_MS,
            )

            lastRaw = raw

            console.log(
                `[office-location] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )

            console.log(
                '[office-location] Raw preview:',
                raw.slice(0, 300),
            )

            // EXTRACT JSON FROM <answer>...</answer>

            const jsonString = extractJsonString(raw)

            // Validate + parse JSON
            const parsed = JSON.parse(jsonString)

            console.log(
                `[office-location] Attempt ${attempt} returned valid JSON`,
            )

            // RETURN RESULT

            res.status(200).json({
                content: parsed,
            })

            return
        } catch (err) {

            // INVALID JSON

            if (err instanceof SyntaxError) {
                console.warn(
                    `[office-location] Attempt ${attempt}/${MAX_RETRIES} did NOT return valid JSON. ` +
                    (
                        attempt < MAX_RETRIES
                            ? 'Retrying in 3s...'
                            : 'No retries left.'
                    ),
                )

                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve =>
                        setTimeout(resolve, 3000),
                    )
                }

                continue
            }

            // HARNESS / AWS ERROR

            console.error(
                `[SMEwise] /api/bedrock/office-location error on attempt ${attempt}:`,
                err,
            )

            res.status(500).json({
                error:
                    'Something went wrong while generating the office & location guide. Please try again.',
            })

            return
        }
    }

    // ALL RETRIES FAILED

    console.error(
        `[office-location] All ${MAX_RETRIES} attempts failed to return valid JSON.`,
    )

    console.error(
        '[office-location] Last raw response:',
        lastRaw.slice(0, 1000),
    )

    res.status(500).json({
        error:
            'The office & location guide could not be generated in a valid format. Please try again.',
    })
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

    // 1. Validate user input

    const funds = Number(currentFunds)

    if (
        !companyName ||
        !industry ||
        !city ||
        !businessStage ||
        !businessType ||
        !Number.isFinite(funds) ||
        funds < 0
    ) {
        res.status(400).json({
            error:
                'companyName, industry, city, businessStage, businessType, and valid currentFunds are required.',
        })
        return
    }

    // 2. Build input for Risk AgentCore Harness

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Business Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${funds.toLocaleString('en-MY')}`,
    ].join('\n')

    console.log(
        '=== [risk-analyzer] inputText sent to AgentCore Harness ===\n',
        inputText,
    )

    // 3. Generate + validate Risk Analysis

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId =
            `risk-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {

            // Invoke Risk AgentCore Harness

            const raw = await invokeAgentCore(
                inputText,
                sessionId,
                RISK_HARNESS_ARN,
                RISK_AGENT_QUALIFIER,
                RISK_MAX_TOKENS,
            )

            console.log(
                `[risk-analyzer] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )

            console.log(
                '[risk-analyzer] Raw preview:',
                raw.slice(0, 300),
            )

            // Extract JSON from <answer>{...}</answer>

            let parsed: unknown

            try {
                const jsonString = extractJsonString(raw)
                parsed = JSON.parse(jsonString)
            } catch (parseError) {
                console.warn(
                    `[risk-analyzer] Attempt ${attempt}/${MAX_RETRIES} returned invalid JSON.`,
                    parseError,
                )

                if (attempt < MAX_RETRIES) {
                    console.warn(
                        '[risk-analyzer] Retrying in 3 seconds...',
                    )

                    await new Promise(resolve =>
                        setTimeout(resolve, 3000),
                    )

                    continue
                }

                console.error(
                    '[risk-analyzer] No retries left after JSON parsing failure.',
                )

                res.status(500).json({
                    error:
                        'Unable to generate a valid risk analysis. Please try again.',
                })
                return
            }

            // Backend structural validation

            const validation = validateRiskAnalysis(parsed, {
                companyName,
                industry,
                businessStage,
                city,
                businessType,
                currentFunds: funds,
            })

            if (!validation.valid) {
                console.warn(
                    `[risk-analyzer] Attempt ${attempt}/${MAX_RETRIES} failed backend validation:`,
                    validation.errors,
                )

                if (attempt < MAX_RETRIES) {
                    console.warn(
                        '[risk-analyzer] Retrying in 3 seconds...',
                    )

                    await new Promise(resolve =>
                        setTimeout(resolve, 3000),
                    )

                    continue
                }

                console.error(
                    '[risk-analyzer] No retries left after validation failure.',
                )

                res.status(500).json({
                    error:
                        'Unable to generate a valid risk analysis. Please try again.',
                })
                return
            }

            // Valid response

            console.log(
                `[risk-analyzer] Attempt ${attempt} returned valid JSON and passed backend validation.`,
            )


            res.status(200).json({
                content: raw,
            })

            return
        } catch (err) {

            // Unexpected AgentCore / AWS / infrastructure error

            console.error(
                `[SMEwise] /api/bedrock/risk-analyzer error on attempt ${attempt}:`,
                err,
            )

            res.status(500).json({
                error:
                    'Something went wrong while generating the risk analysis. Please try again.',
            })

            return
        }
    }

    // Safety fallback

    console.error(
        `[risk-analyzer] All ${MAX_RETRIES} attempts failed.`,
    )

    res.status(500).json({
        error:
            'Unable to generate a valid risk analysis. Please try again.',
    })
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

    console.log('=== [marketing-guidelines] Invoking harness with marketing plan ===')

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `guidelines-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgentCore(
                marketingPlanJson,
                sessionId,
                GUIDELINES_HARNESS_ARN,
                GUIDELINES_AGENT_QUALIFIER,
                GUIDELINES_MAX_TOKENS,
            )
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

    console.log('=== [marketing-forecast] Invoking harness with marketing plan ===')

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `forecast-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const inputJson = extractJsonString(marketingPlanJson)
            // console.log(`input: ${inputJson}`)
            const raw = await invokeAgentCore(
                inputJson,
                sessionId,
                FORECAST_HARNESS_ARN,
                FORECAST_AGENT_QUALIFIER,
                FORECAST_MAX_TOKENS,
            )
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

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
        `Business Goal: ${mainGoal?.trim() || 'Grow the business sustainably'}`,
        `Budget Allocation: ${budgetAllocation?.trim() || 'Not yet allocated'}`,
    ].join('\n')

    console.log('=== [revenue-projection] inputText sent to AgentCore harness ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `revenue-proj-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgentCore(
                inputText,
                sessionId,
                REVENUE_HARNESS_ARN,
                REVENUE_AGENT_QUALIFIER,
                REVENUE_MAX_TOKENS,
            )
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
            const parsed = JSON.parse(jsonString) as unknown
            const { plan, repairs } = normaliseRevenuePlan(parsed, { goal: mainGoal })

            // The request is the source of truth for these identity fields.
            plan.company = companyName
            plan.industry = industry
            plan.currentFunds = Number(currentFunds)

            if (repairs.length > 0) {
                console.warn(
                    `[revenue-projection] Normalised ${repairs.length} issue(s) on attempt ${attempt}:`,
                )
                for (const repair of repairs) {
                    console.warn(`  - ${repair}`)
                }
            }

            console.log(`[revenue-projection] Attempt ${attempt} returned a valid, normalised plan`)
            res.status(200).json({ content: JSON.stringify(plan) })
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

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Current Funds: RM ${Number(currentFunds).toLocaleString('en-MY')}`,
    ].join('\n')

    console.log('=== [loans-funding] inputText sent to AgentCore harness ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `loans-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgentCore(
                inputText,
                sessionId,
                LOANS_HARNESS_ARN,
                LOANS_AGENT_QUALIFIER,
                LOANS_MAX_TOKENS,
            )
            lastRaw = raw

            console.log(
                `[loans-funding] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )

            const jsonString = extractJsonString(raw)
            const parsed = JSON.parse(jsonString) as unknown
            const plan = validateLoansFundingPlan(parsed)

            console.log(`[loans-funding] Attempt ${attempt} returned a valid, validated plan`)
            res.status(200).json({ content: JSON.stringify(plan) })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[loans-funding] Attempt ${attempt}/${MAX_RETRIES} did NOT return a valid plan. ` +
                    (attempt < MAX_RETRIES ? 'Retrying...' : 'No retries left.'),
                )
                console.warn(`  reason: ${err.message}`)
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

    const inputText = [
        `Company: ${companyName}`,
        `Industry: ${industry}`,
        `Stage: ${businessStage}`,
        `Location: ${city}, Malaysia`,
        `Business Type: ${businessType}`,
        `Goal: ${mainGoal?.trim() || 'Grow the business sustainably'}`,
    ].join('\n')

    console.log('=== [investor-funding] inputText sent to AgentCore harness ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `investor-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgentCore(
                inputText,
                sessionId,
                INVESTOR_HARNESS_ARN,
                INVESTOR_AGENT_QUALIFIER,
                INVESTOR_MAX_TOKENS,
            )
            lastRaw = raw

            console.log(
                `[investor-funding] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )

            if (raw.length === 0) {
                console.warn(`[investor-funding] Attempt ${attempt}: empty response — harness may not be ready.`)
                // Treat empty as a retryable failure (same as bad JSON)
                continue
            }

            const jsonString = extractJsonString(raw)
            const parsed = JSON.parse(jsonString) as unknown
            const { plan: withFallbacks, repairs } =
                normaliseInvestorFundingPlan(parsed)
            const plan = validateInvestorFundingPlan(withFallbacks)

            if (repairs.length > 0) {
                console.warn(
                    `[investor-funding] Normalised ${repairs.length} issue(s) on attempt ${attempt}:`,
                )
                for (const repair of repairs) {
                    console.warn(`  - ${repair}`)
                }
            }

            console.log(`[investor-funding] Attempt ${attempt} returned a valid, validated plan`)
            res.status(200).json({ content: JSON.stringify(plan) })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[investor-funding] Attempt ${attempt}/${MAX_RETRIES} did NOT return a valid plan. ` +
                    (attempt < MAX_RETRIES ? 'Retrying...' : 'No retries left.'),
                )
                console.warn(`  reason: ${err.message}`)
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

    console.log('=== [profile-verification] inputText sent to harness ===\n', inputText)

    const sessionId = `profile-verify-${Date.now()}-${Math.random().toString(36).slice(2)}`

    try {
        const raw = await invokeAgentCore(
            inputText,
            sessionId,
            PROFILE_HARNESS_ARN,
            PROFILE_AGENT_QUALIFIER,
            PROFILE_MAX_TOKENS,
        )

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
// Invokes the competitor-pricing AgentCore harness.
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

    console.log('=== [competitor-pricing] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `competitor-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgentCore(
                inputText,
                sessionId,
                COMPETITOR_HARNESS_ARN,
                COMPETITOR_AGENT_QUALIFIER,
                COMPETITOR_MAX_TOKENS,
            )
            lastRaw = raw

            console.log(
                `[competitor-pricing] Attempt ${attempt}/${MAX_RETRIES} — response length: ${raw.length} chars`,
            )

            const jsonString = extractJsonString(raw)
            JSON.parse(jsonString)

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
// Invokes the Smart Pricing Suggestions AgentCore harness.
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

    console.log('=== [smart-pricing] inputText sent to Bedrock agent ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `smart-pricing-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgentCore(
                inputText,
                sessionId,
                SMART_PRICING_HARNESS_ARN,
                SMART_PRICING_AGENT_QUALIFIER,
                SMART_PRICING_MAX_TOKENS,
            )
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

    console.log('=== [analytics-dashboard] inputText sent to AgentCore harness ===\n', inputText)

    let lastRaw = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const sessionId = `analytics-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
            const raw = await invokeAgentCore(
                inputText,
                sessionId,
                ANALYTICS_HARNESS_ARN,
                ANALYTICS_AGENT_QUALIFIER,
                ANALYTICS_MAX_TOKENS,
            )
            lastRaw = raw

            console.log(`[analytics-dashboard] Attempt ${attempt}/${MAX_RETRIES} — ${raw.length} chars`)

            const jsonString = extractJsonString(raw)
            const parsed = JSON.parse(jsonString) as unknown
            const { data, repairs } = normaliseAnalyticsDashboard(parsed, {
                companyName,
                currentFunds: Number(currentFunds),
            })

            if (repairs.length > 0) {
                console.warn(
                    `[analytics-dashboard] Normalised ${repairs.length} issue(s) on attempt ${attempt}:`,
                )
                for (const repair of repairs) {
                    console.warn(`  - ${repair}`)
                }
            }

            console.log(`[analytics-dashboard] Attempt ${attempt} returned a valid, normalised dashboard`)
            res.status(200).json({ content: JSON.stringify(data) })
            return
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn(
                    `[analytics-dashboard] Attempt ${attempt}/${MAX_RETRIES} invalid dashboard.` +
                    (attempt < MAX_RETRIES ? ' Retrying...' : ' No retries left.'),
                )
                console.warn(`  reason: ${err.message}`)
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

    // Compose the harness input. The advisor sees one user message per turn:
    // context first (so it can ground answers), then the user's question.
    const contextSection = context
        ? `--- CONTEXT (do not echo back verbatim, use only as reference) ---\n${JSON.stringify(context, null, 2)}\n--- END CONTEXT ---\n\n`
        : ''
    const inputText = `${contextSection}USER MESSAGE:\n${message}`

    console.log(
        `[assistant] inputText length=${inputText.length} chars ` +
        `context.keys=${context ? Object.keys(context).join(',') : '(none)'}`,
    )

    // Reuse the same session across turns when the client provides one so the
    // harness keeps memory. runtimeSessionId must be at least 33 characters.
    const requestedSessionId = clientSessionId && clientSessionId.length > 0
        ? clientSessionId
        : `assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const sessionId = requestedSessionId.length >= 33
        ? requestedSessionId
        : (requestedSessionId + '-' + '0'.repeat(33)).slice(0, 48)

    // Set SSE headers up front so the browser starts rendering immediately.
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const AGENT_TIMEOUT_MS = 120_000
    let timedOut = false
    const timeoutHandle = setTimeout(() => {
        timedOut = true
        if (!res.writableEnded) {
            res.write(
                `data: ${JSON.stringify({
                    error: 'The advisor took too long to respond. Please try again.',
                })}\n\n`,
            )
            res.write('data: [DONE]\n\n')
            res.end()
        }
    }, AGENT_TIMEOUT_MS)

    try {
        const command = new InvokeHarnessCommand({
            harnessArn: ASSISTANT_HARNESS_ARN,
            qualifier: ASSISTANT_AGENT_QUALIFIER,
            runtimeSessionId: sessionId,
            maxTokens: ASSISTANT_MAX_TOKENS,
            messages: [
                {
                    role: 'user',
                    content: [{ text: inputText }],
                },
            ],
        })

        const agentResponse = await agentCoreClient.send(command)

        let totalChars = 0
        let eventCount = 0

        for await (const event of agentResponse.stream ?? []) {
            if (timedOut) break
            eventCount++

            const deltaText = event.contentBlockDelta?.delta?.text
            if (deltaText) {
                totalChars += deltaText.length
                res.write(`data: ${JSON.stringify({ delta: deltaText })}\n\n`)
                continue
            }

            if (event.messageStop?.stopReason) {
                console.log(`[assistant] messageStop reason=${event.messageStop.stopReason}`)
            }

            if (event.metadata?.usage) {
                const usage = event.metadata.usage
                console.log(
                    `[assistant] usage input=${usage.inputTokens} output=${usage.outputTokens} total=${usage.totalTokens}`,
                )
            }

            // Surface harness-side errors so the user sees a usable message
            // instead of a silent stream end.
            if (event.validationException) {
                const msg = event.validationException.message ?? '(no message)'
                console.error(`[assistant] validationException: ${msg}`)
                res.write(`data: ${JSON.stringify({ error: `Advisor validation error: ${msg}` })}\n\n`)
                continue
            }
            if (event.internalServerException) {
                const msg = event.internalServerException.message ?? '(no message)'
                console.error(`[assistant] internalServerException: ${msg}`)
                res.write(`data: ${JSON.stringify({ error: `Advisor error: ${msg}` })}\n\n`)
                continue
            }
            if (event.runtimeClientError) {
                const msg = event.runtimeClientError.message ?? '(no message)'
                console.error(`[assistant] runtimeClientError: ${msg}`)
                res.write(`data: ${JSON.stringify({ error: `Advisor error: ${msg}` })}\n\n`)
                continue
            }
        }

        clearTimeout(timeoutHandle)
        console.log(
            `[assistant] stream finished events=${eventCount} chars=${totalChars} session=${sessionId}`,
        )

        if (!res.writableEnded) {
            res.write('data: [DONE]\n\n')
            res.end()
        }
    } catch (err) {
        clearTimeout(timeoutHandle)
        console.error('[SMEwise] /api/bedrock/assistant error:', err)
        const error = err as { name?: string; message?: string }

        // SSE headers are already flushed, so send an SSE error event.
        if (!res.writableEnded) {
            res.write(
                `data: ${JSON.stringify({
                    error: isThrottlingError(err)
                        ? THROTTLE_USER_MESSAGE
                        : `Something went wrong: ${error.message ?? 'unknown error'}`,
                })}\n\n`,
            )
            res.write('data: [DONE]\n\n')
            res.end()
        }
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

        console.log('=== [document-generator] inputText sent to AgentCore harness ===\n', inputText)

        let lastRaw = ''

        for (let attempt = 1; attempt <= DOCUMENT_GENERATOR_MAX_INVOCATIONS; attempt++) {
            const sessionId = `doc-gen-${Date.now()}-${Math.random().toString(36).slice(2)}`

            try {
                const raw = await invokeAgentCore(
                    inputText,
                    sessionId,
                    DOCUMENT_HARNESS_ARN,
                    DOCUMENT_AGENT_QUALIFIER,
                    DOCUMENT_MAX_TOKENS,
                )
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
                const parsed = JSON.parse(jsonString) as unknown
                const doc = validateGeneratedDocument(parsed, {
                    documentType,
                    companyName,
                })

                console.log(`[document-generator] Invocation ${attempt} returned a valid, validated document`)
                res.status(200).json({ content: JSON.stringify(doc) })
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
