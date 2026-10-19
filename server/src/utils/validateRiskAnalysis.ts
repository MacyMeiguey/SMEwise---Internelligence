export const RISK_LEVELS = ['Critical', 'High', 'Medium', 'Low'] as const

const RISK_CATEGORIES = [
    'Regulatory & Compliance',
    'Financial',
    'Market',
    'Operational',
    'Economic / External',
] as const

const REGULATORY_APPLICABILITY = [
    'Mandatory',
    'Conditional',
    'Optional',
    'Confirm applicability',
] as const

const REGULATORY_COMPLEXITY = ['Low', 'Medium', 'High'] as const
const CAPITAL_POSITIONS = ['Comfortable', 'Manageable', 'Tight', 'High Risk'] as const

export interface RiskAnalysisValidationOptions {
    companyName: string
    industry: string
    businessStage: string
    city: string
    businessType: string
    currentFunds: number
}

export interface RiskAnalysisValidation {
    valid: boolean
    errors: string[]
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

function requireRecord(
    value: unknown,
    field: string,
    errors: string[],
): Record<string, unknown> {
    if (!isRecord(value)) {
        errors.push(`${field} must be an object.`)
        return {}
    }
    return value
}

function requireEnum(
    value: unknown,
    allowed: readonly string[],
    field: string,
    errors: string[],
): string {
    const text = requireString(value, field, errors)
    if (text && !allowed.includes(text)) {
        errors.push(
            `${field} must be one of: ${allowed.join(', ')} (received "${text}").`,
        )
    }
    return text
}

function validateStringArray(
    value: unknown,
    field: string,
    expectedLength: number,
    errors: string[],
): void {
    if (!Array.isArray(value) || value.length !== expectedLength) {
        const count = Array.isArray(value) ? value.length : 'non-array'
        errors.push(`${field} must contain exactly ${expectedLength} items (received ${count}).`)
        return
    }

    value.forEach((item, index) => {
        requireString(item, `${field}[${index}]`, errors)
    })
}

function validateNonEmptyStringArray(
    value: unknown,
    field: string,
    errors: string[],
): void {
    if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some(
            (item) => typeof item !== 'string' || item.trim().length === 0,
        )
    ) {
        errors.push(
            `${field} must be a non-empty array of non-empty strings.`,
        )
    }
}

function validatePortal(value: unknown, field: string, errors: string[]): void {
    const portal = requireString(value, field, errors)
    if (!portal || portal === 'N/A') return

    const urlOccurrences = portal.match(/https?:\/\//gi) ?? []
    if (
        urlOccurrences.length !== 1 ||
        portal !== portal.trim() ||
        /[\s<>\[\]()]/.test(portal)
    ) {
        errors.push(`${field} must be "N/A" or one raw HTTPS URL.`)
        return
    }

    try {
        const url = new URL(portal)
        if (
            !portal.startsWith('https://') ||
            url.protocol !== 'https:' ||
            !url.hostname
        ) {
            errors.push(`${field} must be "N/A" or one raw HTTPS URL.`)
        }
    } catch {
        errors.push(`${field} must be "N/A" or one raw HTTPS URL.`)
    }
}

export function validateRiskAnalysis(
    input: unknown,
    options: RiskAnalysisValidationOptions,
): RiskAnalysisValidation {
    const errors: string[] = []
    if (!isRecord(input)) {
        return {
            valid: false,
            errors: ['Risk analysis response must be an object.'],
        }
    }

    requireString(input.company, 'company', errors)
    requireString(input.industry, 'industry', errors)
    requireString(
        input.businessStage,
        'businessStage',
        errors,
    )
    requireString(input.location, 'location', errors)
    requireString(input.businessType, 'businessType', errors)
    if (
        input.currentFunds === null ||
        input.currentFunds === undefined ||
        (typeof input.currentFunds === 'string' &&
            input.currentFunds.trim().length === 0) ||
        (typeof input.currentFunds === 'number' &&
            (!Number.isFinite(input.currentFunds) || input.currentFunds < 0)) ||
        (typeof input.currentFunds !== 'string' &&
            typeof input.currentFunds !== 'number')
    ) {
        errors.push('currentFunds must be a non-empty string or non-negative finite number.')
    }

    const advisorAnalysis = requireRecord(
        input.advisorAnalysis,
        'advisorAnalysis',
        errors,
    )
    requireString(
        advisorAnalysis.businessActivityAssumption,
        'advisorAnalysis.businessActivityAssumption',
        errors,
    )
    requireString(advisorAnalysis.stageExposure, 'advisorAnalysis.stageExposure', errors)
    requireString(advisorAnalysis.capitalExposure, 'advisorAnalysis.capitalExposure', errors)
    requireEnum(
        advisorAnalysis.regulatoryComplexity,
        REGULATORY_COMPLEXITY,
        'advisorAnalysis.regulatoryComplexity',
        errors,
    )
    validateNonEmptyStringArray(
        advisorAnalysis.researchFocus,
        'advisorAnalysis.researchFocus',
        errors,
    )

    const riskSummary = requireRecord(input.riskSummary, 'riskSummary', errors)
    const overallRating = requireEnum(
        riskSummary.overallRating,
        RISK_LEVELS,
        'riskSummary.overallRating',
        errors,
    )
    requireString(
        riskSummary.biggestThreatNow,
        'riskSummary.biggestThreatNow',
        errors,
    )
    requireString(riskSummary.quickWin, 'riskSummary.quickWin', errors)

    const financialHealth = requireRecord(
        input.financialHealth,
        'financialHealth',
        errors,
    )
    requireEnum(
        financialHealth.capitalPosition,
        CAPITAL_POSITIONS,
        'financialHealth.capitalPosition',
        errors,
    )
    requireString(financialHealth.mainConcern, 'financialHealth.mainConcern', errors)
    requireString(financialHealth.reason, 'financialHealth.reason', errors)

    const riskLevels: string[] = []
    const riskCategories: string[] = []
    if (!Array.isArray(input.risks) || input.risks.length !== 5) {
        const count = Array.isArray(input.risks) ? input.risks.length : 'non-array'
        errors.push(`risks must contain exactly 5 items (received ${count}).`)
    } else {
        input.risks.forEach((riskValue, index) => {
            const field = `risks[${index}]`
            const risk = requireRecord(riskValue, field, errors)
            if (risk.riskNumber !== index + 1) {
                errors.push(`${field}.riskNumber must be ${index + 1}.`)
            }
            const category = requireEnum(
                risk.category,
                RISK_CATEGORIES,
                `${field}.category`,
                errors,
            )
            if (category) riskCategories.push(category)
            requireString(risk.riskName, `${field}.riskName`, errors)
            const level = requireEnum(
                risk.level,
                RISK_LEVELS,
                `${field}.level`,
                errors,
            )
            if (level) riskLevels.push(level)
            requireString(risk.whatItIs, `${field}.whatItIs`, errors)
            requireString(risk.whyItApplies, `${field}.whyItApplies`, errors)
            requireString(risk.ifIgnored, `${field}.ifIgnored`, errors)
            validateStringArray(risk.fixIt, `${field}.fixIt`, 3, errors)
        })
    }

    for (const category of RISK_CATEGORIES) {
        const count = riskCategories.filter((value) => value === category).length
        if (count !== 1) {
            errors.push(`risks must contain "${category}" exactly once (received ${count}).`)
        }
    }

    if (riskLevels.length === 5 && overallRating) {
        const highestLevel = RISK_LEVELS.find((level) => riskLevels.includes(level))
        if (highestLevel && overallRating !== highestLevel) {
            errors.push(
                `riskSummary.overallRating must equal the highest risk level "${highestLevel}".`,
            )
        }
    }

    if (!Array.isArray(input.regulatoryChecklist)) {
        errors.push('regulatoryChecklist must be an array.')
    } else {
        input.regulatoryChecklist.forEach((itemValue, index) => {
            const field = `regulatoryChecklist[${index}]`
            const item = requireRecord(itemValue, field, errors)
            const itemName = requireString(item.item, `${field}.item`, errors)
            const authority = requireString(
                item.authority,
                `${field}.authority`,
                errors,
            )
            requireEnum(
                item.applicability,
                REGULATORY_APPLICABILITY,
                `${field}.applicability`,
                errors,
            )
            const reason = requireString(item.reason, `${field}.reason`, errors)
            requireString(item.action, `${field}.action`, errors)
            validatePortal(item.portal, `${field}.portal`, errors)

            if (
                /\bPDPA\b|personal data protection/i.test(
                    `${itemName} ${reason}`,
                ) &&
                /\bMCMC\b/i.test(authority)
            ) {
                errors.push(
                    `${field}.authority must not contain MCMC for a PDPA / Personal Data Protection item.`,
                )
            }

            const isLocalAuthorityItem =
                /\b(local authority|local council|municipal|city council|premises licen[cs]e|business licen[cs]e)\b/i.test(
                    `${itemName} ${authority}`,
                )
            if (
                typeof options.city === 'string' &&
                options.city.trim().toLowerCase() === 'kuala lumpur' &&
                isLocalAuthorityItem &&
                /\b(MBPJ|MBSA|MBSJ)\b/i.test(authority)
            ) {
                errors.push(
                    `${field}.authority must not use MBPJ, MBSA, or MBSJ for a Kuala Lumpur local-authority item.`,
                )
            }
        })
    }

    if (!Array.isArray(input.nextActions) || input.nextActions.length !== 3) {
        const count = Array.isArray(input.nextActions)
            ? input.nextActions.length
            : 'non-array'
        errors.push(`nextActions must contain exactly 3 items (received ${count}).`)
    } else {
        input.nextActions.forEach((actionValue, index) => {
            const field = `nextActions[${index}]`
            const action = requireRecord(actionValue, field, errors)
            if (action.priority !== index + 1) {
                errors.push(`${field}.priority must be ${index + 1}.`)
            }
            requireString(action.action, `${field}.action`, errors)
            requireString(action.reason, `${field}.reason`, errors)
        })
    }

    requireString(input.disclaimer, 'disclaimer', errors)

    return { valid: errors.length === 0, errors }
}
