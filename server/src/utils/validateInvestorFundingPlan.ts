/**
 * validateInvestorFundingPlan — contract check for the Investor & Funding widget.
 *
 * The model is constrained to an official URL allowlist, so the main risks are
 * a hallucinated link, a best-recommendation name that does not match any card
 * (which hides the "Apply" link), or the model drifting into bank loans/debt.
 *
 * Validation failures throw SyntaxError so the route's existing retry loop
 * asks the harness for a fresh response.
 */

export const INVESTOR_URL_ALLOWLIST: ReadonlySet<string> = new Set([
    'https://www.cradle.com.my',
    'https://www.mdec.my',
    'https://smecorp.gov.my',
    'https://www.mystartup.gov.my',
    'https://www.mranti.my',
    'https://1337.ventures',
    'https://www.vertexventures.com',
    'https://east.vc',
    'https://500.co',
    'https://www.pitchin.my',
])

const ALLOWED_TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
    'company',
    'industry',
    'grants',
    'investors',
    'accelerators',
    'bestRecommendation',
])

const ALLOWED_ITEM_KEYS: ReadonlySet<string> = new Set(['name', 'url'])

const ALLOWED_BEST_RECOMMENDATION_KEYS: ReadonlySet<string> = new Set([
    'source',
    'reason',
    'nextStep',
])

/**
 * Box 4 is grants/equity/accelerators only. Match whole words so names such as
 * "SME Corp" are not caught by short substrings.
 */
const FORBIDDEN_LOAN_PATTERNS: readonly RegExp[] = [
    /\bsme bank\b/i,
    /\btekun\b/i,
    /\bmaybank\b/i,
    /\bcimb\b/i,
    /\bpublic bank\b/i,
    /\brhb\b/i,
    /\bhong leong\b/i,
    /\bambank\b/i,
    /\bbank islam\b/i,
    /\balliance bank\b/i,
    /\bbank negara\b/i,
    /\bloan\b/i,
    /\bdebt\b/i,
]

const GUARANTEE_PATTERNS: readonly RegExp[] = [
    /\bguarantee(d|s)?\b/i,
    /\bdefinitely\b/i,
    /\bassured\b/i,
    /\bwill receive funding\b/i,
    /\bsure to get\b/i,
]

export interface InvestorFundingItem {
    name: string
    url: string
}

export interface InvestorFundingPlan {
    company: string
    industry: string
    grants: InvestorFundingItem[]
    investors: InvestorFundingItem[]
    accelerators: InvestorFundingItem[]
    bestRecommendation: {
        source: string
        reason: string
        nextStep: string
    }
}

/**
 * Curated fallbacks from the same official allowlist. They are only used when
 * the model returns fewer than two items in a list, which makes the UI look
 * sparse and can trigger a pointless retry.
 */
const GRANT_FALLBACKS: readonly InvestorFundingItem[] = [
    { name: 'SME Corp Malaysia', url: 'https://smecorp.gov.my' },
    { name: 'MYStartup', url: 'https://www.mystartup.gov.my' },
]

const INVESTOR_FALLBACKS: readonly InvestorFundingItem[] = [
    { name: '1337 Ventures', url: 'https://1337.ventures' },
    { name: 'East Ventures', url: 'https://east.vc' },
]

const ACCELERATOR_FALLBACKS: readonly InvestorFundingItem[] = [
    { name: 'PitchIN', url: 'https://www.pitchin.my' },
    { name: 'MYStartup Accelerator', url: 'https://www.mystartup.gov.my' },
]

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(
    value: unknown,
    field: string,
    errors: string[],
): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push(`${field} must be a non-empty string.`)
        return ''
    }
    return value.trim()
}

function normaliseUrl(url: string): string {
    return url.trim().replace(/\/+$/, '')
}

function validateUrl(url: string, field: string, errors: string[]): void {
    if (!url) return
    if (!INVESTOR_URL_ALLOWLIST.has(normaliseUrl(url))) {
        errors.push(`${field} is not in the official allowlist: ${url}`)
    }
}

function validateNoLoanTerm(
    value: string,
    field: string,
    errors: string[],
): void {
    if (!value) return
    const match = FORBIDDEN_LOAN_PATTERNS.find((pattern) => pattern.test(value))
    if (match) {
        errors.push(
            `${field} contains a loan/debt category (${match.source}). ` +
                'This module is grants, equity, accelerators, and crowdfunding only.',
        )
    }
}

function validateNoGuarantee(
    value: string,
    field: string,
    errors: string[],
): void {
    if (!value) return
    const match = GUARANTEE_PATTERNS.find((pattern) => pattern.test(value))
    if (match) {
        errors.push(`${field} makes a guaranteed-funding claim (${match.source}).`)
    }
}

function validateItemList(
    value: unknown,
    field: 'grants' | 'investors' | 'accelerators',
    errors: string[],
): { index: number; item: Record<string, unknown> }[] {
    if (!Array.isArray(value) || value.length < 2 || value.length > 5) {
        const count = Array.isArray(value) ? value.length : 'non-array'
        errors.push(`${field} must contain 2-5 items (received ${count}).`)
        return []
    }

    const items: { index: number; item: Record<string, unknown> }[] = []
    for (const [index, item] of value.entries()) {
        if (!isRecord(item)) {
            errors.push(`${field}[${index}] must be an object.`)
            continue
        }
        items.push({ index, item })
    }
    return items
}

function validateItems(
    value: unknown,
    field: 'grants' | 'investors' | 'accelerators',
    errors: string[],
): InvestorFundingItem[] {
    const items: InvestorFundingItem[] = []

    for (const { index, item } of validateItemList(value, field, errors)) {
        const unknownKeys = Object.keys(item).filter(
            (key) => !ALLOWED_ITEM_KEYS.has(key),
        )
        if (unknownKeys.length > 0) {
            errors.push(
                `${field}[${index}] has unknown keys: ${unknownKeys.join(', ')}.`,
            )
        }

        const name = requireString(item.name, `${field}[${index}].name`, errors)
        const url = requireString(item.url, `${field}[${index}].url`, errors)
        validateUrl(url, `${field}[${index}].url`, errors)
        validateNoLoanTerm(name, `${field}[${index}].name`, errors)
        items.push({ name, url })
    }

    return items
}

export function validateInvestorFundingPlan(
    input: unknown,
): InvestorFundingPlan {
    if (!isRecord(input)) {
        throw new SyntaxError(
            'Investor & funding response was not a JSON object.',
        )
    }

    const raw = input
    const errors: string[] = []

    const unknownKeys = Object.keys(raw).filter(
        (key) => !ALLOWED_TOP_LEVEL_KEYS.has(key),
    )
    if (unknownKeys.length > 0) {
        errors.push(`Unknown top-level keys: ${unknownKeys.join(', ')}.`)
    }

    const company = requireString(raw.company, 'company', errors)
    const industry = requireString(raw.industry, 'industry', errors)

    const grants = validateItems(raw.grants, 'grants', errors)
    const investors = validateItems(raw.investors, 'investors', errors)
    const accelerators = validateItems(raw.accelerators, 'accelerators', errors)

    let bestRecommendation: InvestorFundingPlan['bestRecommendation'] = {
        source: '',
        reason: '',
        nextStep: '',
    }

    if (!isRecord(raw.bestRecommendation)) {
        errors.push('bestRecommendation must be an object.')
    } else {
        const unknownKeys = Object.keys(raw.bestRecommendation).filter(
            (key) => !ALLOWED_BEST_RECOMMENDATION_KEYS.has(key),
        )
        if (unknownKeys.length > 0) {
            errors.push(
                `bestRecommendation has unknown keys: ${unknownKeys.join(', ')}.`,
            )
        }

        bestRecommendation = {
            source: requireString(
                raw.bestRecommendation.source,
                'bestRecommendation.source',
                errors,
            ),
            reason: requireString(
                raw.bestRecommendation.reason,
                'bestRecommendation.reason',
                errors,
            ),
            nextStep: requireString(
                raw.bestRecommendation.nextStep,
                'bestRecommendation.nextStep',
                errors,
            ),
        }

        validateNoGuarantee(
            bestRecommendation.reason,
            'bestRecommendation.reason',
            errors,
        )
        validateNoGuarantee(
            bestRecommendation.nextStep,
            'bestRecommendation.nextStep',
            errors,
        )

        const allNames = [
            ...grants.map((item) => item.name),
            ...investors.map((item) => item.name),
            ...accelerators.map((item) => item.name),
        ]

        if (
            bestRecommendation.source.length > 0 &&
            !allNames.some(
                (name) =>
                    name.toLowerCase() ===
                    bestRecommendation.source.toLowerCase(),
            )
        ) {
            errors.push(
                `bestRecommendation.source "${bestRecommendation.source}" does not match any ` +
                    'grant, investor, or accelerator name.',
            )
        }
    }

    if (errors.length > 0) {
        throw new SyntaxError(
            `Invalid investor & funding response: ${errors.join(' ')}`,
        )
    }

    return {
        company,
        industry,
        grants,
        investors,
        accelerators,
        bestRecommendation,
    }
}

/**
 * Add curated fallbacks when a list has fewer than two items. The fallback
 * entries come from the same allowlist, so they are always valid and relevant
 * to Malaysian SMEs.
 */
function ensureMinimum(
    value: unknown,
    field: 'grants' | 'investors' | 'accelerators',
    fallbacks: readonly InvestorFundingItem[],
    repairs: string[],
): unknown {
    if (!Array.isArray(value)) return value

    const list = value.slice()
    for (const fallback of fallbacks) {
        if (list.length >= 2) break

        const exists = list.some(
            (item) =>
                isRecord(item) &&
                typeof item.name === 'string' &&
                item.name.trim().toLowerCase() === fallback.name.toLowerCase(),
        )
        if (exists) continue

        list.push({ ...fallback })
        repairs.push(
            `${field} had ${list.length - 1} item(s); added ${fallback.name} as a fallback.`,
        )
    }

    return list
}

export interface NormaliseInvestorFundingResult {
    plan: unknown
    repairs: string[]
}

export function normaliseInvestorFundingPlan(
    input: unknown,
): NormaliseInvestorFundingResult {
    if (!isRecord(input)) {
        return { plan: input, repairs: [] }
    }

    const repairs: string[] = []
    const plan: Record<string, unknown> = { ...input }

    plan.grants = ensureMinimum(
        plan.grants,
        'grants',
        GRANT_FALLBACKS,
        repairs,
    )
    plan.investors = ensureMinimum(
        plan.investors,
        'investors',
        INVESTOR_FALLBACKS,
        repairs,
    )
    plan.accelerators = ensureMinimum(
        plan.accelerators,
        'accelerators',
        ACCELERATOR_FALLBACKS,
        repairs,
    )

    return { plan, repairs }
}
