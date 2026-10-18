import { describe, expect, it } from 'vitest'
import { normaliseRevenuePlan } from './normaliseRevenuePlan.js'

/**
 * Regression fixture: the model returned a complete JSON document but added an
 * "adjustment" key, drifted the cost breakdowns in periods 2-4, and set
 * breakEvenMonth to 7 even though period 2 was already profitable.
 */
const fixture = {
    company: 'Kedai Kopi Sdn Bhd',
    industry: 'Food & Beverage',
    currentFunds: 50000,
    currency: 'MYR',
    assumptions: {
        industryGrowthRate: '5-8% per year',
        marketCondition: 'Moderately competitive with steady demand',
        monthlyBurnEstimate: 2917,
        mainCostDrivers: ['Coffee inventory', 'Staff wages', 'Rent & utilities'],
    },
    financialProjection: [
        {
            period: 'Months 1-3',
            estimatedCustomers: 80,
            estimatedPricePerCustomer: 25,
            averageMonthlyRevenue: 2000,
            projectedPeriodRevenue: 6000,
            projectedPeriodCost: 8751,
            estimatedPeriodCostBreakdown: {
                operations: 2188,
                marketing: 1313,
                inventory: 1750,
                staffing: 1750,
                technology: 438,
                contingency: 1312,
                adjustment: 0,
            },
            costExplanation:
                'Inventory and staffing are the largest cost drivers in the launch phase',
            netProfitLoss: -2751,
            status: 'Loss',
            explanation:
                'Typical startup loss due to initial setup costs and building customer base',
            suggestion:
                'Focus on high-margin specialty coffees and loyalty programs to increase average transaction value',
        },
        {
            period: 'Months 4-6',
            estimatedCustomers: 120,
            estimatedPricePerCustomer: 28,
            averageMonthlyRevenue: 3360,
            projectedPeriodRevenue: 10080,
            projectedPeriodCost: 9813,
            estimatedPeriodCostBreakdown: {
                operations: 2453,
                marketing: 1468,
                inventory: 1963,
                staffing: 1963,
                technology: 492,
                contingency: 1464,
                adjustment: 0,
            },
            costExplanation:
                'Inventory remains the largest cost driver as we scale operations',
            netProfitLoss: 267,
            status: 'Profit',
            explanation:
                'Break-even achieved as customer base grows and operational efficiencies kick in',
            suggestion:
                'Optimize inventory management to reduce waste and improve margin',
        },
        {
            period: 'Months 7-9',
            estimatedCustomers: 160,
            estimatedPricePerCustomer: 30,
            averageMonthlyRevenue: 4800,
            projectedPeriodRevenue: 14400,
            projectedPeriodCost: 11125,
            estimatedPeriodCostBreakdown: {
                operations: 2781,
                marketing: 1672,
                inventory: 2225,
                staffing: 2225,
                technology: 281,
                contingency: 1671,
                adjustment: 0,
            },
            costExplanation:
                'Staffing costs increase slightly to support higher volume operations',
            netProfitLoss: 3275,
            status: 'Profit',
            explanation:
                'Profit margin improves as scale benefits reduce per-unit costs',
            suggestion:
                'Introduce new premium coffee blends to further increase average transaction value',
        },
        {
            period: 'Months 10-12',
            estimatedCustomers: 200,
            estimatedPricePerCustomer: 32,
            averageMonthlyRevenue: 6400,
            projectedPeriodRevenue: 19200,
            projectedPeriodCost: 12750,
            estimatedPeriodCostBreakdown: {
                operations: 3188,
                marketing: 1906,
                inventory: 2550,
                staffing: 2550,
                technology: 319,
                contingency: 1906,
                adjustment: 0,
            },
            costExplanation:
                'Marketing spend increases to support expansion to new locations',
            netProfitLoss: 6450,
            status: 'Profit',
            explanation:
                'Strong profitability achieved with improved margins and operational efficiency',
            suggestion:
                'Reinvest profits into staff training and new product development',
        },
    ],
    breakEvenMonth: 7,
    estimatedYearEndProfitMargin: 33.6,
    milestones: [
        { month: 3, achievement: 'Reach 80 paying customers and RM 2,000 monthly revenue' },
        { month: 6, achievement: 'Achieve break-even with RM 3,360 monthly revenue' },
        { month: 9, achievement: 'Reach 160 customers and RM 4,800 monthly revenue' },
    ],
    risks: [
        'Competition from established coffee chains',
        'Fluctuation in coffee bean prices',
        'Staff turnover in the food service industry',
    ],
    actionSteps: [
        'Implement customer loyalty program to increase repeat business',
        'Optimize coffee sourcing to lock in stable prices',
        'Develop staff training program to reduce turnover',
    ],
}

describe('normaliseRevenuePlan', () => {
    const { plan, repairs } = normaliseRevenuePlan(fixture)

    it('keeps exactly four periods', () => {
        expect(plan.financialProjection).toHaveLength(4)
    })

    it('makes every cost breakdown sum to projectedPeriodCost', () => {
        for (const period of plan.financialProjection) {
            const sum = Object.values(period.estimatedPeriodCostBreakdown).reduce(
                (total, value) => total + value,
                0,
            )
            expect(sum).toBe(period.projectedPeriodCost)
        }
    })

    it('repairs the known cost drifts on the largest line', () => {
        expect(plan.financialProjection[0].estimatedPeriodCostBreakdown.operations).toBe(2188)

        expect(plan.financialProjection[1].projectedPeriodCost).toBe(9813)
        expect(plan.financialProjection[1].estimatedPeriodCostBreakdown.operations).toBe(2463)

        expect(plan.financialProjection[2].projectedPeriodCost).toBe(11125)
        expect(plan.financialProjection[2].estimatedPeriodCostBreakdown.operations).toBe(3051)

        expect(plan.financialProjection[3].projectedPeriodCost).toBe(12750)
        expect(plan.financialProjection[3].estimatedPeriodCostBreakdown.operations).toBe(3519)
    })

    it('removes the invented adjustment key', () => {
        for (const period of plan.financialProjection) {
            expect(period.estimatedPeriodCostBreakdown).not.toHaveProperty('adjustment')
        }
    })

    it('fixes break-even to the first profitable period', () => {
        expect(plan.breakEvenMonth).toBe(6)
    })

    it('recomputes revenue, net profit and status consistently', () => {
        const first = plan.financialProjection[0]
        expect(first.projectedPeriodRevenue).toBe(6000)
        expect(first.netProfitLoss).toBe(-2751)
        expect(first.status).toBe('Loss')

        const second = plan.financialProjection[1]
        expect(second.projectedPeriodRevenue).toBe(10080)
        expect(second.netProfitLoss).toBe(267)
        expect(second.status).toBe('Profit')

        const fourth = plan.financialProjection[3]
        expect(fourth.projectedPeriodRevenue).toBe(19200)
        expect(fourth.netProfitLoss).toBe(6450)
        expect(fourth.status).toBe('Profit')
    })

    it('keeps the year-end margin', () => {
        expect(plan.estimatedYearEndProfitMargin).toBe(33.6)
    })

    it('keeps monthly burn derived from period 1', () => {
        expect(plan.assumptions.monthlyBurnEstimate).toBe(2917)
    })

    it('names the actual largest cost line in every period', () => {
        for (const period of plan.financialProjection) {
            expect(period.costExplanation.toLowerCase()).toContain('operations')
        }
    })

    it('keeps the expected collection sizes', () => {
        expect(plan.milestones).toHaveLength(3)
        expect(plan.risks).toHaveLength(3)
        expect(plan.actionSteps).toHaveLength(3)
    })

    it('reports the repairs it made', () => {
        expect(repairs.some((repair) => repair.includes('adjusted Operations'))).toBe(true)
        expect(repairs.some((repair) => repair.includes('breakEvenMonth corrected'))).toBe(true)
        expect(repairs.some((repair) => repair.includes('unknown cost keys'))).toBe(true)
        expect(repairs.some((repair) => repair.includes('costExplanation'))).toBe(true)
    })
})

describe('normaliseRevenuePlan goal consistency', () => {
    it('corrects a Period 4 claim that the goal was reached', () => {
        const goalFixture = JSON.parse(JSON.stringify(fixture)) as typeof fixture
        goalFixture.financialProjection[3].explanation =
            'Reaches target of RM15,000 monthly revenue (RM6,400 average monthly revenue) with healthy profit margins'

        const { plan, repairs } = normaliseRevenuePlan(goalFixture, {
            goal: 'Reach RM 15,000 monthly revenue within 12 months',
        })

        expect(plan.financialProjection[3].explanation).toContain('below the stated goal')
        expect(plan.financialProjection[3].explanation).toContain('15,000')
        expect(repairs.some((repair) => repair.includes('below the goal'))).toBe(true)
    })

    it('leaves an honest below-goal explanation alone', () => {
        const goalFixture = JSON.parse(JSON.stringify(fixture)) as typeof fixture
        goalFixture.financialProjection[3].explanation =
            'Period 4 reaches RM 6,400 average monthly revenue, below the stated goal of RM 15,000.'

        const { plan, repairs } = normaliseRevenuePlan(goalFixture, {
            goal: 'Reach RM 15,000 monthly revenue within 12 months',
        })

        expect(plan.financialProjection[3].explanation).toContain('below the stated goal')
        expect(repairs.some((repair) => repair.includes('below the goal'))).toBe(false)
    })
})
