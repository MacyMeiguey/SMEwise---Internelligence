/**
 * validateLoansFundingPlan — contract check for the Loans & Funding widget.
 *
 * The model is constrained to an official URL allowlist, so the main risks are
 * a hallucinated link, a best-fit name that does not match any card (which
 * hides the "Apply" link), or the model drifting into grants/equity.
 *
 * Validation failures throw SyntaxError so the route's existing retry loop
 * asks the harness for a fresh response.
 */

export const LOANS_URL_ALLOWLIST: ReadonlySet<string> = new Set([
    'https://www.smebank.com.my',
    'https://www.tekun.gov.my',
    'https://www.bnm.gov.my/sme-financing',
    'https://www.mara.gov.my',
    'https://smecorp.gov.my',
    'https://www.midf.com.my',
    'https://www.maybank.com.my',
    'https://www.cimb.com.my',
    'https://www.publicbank.com.my',
    'https://www.rhbgroup.com',
    'https://www.hlb.com.my',
    'https://www.ambank.com.my',
    'https://www.bankislam.com',
    'https://www.alliancebank.com.my',
])

const ALLOWED_TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
    'company',
    'industry',
    'governmentSchemes',
    'commercialBanks',
    'bestFit',
    'requirements',
    'timeline',
])

/**
 * This module is debt-only. Match whole words so "SME Corp" and "MIDF" are not
 * caught by short substrings.
 */
const FORBIDDEN_PATTERNS: readonly RegExp[] = [
    /\bgrant\b/i,
    /\bcradle\b/i,
    /\bmdec\b/i,
    /\bmida\b/i,
    /\bpitchin\b/i,
    /\binvestor\b/i,
    /\bventure\b/i,
    /\bvc\b/i,
    /\bangel\b/i,
    /\baccelerator\b/i,
    /\bcrowdfunding\b/i,
]

export interface LoansFundingGovernmentScheme {
    name: string
    url: string
}

export interface LoansFundingCommercialBank {
    bank: string
    url: string
}

export interface LoansFundingPlan {
    company: string
    industry: string
    governmentSchemes: LoansFundingGovernmentScheme[]
    commercialBanks: LoansFundingCommercialBank[]
    bestFit: {
        scheme: string
        reason: string
        alternative: string
    }
    requirements: string[]
    timeline: string
}

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
    if (!LOANS_URL_ALLOWLIST.has(normaliseUrl(url))) {
        errors.push(`${field} is not in the official allowlist: ${url}`)
    }
}

function validateNoForbiddenTerm(
    value: string,
    field: string,
    errors: string[],
): void {
    if (!value) return
    const match = FORBIDDEN_PATTERNS.find((pattern) => pattern.test(value))
    if (match) {
        errors.push(
            `${field} contains a non-loan category (${match.source}). ` +
                'This module is loans and debt financing only.',
        )
    }
}

function validateSchemeList(
    value: unknown,
    field: 'governmentSchemes' | 'commercialBanks',
    errors: string[],
): { index: number; item: Record<string, unknown> }[] {
    if (!Array.isArray(value) || value.length < 3 || value.length > 5) {
        const count = Array.isArray(value) ? value.length : 'non-array'
        errors.push(`${field} must contain 3-5 items (received ${count}).`)
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

export function validateLoansFundingPlan(input: unknown): LoansFundingPlan {
    if (!isRecord(input)) {
        throw new SyntaxError('Loans & funding response was not a JSON object.')
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

    const governmentSchemes: LoansFundingGovernmentScheme[] = []
    for (const { index, item } of validateSchemeList(
        raw.governmentSchemes,
        'governmentSchemes',
        errors,
    )) {
        const name = requireString(
            item.name,
            `governmentSchemes[${index}].name`,
            errors,
        )
        const url = requireString(
            item.url,
            `governmentSchemes[${index}].url`,
            errors,
        )
        validateUrl(url, `governmentSchemes[${index}].url`, errors)
        validateNoForbiddenTerm(
            name,
            `governmentSchemes[${index}].name`,
            errors,
        )
        governmentSchemes.push({ name, url })
    }

    const commercialBanks: LoansFundingCommercialBank[] = []
    for (const { index, item } of validateSchemeList(
        raw.commercialBanks,
        'commercialBanks',
        errors,
    )) {
        const bank = requireString(
            item.bank,
            `commercialBanks[${index}].bank`,
            errors,
        )
        const url = requireString(
            item.url,
            `commercialBanks[${index}].url`,
            errors,
        )
        validateUrl(url, `commercialBanks[${index}].url`, errors)
        validateNoForbiddenTerm(
            bank,
            `commercialBanks[${index}].bank`,
            errors,
        )
        commercialBanks.push({ bank, url })
    }

    let bestFit: LoansFundingPlan['bestFit'] = {
        scheme: '',
        reason: '',
        alternative: '',
    }

    if (!isRecord(raw.bestFit)) {
        errors.push('bestFit must be an object.')
    } else {
        bestFit = {
            scheme: requireString(raw.bestFit.scheme, 'bestFit.scheme', errors),
            reason: requireString(raw.bestFit.reason, 'bestFit.reason', errors),
            alternative: requireString(
                raw.bestFit.alternative,
                'bestFit.alternative',
                errors,
            ),
        }

        const allNames = [
            ...governmentSchemes.map((scheme) => scheme.name),
            ...commercialBanks.map((bank) => bank.bank),
        ]

        if (
            bestFit.scheme.length > 0 &&
            !allNames.some(
                (name) => name.toLowerCase() === bestFit.scheme.toLowerCase(),
            )
        ) {
            errors.push(
                `bestFit.scheme "${bestFit.scheme}" does not match any ` +
                    'government scheme or commercial bank name.',
            )
        }
    }

    const requirements: string[] = []
    if (
        !Array.isArray(raw.requirements) ||
        raw.requirements.length < 5 ||
        raw.requirements.length > 8
    ) {
        const count = Array.isArray(raw.requirements)
            ? raw.requirements.length
            : 'non-array'
        errors.push(`requirements must contain 5-8 items (received ${count}).`)
    } else {
        for (const [index, item] of raw.requirements.entries()) {
            requirements.push(
                requireString(item, `requirements[${index}]`, errors),
            )
        }
    }

    const timeline = requireString(raw.timeline, 'timeline', errors)

    if (errors.length > 0) {
        throw new SyntaxError(
            `Invalid loans & funding response: ${errors.join(' ')}`,
        )
    }

    return {
        company,
        industry,
        governmentSchemes,
        commercialBanks,
        bestFit,
        requirements,
        timeline,
    }
}
