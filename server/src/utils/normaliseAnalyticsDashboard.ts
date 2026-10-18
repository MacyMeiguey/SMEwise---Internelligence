/**
 * normaliseAnalyticsDashboard — repair the Analytics Dashboard JSON before it
 * reaches the UI.
 *
 * The model is good at plausible narrative but unreliable at 12-month totals,
 * expense percentages, cumulative break-even, and cash runway. This module
 * enforces the contract consumed by AnalyticsDashboardWidget:
 *
 *   - exactly 12 monthly revenue entries
 *   - revenue.total = sum(monthly.value)
 *   - 4-6 expense categories; total = sum(values); percentages sum to 100
 *   - projections.yearEnd.revenue = revenue.total
 *   - next-quarter growth is derived from the last quarter
 *   - formulaic KPIs are recomputed
 *   - companyName and generatedAt come from the request / server clock
 *
 * Structural problems throw SyntaxError so the route's retry loop asks the
 * harness for a fresh response. Arithmetic drift is repaired here without
 * spending another model call.
 */

const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const

export interface MonthlyRevenue {
    month: string
    value: number
}

export interface ExpenseBreakdown {
    category: string
    value: number
    percentage: number
}

export interface KPI {
    label: string
    value: string
    trend: 'up' | 'down' | 'stable'
    change: string
}

export interface Projections {
    nextQuarter: {
        revenue: number
        growth: number
    }
    yearEnd: {
        revenue: number
        growth: number
    }
}

export interface AnalyticsDashboardData {
    companyName: string
    generatedAt: string
    revenue: {
        monthly: MonthlyRevenue[]
        total: number
        growth: number
    }
    expenses: {
        breakdown: ExpenseBreakdown[]
        total: number
    }
    kpis: KPI[]
    projections: Projections
}

export interface NormaliseAnalyticsOptions {
    companyName: string
    currentFunds: number
    /** Injectable clock for deterministic tests. */
    now?: Date
}

export interface NormaliseAnalyticsResult {
    data: AnalyticsDashboardData
    repairs: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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

function roundMoney(value: number): number {
    return Math.round(value)
}

function roundOne(value: number): number {
    return Math.round(value * 10) / 10
}

function formatRM(value: number): string {
    return value.toLocaleString('en-MY')
}

function normaliseTrend(value: unknown): KPI['trend'] {
    const trend = typeof value === 'string' ? value.toLowerCase() : ''
    if (trend === 'up' || trend === 'down' || trend === 'stable') {
        return trend
    }
    return 'stable'
}

function findCategory(
    breakdown: ExpenseBreakdown[],
    pattern: RegExp,
): ExpenseBreakdown | undefined {
    return breakdown.find((item) => pattern.test(item.category))
}

function normaliseExpenses(value: unknown): {
    breakdown: ExpenseBreakdown[]
    total: number
    repairs: string[]
} {
    if (!Array.isArray(value) || value.length === 0) {
        throw new SyntaxError(
            'expenses.breakdown must be a non-empty array.',
        )
    }

    const items = value.map((item, index) => {
        if (!isRecord(item)) {
            throw new SyntaxError(
                `expenses.breakdown[${index}] must be an object.`,
            )
        }
        return {
            category: text(item.category, `Category ${index + 1}`),
            value: Math.max(0, roundMoney(num(item.value))),
        }
    })

    if (items.length < 4) {
        throw new SyntaxError(
            `expenses.breakdown must contain at least 4 categories ` +
                `(received ${items.length}).`,
        )
    }

    const repairs: string[] = []
    let merged = items

    if (items.length > 6) {
        const topIndices = new Set(
            items
                .map((item, index) => ({ item, index }))
                .sort((a, b) => b.item.value - a.item.value)
                .slice(0, 5)
                .map((entry) => entry.index),
        )

        const top = items.filter((_, index) => topIndices.has(index))
        const otherValue = items
            .filter((_, index) => !topIndices.has(index))
            .reduce((sum, item) => sum + item.value, 0)

        merged = [...top, { category: 'Other', value: otherValue }]
        repairs.push(
            `Merged ${items.length - 5} smaller expense categories into "Other".`,
        )
    }

    const total = merged.reduce((sum, item) => sum + item.value, 0)
    if (total <= 0) {
        throw new SyntaxError(
            'expenses.breakdown total must be greater than zero.',
        )
    }

    const breakdown: ExpenseBreakdown[] = merged.map((item) => ({
        category: item.category,
        value: item.value,
        percentage: roundOne((item.value / total) * 100),
    }))

    const percentageSum = breakdown.reduce(
        (sum, item) => sum + item.percentage,
        0,
    )
    const difference = roundOne(100 - percentageSum)

    if (difference !== 0) {
        const largestIndex = breakdown.reduce(
            (largest, item, index) =>
                item.value > breakdown[largest].value ? index : largest,
            0,
        )
        breakdown[largestIndex].percentage = roundOne(
            breakdown[largestIndex].percentage + difference,
        )
        repairs.push(
            `Adjusted expense percentages by ` +
                `${difference > 0 ? '+' : ''}${difference} to sum to 100.`,
        )
    }

    return { breakdown, total, repairs }
}

function normaliseProjections(
    value: unknown,
    monthly: MonthlyRevenue[],
    revenueTotal: number,
    repairs: string[],
): Projections {
    const raw = isRecord(value) ? value : {}
    const rawNext = isRecord(raw.nextQuarter) ? raw.nextQuarter : {}
    const rawYear = isRecord(raw.yearEnd) ? raw.yearEnd : {}

    const lastQuarter = monthly
        .slice(9, 12)
        .reduce((sum, month) => sum + month.value, 0)

    let nextRevenue = Math.max(0, roundMoney(num(rawNext.revenue)))
    if (lastQuarter > 0 && nextRevenue <= lastQuarter) {
        nextRevenue = Math.round(lastQuarter * 1.1)
        repairs.push(
            `Next-quarter revenue raised to ${formatRM(nextRevenue)} ` +
                'to keep growth positive.',
        )
    }

    const nextGrowth =
        lastQuarter > 0
            ? roundOne(((nextRevenue - lastQuarter) / lastQuarter) * 100)
            : 0

    const rawNextGrowth = roundOne(num(rawNext.growth))
    if (Math.abs(rawNextGrowth - nextGrowth) > 0.05) {
        repairs.push(
            `Next-quarter growth recomputed as ${nextGrowth}%.`,
        )
    }

    const yearRevenue = revenueTotal
    if (roundMoney(num(rawYear.revenue, -1)) !== yearRevenue) {
        repairs.push(
            `Year-end revenue set to ${formatRM(yearRevenue)} ` +
                'to match revenue.total.',
        )
    }

    const yearGrowth = Math.max(0, roundOne(num(rawYear.growth)))

    return {
        nextQuarter: { revenue: nextRevenue, growth: nextGrowth },
        yearEnd: { revenue: yearRevenue, growth: yearGrowth },
    }
}

function computeBreakEvenMonth(
    monthly: MonthlyRevenue[],
    averageMonthlyExpenses: number,
): number | null {
    if (averageMonthlyExpenses <= 0) return null

    let cumulativeRevenue = 0
    for (let index = 0; index < monthly.length; index++) {
        cumulativeRevenue += monthly[index].value
        if (cumulativeRevenue >= averageMonthlyExpenses * (index + 1)) {
            return index + 1
        }
    }

    return null
}

export function normaliseAnalyticsDashboard(
    input: unknown,
    options: NormaliseAnalyticsOptions,
): NormaliseAnalyticsResult {
    if (!isRecord(input)) {
        throw new SyntaxError(
            'Analytics dashboard response was not a JSON object.',
        )
    }

    const raw = input
    const repairs: string[] = []

    const rawRevenue = isRecord(raw.revenue) ? raw.revenue : null
    if (!rawRevenue) {
        throw new SyntaxError('revenue must be an object.')
    }

    const rawMonthly = rawRevenue.monthly
    if (!Array.isArray(rawMonthly) || rawMonthly.length !== 12) {
        const count = Array.isArray(rawMonthly)
            ? rawMonthly.length
            : 'non-array'
        throw new SyntaxError(
            `revenue.monthly must contain exactly 12 entries ` +
                `(received ${count}).`,
        )
    }

    const monthly: MonthlyRevenue[] = rawMonthly.map((item, index) => {
        if (!isRecord(item)) {
            throw new SyntaxError(
                `revenue.monthly[${index}] must be an object.`,
            )
        }
        return {
            month: MONTHS[index],
            value: Math.max(0, roundMoney(num(item.value))),
        }
    })

    const revenueTotal = monthly.reduce(
        (sum, month) => sum + month.value,
        0,
    )
    if (roundMoney(num(rawRevenue.total, -1)) !== revenueTotal) {
        repairs.push(
            `Revenue total recomputed as ${formatRM(revenueTotal)}.`,
        )
    }

    const revenueGrowth = Math.max(0, roundOne(num(rawRevenue.growth)))

    const rawExpenses = isRecord(raw.expenses) ? raw.expenses : null
    if (!rawExpenses) {
        throw new SyntaxError('expenses must be an object.')
    }

    const {
        breakdown,
        total: expensesTotal,
        repairs: expenseRepairs,
    } = normaliseExpenses(rawExpenses.breakdown)
    repairs.push(...expenseRepairs)

    if (roundMoney(num(rawExpenses.total, -1)) !== expensesTotal) {
        repairs.push(
            `Expense total recomputed as ${formatRM(expensesTotal)}.`,
        )
    }

    const rawKpis = raw.kpis
    if (!Array.isArray(rawKpis) || rawKpis.length < 4) {
        throw new SyntaxError('kpis must contain at least 4 items.')
    }
    if (rawKpis.length > 6) {
        repairs.push(`Trimmed KPIs from ${rawKpis.length} to 6.`)
    }

    const kpis: KPI[] = rawKpis.slice(0, 6).map((item, index) => {
        if (!isRecord(item)) {
            throw new SyntaxError(`kpis[${index}] must be an object.`)
        }
        return {
            label: text(item.label, `KPI ${index + 1}`),
            value: text(item.value),
            trend: normaliseTrend(item.trend),
            change: text(item.change, '-'),
        }
    })

    const projections = normaliseProjections(
        raw.projections,
        monthly,
        revenueTotal,
        repairs,
    )

    const averageMonthlyExpenses = expensesTotal / 12
    const breakEvenMonth = computeBreakEvenMonth(
        monthly,
        averageMonthlyExpenses,
    )
    const cashRunway =
        averageMonthlyExpenses > 0
            ? roundOne(options.currentFunds / averageMonthlyExpenses)
            : 0

    const cogs =
        findCategory(
            breakdown,
            /inventory|cost of goods|cogs|direct cost|materials/i,
        ) ?? findCategory(breakdown, /staff/i)

    for (const kpi of kpis) {
        if (/monthly revenue/i.test(kpi.label)) {
            const value = Math.round(revenueTotal / 12)
            kpi.value = `RM ${formatRM(value)}`
            repairs.push(
                `Monthly Revenue KPI recomputed as RM ${formatRM(value)}.`,
            )
        } else if (/gross margin/i.test(kpi.label)) {
            if (cogs && revenueTotal > 0) {
                const margin = roundOne(
                    ((revenueTotal - cogs.value) / revenueTotal) * 100,
                )
                kpi.value = `${margin}%`
                repairs.push(
                    `Gross Margin KPI recomputed as ${margin}%.`,
                )
            }
        } else if (/break[\s-]*even/i.test(kpi.label)) {
            if (breakEvenMonth === null) {
                kpi.value = 'Not within 12 months'
                kpi.trend = 'down'
            } else {
                kpi.value = `Month ${breakEvenMonth}`
            }
            repairs.push(
                `Break-even Month KPI recomputed as ${kpi.value}.`,
            )
        } else if (/cash runway/i.test(kpi.label)) {
            if (averageMonthlyExpenses > 0) {
                kpi.value = `${cashRunway} months`
                repairs.push(
                    `Cash Runway KPI recomputed as ${cashRunway} months.`,
                )
            }
        }
    }

    const data: AnalyticsDashboardData = {
        companyName: options.companyName,
        generatedAt: (options.now ?? new Date()).toISOString(),
        revenue: {
            monthly,
            total: revenueTotal,
            growth: revenueGrowth,
        },
        expenses: {
            breakdown,
            total: expensesTotal,
        },
        kpis,
        projections,
    }

    return { data, repairs }
}
