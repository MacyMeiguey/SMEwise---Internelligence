/**
 * normaliseRevenuePlan — repair Revenue Projection JSON before it reaches the UI.
 *
 * The model is good at narrative but unreliable at arithmetic. This module
 * enforces the contract consumed by RevenueProjectionWidget:
 *
 *   - exactly 4 periods
 *   - averageMonthlyRevenue = estimatedCustomers × estimatedPricePerCustomer
 *   - projectedPeriodRevenue = averageMonthlyRevenue × 3
 *   - the six cost lines sum to projectedPeriodCost
 *   - netProfitLoss = projectedPeriodRevenue − projectedPeriodCost
 *   - status matches the sign of netProfitLoss
 *   - breakEvenMonth falls inside the first profitable period
 *   - estimatedYearEndProfitMargin is derived from Period 4
 *
 * It also strips unknown keys (for example the model's invented "adjustment"
 * key) and rewrites a costExplanation that names the wrong largest category.
 *
 * Structural problems throw SyntaxError so the route's existing retry loop
 * can ask the model for a fresh response. Arithmetic drift is repaired here
 * without spending another model call.
 */

const COST_KEYS = [
    'operations',
    'marketing',
    'inventory',
    'staffing',
    'technology',
    'contingency',
] as const

type CostKey = (typeof COST_KEYS)[number]

const COST_LABELS: Record<CostKey, string> = {
    operations: 'Operations',
    marketing: 'Marketing',
    inventory: 'Inventory',
    staffing: 'Staffing',
    technology: 'Technology',
    contingency: 'Contingency',
}

const TOP_LEVEL_KEYS = [
    'company',
    'industry',
    'currentFunds',
    'currency',
    'assumptions',
    'financialProjection',
    'breakEvenMonth',
    'estimatedYearEndProfitMargin',
    'milestones',
    'risks',
    'actionSteps',
] as const

export interface RevenuePeriod {
    period: string
    estimatedCustomers: number
    estimatedPricePerCustomer: number
    averageMonthlyRevenue: number
    projectedPeriodRevenue: number
    projectedPeriodCost: number
    estimatedPeriodCostBreakdown: Record<CostKey, number>
    costExplanation: string
    netProfitLoss: number
    status: 'Profit' | 'Loss' | 'Break-even'
    explanation: string
    suggestion: string
}

export interface RevenueProjectionPlan {
    company: string
    industry: string
    currentFunds: number
    currency: string
    assumptions: {
        industryGrowthRate: string
        marketCondition: string
        monthlyBurnEstimate: number
        mainCostDrivers: string[]
    }
    financialProjection: RevenuePeriod[]
    breakEvenMonth: number
    estimatedYearEndProfitMargin: number
    milestones: { month: number; achievement: string }[]
    risks: string[]
    actionSteps: string[]
}

export interface NormaliseRevenueResult {
    plan: RevenueProjectionPlan
    repairs: string[]
}

export interface NormaliseRevenueOptions {
    /**
     * The user's free-text Business Goal. Used to fact-check Period 4 claims
     * such as "reaches the RM 15,000 target" when the projection is below it.
     */
    goal?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Coerce numbers that may arrive as "RM 12,500" or "12500.50".
 * Returns the fallback when the value cannot be parsed.
 */
function num(value: unknown, fallback = 0): number {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : fallback
    }
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.-]/g, '')
        const parsed = Number(cleaned)
        return Number.isFinite(parsed) ? parsed : fallback
    }
    return fallback
}

function text(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : fallback
}

function textArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
}

function roundMoney(value: number): number {
    return Math.round(value)
}

function roundOneDecimal(value: number): number {
    return Math.round(value * 10) / 10
}

function statusFor(net: number): RevenuePeriod['status'] {
    if (net > 0) return 'Profit'
    if (net < 0) return 'Loss'
    return 'Break-even'
}

/** Deterministic largest cost line; ties resolve to the first key. */
function largestCostKey(breakdown: Record<CostKey, number>): CostKey {
    return COST_KEYS.reduce(
        (largest, key) => (breakdown[key] > breakdown[largest] ? key : largest),
        COST_KEYS[0],
    )
}

function secondLargestCostKey(
    breakdown: Record<CostKey, number>,
    largest: CostKey,
): CostKey {
    const candidates = COST_KEYS.filter((key) => key !== largest)
    return candidates.reduce(
        (second, key) => (breakdown[key] > breakdown[second] ? key : second),
        candidates[0]!,
    )
}

function formatRM(value: number): string {
    return value.toLocaleString('en-MY')
}

/**
 * Pull a monthly RM target out of a free-text goal such as
 * "Reach RM 15,000 monthly revenue within 12 months".
 * Returns null when the goal has no usable amount.
 */
function parseMonthlyGoal(goal?: string): number | null {
    if (!goal) return null

    const monthly = goal.match(
        /(?:RM|MYR)\s*([\d,]+(?:\.\d+)?)\s*(?:per month|\/month|monthly|a month)/i,
    )
    const amount = monthly ?? goal.match(/(?:RM|MYR)\s*([\d,]+(?:\.\d+)?)/i)
    if (!amount) return null

    const value = Number(amount[1].replace(/,/g, ''))
    return Number.isFinite(value) && value > 0 ? value : null
}

/**
 * True when the sentence claims a target was reached/exceeded.
 * Kept deliberately narrow so an honest "below the goal" sentence is left alone.
 */
function claimsGoalReached(explanation: string): boolean {
    const verb =
        '(reach|reaches|reached|exceed|exceeds|exceeded|achiev|achieves|achieved|hit|hits|meet|meets|met)'
    const noun = '(target|goal)'
    return (
        new RegExp(`${verb}[\\s\\S]{0,40}${noun}`, 'i').test(explanation) ||
        new RegExp(`${noun}[\\s\\S]{0,40}${verb}`, 'i').test(explanation)
    )
}

export function normaliseRevenuePlan(
    input: unknown,
    options: NormaliseRevenueOptions = {},
): NormaliseRevenueResult {
    if (!isRecord(input)) {
        throw new SyntaxError('Revenue projection response was not a JSON object.')
    }

    const raw = input
    const repairs: string[] = []

    const rawPeriods = raw.financialProjection
    if (!Array.isArray(rawPeriods) || rawPeriods.length !== 4) {
        throw new SyntaxError(
            'Revenue projection must contain exactly 4 financialProjection periods.',
        )
    }

    const unknownTopKeys = Object.keys(raw).filter(
        (key) => !(TOP_LEVEL_KEYS as readonly string[]).includes(key),
    )
    if (unknownTopKeys.length > 0) {
        repairs.push(`Removed unknown top-level keys (${unknownTopKeys.join(', ')}).`)
    }

    const periods: RevenuePeriod[] = rawPeriods.map((value, index) => {
        if (!isRecord(value)) {
            throw new SyntaxError(
                `Revenue projection period ${index + 1} is not an object.`,
            )
        }

        const period = value
        const label = text(period.period, `Months ${index * 3 + 1}-${index * 3 + 3}`)

        const customers = Math.max(0, Math.round(num(period.estimatedCustomers)))
        const price = Math.max(
            0,
            Math.round(num(period.estimatedPricePerCustomer) * 100) / 100,
        )
        const averageMonthlyRevenue = roundMoney(customers * price)
        const projectedPeriodRevenue = averageMonthlyRevenue * 3

        if (num(period.averageMonthlyRevenue, -1) !== averageMonthlyRevenue) {
            repairs.push(
                `${label}: recomputed averageMonthlyRevenue as ${formatRM(averageMonthlyRevenue)}.`,
            )
        }
        if (num(period.projectedPeriodRevenue, -1) !== projectedPeriodRevenue) {
            repairs.push(
                `${label}: recomputed projectedPeriodRevenue as ${formatRM(projectedPeriodRevenue)}.`,
            )
        }

        const rawBreakdown = isRecord(period.estimatedPeriodCostBreakdown)
            ? period.estimatedPeriodCostBreakdown
            : {}

        const unknownCostKeys = Object.keys(rawBreakdown).filter(
            (key) => !(COST_KEYS as readonly string[]).includes(key),
        )
        if (unknownCostKeys.length > 0) {
            repairs.push(
                `${label}: removed unknown cost keys (${unknownCostKeys.join(', ')}).`,
            )
        }

        const breakdown = {} as Record<CostKey, number>
        for (const key of COST_KEYS) {
            breakdown[key] = Math.max(0, roundMoney(num(rawBreakdown[key])))
        }

        const rawCost = num(period.projectedPeriodCost, -1)
        let projectedPeriodCost = rawCost >= 0 ? roundMoney(rawCost) : 0
        let costSum = COST_KEYS.reduce((sum, key) => sum + breakdown[key], 0)

        if (projectedPeriodCost <= 0) {
            projectedPeriodCost = costSum
            repairs.push(
                `${label}: computed projectedPeriodCost from the cost lines (${formatRM(costSum)}).`,
            )
        }

        const difference = projectedPeriodCost - costSum
        if (difference !== 0) {
            const largest = largestCostKey(breakdown)
            const adjusted = breakdown[largest] + difference

            if (adjusted >= 0) {
                breakdown[largest] = adjusted
                repairs.push(
                    `${label}: adjusted ${COST_LABELS[largest]} by ` +
                        `${difference > 0 ? '+' : ''}${formatRM(difference)} to match ` +
                        `projectedPeriodCost (${formatRM(costSum)} → ${formatRM(projectedPeriodCost)}).`,
                )
            } else {
                // The requested total is smaller than the other lines combined.
                // Trust the lines and recompute the total instead.
                projectedPeriodCost = costSum
                repairs.push(
                    `${label}: cost lines exceeded projectedPeriodCost; ` +
                        `recomputed total as ${formatRM(costSum)}.`,
                )
            }

            // Fix any one-ringgit drift left by rounding.
            costSum = COST_KEYS.reduce((sum, key) => sum + breakdown[key], 0)
            const remainder = projectedPeriodCost - costSum
            if (remainder !== 0) {
                const largest = largestCostKey(breakdown)
                breakdown[largest] = Math.max(0, breakdown[largest] + remainder)
            }
        }

        const netProfitLoss = projectedPeriodRevenue - projectedPeriodCost
        const status = statusFor(netProfitLoss)

        const rawStatus = text(period.status, 'missing')
        if (rawStatus !== status) {
            repairs.push(
                `${label}: corrected status from "${rawStatus}" to "${status}".`,
            )
        }
        if (num(period.netProfitLoss, -1) !== netProfitLoss) {
            repairs.push(
                `${label}: recomputed netProfitLoss as ${formatRM(netProfitLoss)}.`,
            )
        }

        const largest = largestCostKey(breakdown)
        const second = secondLargestCostKey(breakdown, largest)
        const rawExplanation = text(period.costExplanation)
        const mentionsLargest = rawExplanation
            .toLowerCase()
            .includes(COST_LABELS[largest].toLowerCase())

        const costExplanation = mentionsLargest
            ? rawExplanation
            : `${COST_LABELS[largest]} is the largest cost line at RM ` +
              `${formatRM(breakdown[largest])}, followed by ${COST_LABELS[second]} ` +
              `at RM ${formatRM(breakdown[second])}.`

        if (!mentionsLargest && rawExplanation.length > 0) {
            repairs.push(
                `${label}: corrected costExplanation to name ` +
                    `${COST_LABELS[largest]} as the largest line.`,
            )
        }

        return {
            period: label,
            estimatedCustomers: customers,
            estimatedPricePerCustomer: price,
            averageMonthlyRevenue,
            projectedPeriodRevenue,
            projectedPeriodCost,
            estimatedPeriodCostBreakdown: breakdown,
            costExplanation,
            netProfitLoss,
            status,
            explanation: text(period.explanation),
            suggestion: text(period.suggestion),
        }
    })

    const rawAssumptions = isRecord(raw.assumptions) ? raw.assumptions : {}
    const monthlyBurnEstimate = roundMoney(periods[0].projectedPeriodCost / 3)

    if (num(rawAssumptions.monthlyBurnEstimate, -1) !== monthlyBurnEstimate) {
        repairs.push(
            `Recomputed monthlyBurnEstimate as ${formatRM(monthlyBurnEstimate)}.`,
        )
    }

    const assumptions = {
        industryGrowthRate: text(rawAssumptions.industryGrowthRate),
        marketCondition: text(rawAssumptions.marketCondition),
        monthlyBurnEstimate,
        mainCostDrivers: textArray(rawAssumptions.mainCostDrivers),
    }

    const firstProfitableIndex = periods.findIndex(
        (period) => period.netProfitLoss >= 0,
    )
    const periodStart = firstProfitableIndex * 3 + 1
    const periodEnd = (firstProfitableIndex + 1) * 3
    const rawBreakEvenMonth = Math.round(num(raw.breakEvenMonth, periodEnd))
    const breakEvenMonth =
        firstProfitableIndex === -1
            ? 12
            : rawBreakEvenMonth >= periodStart && rawBreakEvenMonth <= periodEnd
              ? rawBreakEvenMonth
              : periodEnd

    if (rawBreakEvenMonth !== breakEvenMonth) {
        repairs.push(
            `breakEvenMonth corrected from ${rawBreakEvenMonth} to ${breakEvenMonth}.`,
        )
    }

    const finalPeriod = periods[3]
    const estimatedYearEndProfitMargin =
        finalPeriod.projectedPeriodRevenue > 0
            ? roundOneDecimal(
                  (finalPeriod.netProfitLoss / finalPeriod.projectedPeriodRevenue) * 100,
              )
            : 0

    const rawMargin = num(raw.estimatedYearEndProfitMargin, Number.NaN)
    if (
        !Number.isFinite(rawMargin) ||
        Math.abs(rawMargin - estimatedYearEndProfitMargin) > 0.05
    ) {
        repairs.push(
            `Recomputed estimatedYearEndProfitMargin as ${estimatedYearEndProfitMargin}%.`,
        )
    }

    const milestones = Array.isArray(raw.milestones)
        ? raw.milestones
              .filter((item): item is Record<string, unknown> => isRecord(item))
              .map((item) => ({
                  month: Math.round(num(item.month)),
                  achievement: text(item.achievement),
              }))
              .filter(
                  (item) =>
                      item.month >= 1 &&
                      item.month <= 12 &&
                      item.achievement.length > 0,
              )
        : []

    if (milestones.length !== 3) {
        repairs.push(`Expected 3 milestones, received ${milestones.length}.`)
    }

    const risks = textArray(raw.risks)
    const actionSteps = textArray(raw.actionSteps)

    if (risks.length !== 3) {
        repairs.push(`Expected 3 risks, received ${risks.length}.`)
    }
    if (actionSteps.length !== 3) {
        repairs.push(`Expected 3 action steps, received ${actionSteps.length}.`)
    }

    const goalMonthlyRevenue = parseMonthlyGoal(options.goal)
    if (goalMonthlyRevenue !== null) {
        const finalPeriod = periods[3]
        const deniesReached = /\b(not|below|short|miss|missed|fall short)\b/i.test(
            finalPeriod.explanation,
        )

        if (
            finalPeriod.averageMonthlyRevenue < goalMonthlyRevenue &&
            claimsGoalReached(finalPeriod.explanation) &&
            !deniesReached
        ) {
            const shortfall = goalMonthlyRevenue - finalPeriod.averageMonthlyRevenue
            finalPeriod.explanation =
                `Period 4 reaches RM ${formatRM(finalPeriod.averageMonthlyRevenue)} average monthly revenue, ` +
                `which is RM ${formatRM(shortfall)} below the stated goal of RM ${formatRM(goalMonthlyRevenue)} per month.`
            repairs.push(
                `Period 4: corrected the explanation because RM ${formatRM(finalPeriod.averageMonthlyRevenue)} ` +
                    `is below the goal of RM ${formatRM(goalMonthlyRevenue)} per month.`,
            )
        }
    }

    const plan: RevenueProjectionPlan = {
        company: text(raw.company),
        industry: text(raw.industry),
        currentFunds: roundMoney(num(raw.currentFunds)),
        currency: text(raw.currency, 'MYR'),
        assumptions,
        financialProjection: periods,
        breakEvenMonth,
        estimatedYearEndProfitMargin,
        milestones,
        risks,
        actionSteps,
    }

    return { plan, repairs }
}
