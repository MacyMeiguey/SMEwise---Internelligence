import { describe, expect, it } from 'vitest'
import { validateGeneratedDocument } from './validateGeneratedDocument.js'

const NOW = new Date('2026-02-01T00:00:00.000Z')

interface FixtureSection {
    title: string
    content: string | string[]
    chart?: {
        type: string
        yAxisLabel?: string
        series: Array<{ label: string; value: number }>
    }
}

interface Fixture {
    documentType: string
    companyName: string
    generatedAt: string
    sections: FixtureSection[]
    disclaimer: string
}

function baseFixture(): Fixture {
    return {
        documentType: 'Business Plan Summary',
        companyName: 'CoolMei',
        generatedAt: '2026-01-15T00:00:00.000Z',
        sections: [
            {
                title: 'Executive Summary',
                content:
                    'CoolMei is a bubble milk tea enterprise in Kuala Lumpur.',
            },
            {
                title: 'Company Overview',
                content:
                    'The business is at the launch stage and focuses on students and workers.',
            },
            {
                title: 'Products & Services',
                content: [
                    'Classic milk tea, matcha, and seasonal specials.',
                    'Prices range from RM 7 to RM 12 per cup.',
                ],
            },
            {
                title: 'Financial Plan',
                content:
                    'Month | Revenue (RM) | Cost (RM) | Net profit (RM)\nMonth 1 | 2,000 | 3,000 | -1,000\nMonth 2 | 2,500 | 3,000 | -500',
                chart: {
                    type: 'bar',
                    yAxisLabel: 'RM',
                    series: [
                        { label: 'Month 1', value: 2000 },
                        { label: 'Month 2', value: 2500 },
                    ],
                },
            },
            {
                title: 'Risks & Mitigation',
                content: [
                    'Competition: differentiate through unique flavours.',
                    'Cash flow: track daily sales and control inventory.',
                ],
            },
        ],
        disclaimer:
            'This business plan is a planning draft and should be verified with professional advisers.',
    }
}

const options = {
    documentType: 'Business Plan Summary',
    companyName: 'CoolMei',
    now: NOW,
}

describe('validateGeneratedDocument', () => {
    it('accepts a valid Business Plan Summary', () => {
        const doc = validateGeneratedDocument(baseFixture(), options)

        expect(doc.documentType).toBe('Business Plan Summary')
        expect(doc.companyName).toBe('CoolMei')
        expect(doc.generatedAt).toBe(NOW.toISOString())
        expect(doc.sections).toHaveLength(5)
        expect(doc.sections[3].chart?.series).toHaveLength(2)
        expect(doc.disclaimer).toContain('planning draft')
    })

    it('overrides companyName and generatedAt', () => {
        const fixture = baseFixture()
        fixture.companyName = 'Old Name'
        fixture.generatedAt = '2020-01-01T00:00:00.000Z'

        const doc = validateGeneratedDocument(fixture, options)

        expect(doc.companyName).toBe('CoolMei')
        expect(doc.generatedAt).toBe(NOW.toISOString())
    })

    it('rejects a documentType that does not match the request', () => {
        const fixture = baseFixture()
        fixture.documentType = 'SWOT Analysis'

        expect(() =>
            validateGeneratedDocument(fixture, options),
        ).toThrow(/does not match the requested type/)
    })

    it('rejects fewer than 5 sections', () => {
        const fixture = baseFixture()
        fixture.sections = fixture.sections.slice(0, 4)

        expect(() =>
            validateGeneratedDocument(fixture, options),
        ).toThrow(/sections must contain 5-11 items/)
    })

    it('rejects invalid section content', () => {
        const fixture = baseFixture()
        const bad = {
            ...fixture,
            sections: [
                { title: 'Bad', content: 123 },
                ...fixture.sections.slice(1),
            ],
        }

        expect(() =>
            validateGeneratedDocument(bad, options),
        ).toThrow(/content must be a string or an array of strings/)
    })

    it('rejects a chart with fewer than 2 points', () => {
        const fixture = baseFixture()
        fixture.sections[3].chart!.series =
            fixture.sections[3].chart!.series.slice(0, 1)

        expect(() =>
            validateGeneratedDocument(fixture, options),
        ).toThrow(/series must contain at least 2 data points/)
    })

    it('rejects an invalid chart type', () => {
        const fixture = baseFixture()
        fixture.sections[3].chart!.type = 'pie'

        expect(() =>
            validateGeneratedDocument(fixture, options),
        ).toThrow(/type must be "bar" or "line"/)
    })

    it('rejects an extra top-level key', () => {
        const fixture = { ...baseFixture(), extra: true }

        expect(() =>
            validateGeneratedDocument(fixture, options),
        ).toThrow(/unknown keys: extra/)
    })

    it('rejects an extra section key', () => {
        const fixture = baseFixture()
        const bad = {
            ...fixture,
            sections: [
                { ...fixture.sections[0], notes: 'extra' },
                ...fixture.sections.slice(1),
            ],
        }

        expect(() =>
            validateGeneratedDocument(bad, options),
        ).toThrow(/sections\[0\] has unknown keys: notes/)
    })

    it('rejects an unsupported requested document type', () => {
        expect(() =>
            validateGeneratedDocument(baseFixture(), {
                documentType: 'Unknown Report',
                companyName: 'CoolMei',
                now: NOW,
            }),
        ).toThrow(/Unsupported documentType/)
    })
})
