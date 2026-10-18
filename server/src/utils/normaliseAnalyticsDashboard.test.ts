import { describe, expect, it } from 'vitest'
import { normaliseAnalyticsDashboard } from './normaliseAnalyticsDashboard.js'

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
]

function monthly(values: number[]) {
    return MONTHS.map((month, index) => ({
        month,
        value: values[index],
    }))
}

function kpis() {
    return [
        {
            label: 'Monthly Revenue',
            value: 'RM 4,350',
            trend: 'up',
            change: '+38.5% vs last month',
        },
        {
            label: 'Gross Margin',
            value: '58%',
            trend: 'up',
            change: '+4.2% vs last quarter',
        },
        {
            label: 'Repeat Customer Rate',
            value: '42%',
            trend: 'up',
            change: '+8.0% vs last month',
        },
        {
            label: 'Customer Acquisition Cost',
            value: 'RM 18.50',
            trend: 'down',
            change: '-12.3% vs last month',
        },
        {
            label: 'Break-even Month',
            value: 'Month 4',
            trend: 'stable',
            change: '-',
        },
        {
            label: 'Cash Runway',
            value: '6 months',
            trend: 'stable',
            change: '-',
        },
    ]
}

function coolMeiFixture() {
    return {
        revenue: {
            monthly: monthly([
                800, 1200, 1800, 2400, 3200, 4000, 5000, 5500, 6000,
                6500, 7000, 8000,
            ]),
            total: 52200,
            growth: 62.5,
        },
        expenses: {
            breakdown: [
                { category: 'Inventory (Tea & Ingredients)', value: 12000, percentage: 29.0 },
                { category: 'Rent & Utilities', value: 6000, percentage: 14.5 },
                { category: 'Staff Costs', value: 8000, percentage: 19.3 },
                { category: 'Marketing', value: 5000, percentage: 12.1 },
                { category: 'Technology & Software', value: 2500, percentage: 6.0 },
                { category: 'Licences & Compliance', value: 1500, percentage: 3.6 },
                { category: 'Contingency', value: 3200, percentage: 7.7 },
            ],
            total: 41400,
        },
        kpis: kpis(),
        projections: {
            nextQuarter: { revenue: 15000, growth: 28.8 },
            yearEnd: { revenue: 52200, growth: 62.5 },
        },
    }
}

function apexFixture() {
    return {
        revenue: {
            monthly: monthly([
                85000, 92000, 98000, 105000, 112000, 118000, 125000,
                132000, 140000, 148000, 155000, 165000,
            ]),
            total: 1478000,
            growth: 21.7,
        },
        expenses: {
            breakdown: [
                { category: 'Staff Costs', value: 450000, percentage: 30.5 },
                { category: ' Rent & Utilities', value: 120000, percentage: 8.1 },
                { category: 'Marketing', value: 180000, percentage: 12.2 },
                { category: 'Technology & Software', value: 95000, percentage: 6.4 },
                { category: 'Travel & Client Expenses', value: 85000, percentage: 5.8 },
                { category: 'Licences & Compliance', value: 45000, percentage: 3.0 },
                { category: 'Contingency', value: 103000, percentage: 7.0 },
                { category: 'Office Supplies & Admin', value: 70000, percentage: 4.7 },
                { category: 'Training & Development', value: 55000, percentage: 3.7 },
            ],
            total: 1473000,
        },
        kpis: [
            {
                label: 'Monthly Revenue',
                value: 'RM 123,167',
                trend: 'up',
                change: '+4.8% vs last month',
            },
            {
                label: 'Gross Margin',
                value: '71%',
                trend: 'up',
                change: '+1.2% vs last quarter',
            },
            {
                label: 'Client Retention Rate',
                value: '83%',
                trend: 'stable',
                change: '-0.5% vs last quarter',
            },
            {
                label: 'Project Profitability',
                value: 'RM 78,500 avg',
                trend: 'up',
                change: '+6.3% vs last month',
            },
            {
                label: 'Break-even Month',
                value: 'Month 1',
                trend: 'stable',
                change: '-',
            },
            {
                label: 'Cash Runway',
                value: '14 months',
                trend: 'stable',
                change: '-',
            },
        ],
        projections: {
            nextQuarter: { revenue: 495000, growth: 25.4 },
            yearEnd: { revenue: 1478000, growth: 21.7 },
        },
    }
}

const NOW = new Date('2026-02-01T00:00:00.000Z')

describe('normaliseAnalyticsDashboard', () => {
    it('repairs the CoolMei dashboard', () => {
        const { data, repairs } = normaliseAnalyticsDashboard(
            coolMeiFixture(),
            { companyName: 'CoolMei', currentFunds: 5000, now: NOW },
        )

        expect(data.companyName).toBe('CoolMei')
        expect(data.generatedAt).toBe(NOW.toISOString())
        expect(data.revenue.total).toBe(51400)
        expect(data.expenses.total).toBe(38200)
        expect(data.expenses.breakdown).toHaveLength(6)

        const percentageSum = data.expenses.breakdown.reduce(
            (sum, item) => sum + item.percentage,
            0,
        )
        expect(percentageSum).toBeCloseTo(100, 1)

        expect(data.projections.yearEnd.revenue).toBe(51400)
        expect(data.projections.nextQuarter.revenue).toBe(23650)
        expect(data.projections.nextQuarter.growth).toBe(10)

        const values = Object.fromEntries(
            data.kpis.map((kpi) => [kpi.label, kpi.value]),
        )
        expect(values['Monthly Revenue']).toBe('RM 4,283')
        expect(values['Gross Margin']).toBe('76.7%')
        expect(values['Break-even Month']).toBe('Month 9')
        expect(values['Cash Runway']).toBe('1.6 months')

        expect(
            repairs.some((repair) => repair.includes('Revenue total')),
        ).toBe(true)
        expect(
            repairs.some((repair) => repair.includes('Merged')),
        ).toBe(true)
        expect(
            repairs.some((repair) =>
                repair.includes('Next-quarter revenue'),
            ),
        ).toBe(true)
    })

    it('repairs the Apex Consulting dashboard', () => {
        const { data } = normaliseAnalyticsDashboard(apexFixture(), {
            companyName: 'Apex Consulting PLT',
            currentFunds: 250000,
            now: NOW,
        })

        expect(data.revenue.total).toBe(1475000)
        expect(data.expenses.total).toBe(1203000)
        expect(data.expenses.breakdown).toHaveLength(6)

        const percentageSum = data.expenses.breakdown.reduce(
            (sum, item) => sum + item.percentage,
            0,
        )
        expect(percentageSum).toBeCloseTo(100, 1)

        expect(data.projections.yearEnd.revenue).toBe(1475000)
        expect(data.projections.nextQuarter.growth).toBe(5.8)

        const values = Object.fromEntries(
            data.kpis.map((kpi) => [kpi.label, kpi.value]),
        )
        expect(values['Monthly Revenue']).toBe('RM 122,917')
        expect(values['Gross Margin']).toBe('69.5%')
        expect(values['Break-even Month']).toBe('Month 6')
        expect(values['Cash Runway']).toBe('2.5 months')
    })

    it('rejects a monthly array that is not 12 entries', () => {
        const fixture = coolMeiFixture()
        fixture.revenue.monthly = fixture.revenue.monthly.slice(0, 11)

        expect(() =>
            normaliseAnalyticsDashboard(fixture, {
                companyName: 'CoolMei',
                currentFunds: 5000,
                now: NOW,
            }),
        ).toThrow(/exactly 12 entries/)
    })

    it('rejects fewer than 4 expense categories', () => {
        const fixture = coolMeiFixture()
        fixture.expenses.breakdown = fixture.expenses.breakdown.slice(0, 3)

        expect(() =>
            normaliseAnalyticsDashboard(fixture, {
                companyName: 'CoolMei',
                currentFunds: 5000,
                now: NOW,
            }),
        ).toThrow(/at least 4 categories/)
    })

    it('rejects fewer than 4 KPIs', () => {
        const fixture = coolMeiFixture()
        fixture.kpis = fixture.kpis.slice(0, 3)

        expect(() =>
            normaliseAnalyticsDashboard(fixture, {
                companyName: 'CoolMei',
                currentFunds: 5000,
                now: NOW,
            }),
        ).toThrow(/at least 4 items/)
    })

    it('keeps non-formulaic KPI values', () => {
        const { data } = normaliseAnalyticsDashboard(coolMeiFixture(), {
            companyName: 'CoolMei',
            currentFunds: 5000,
            now: NOW,
        })

        const values = Object.fromEntries(
            data.kpis.map((kpi) => [kpi.label, kpi.value]),
        )
        expect(values['Repeat Customer Rate']).toBe('42%')
        expect(values['Customer Acquisition Cost']).toBe('RM 18.50')
    })
})
