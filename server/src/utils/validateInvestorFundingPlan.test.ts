import { describe, expect, it } from 'vitest'
import {
    normaliseInvestorFundingPlan,
    validateInvestorFundingPlan,
} from './validateInvestorFundingPlan.js'

function baseFixture() {
    return {
        company: 'Kedai Kopi Sdn Bhd',
        industry: 'Food & Beverage',
        grants: [
            { name: 'Cradle Fund', url: 'https://www.cradle.com.my' },
            { name: 'MDEC', url: 'https://www.mdec.my' },
            { name: 'SME Corp Malaysia', url: 'https://smecorp.gov.my' },
        ],
        investors: [
            { name: '1337 Ventures', url: 'https://1337.ventures' },
            {
                name: 'Vertex Ventures Southeast Asia',
                url: 'https://www.vertexventures.com',
            },
            { name: 'East Ventures', url: 'https://east.vc' },
        ],
        accelerators: [
            {
                name: 'MRANTI Global Accelerator Programme',
                url: 'https://www.mranti.my',
            },
            {
                name: 'MYStartup Accelerator',
                url: 'https://www.mystartup.gov.my',
            },
            { name: 'PitchIN', url: 'https://www.pitchin.my' },
        ],
        bestRecommendation: {
            source: 'MYStartup Accelerator',
            reason:
                'As a newly launched F&B business in Petaling Jaya, MYStartup Accelerator can provide mentorship, networking, and potentially seed funding to help scale within 12 months.',
            nextStep:
                'Prepare a concise pitch deck and business plan, then apply to the MYStartup Accelerator programme before the next intake deadline.',
        },
    }
}

describe('validateInvestorFundingPlan', () => {
    it('accepts the Kedai Kopi output', () => {
        const plan = validateInvestorFundingPlan(baseFixture())

        expect(plan.company).toBe('Kedai Kopi Sdn Bhd')
        expect(plan.grants).toHaveLength(3)
        expect(plan.investors).toHaveLength(3)
        expect(plan.accelerators).toHaveLength(3)
        expect(plan.bestRecommendation.source).toBe('MYStartup Accelerator')
    })

    it('accepts the Apex Consulting output', () => {
        const fixture = baseFixture()
        fixture.company = 'Apex Consulting PLT'
        fixture.industry = 'Business Consulting'
        fixture.grants.push({ name: 'MRANTI', url: 'https://www.mranti.my' })
        fixture.investors.push({ name: '500 Global', url: 'https://500.co' })
        fixture.bestRecommendation = {
            source: 'Vertex Ventures Southeast Asia',
            reason:
                'Vertex Ventures focuses on growth-stage companies across Southeast Asia and could support geographic expansion.',
            nextStep:
                'Prepare an expansion roadmap and financial projections, then contact Vertex Ventures through its website.',
        }

        const plan = validateInvestorFundingPlan(fixture)

        expect(plan.grants).toHaveLength(4)
        expect(plan.investors).toHaveLength(4)
        expect(plan.bestRecommendation.source).toBe(
            'Vertex Ventures Southeast Asia',
        )
    })

    it('accepts the Nimbus Labs output', () => {
        const fixture = baseFixture()
        fixture.company = 'Nimbus Labs Sdn Bhd'
        fixture.industry = 'B2B SaaS'
        fixture.grants.push({
            name: 'MYStartup',
            url: 'https://www.mystartup.gov.my',
        })
        fixture.bestRecommendation = {
            source: 'MYStartup Accelerator',
            reason:
                'As an idea-stage B2B SaaS company in Cyberjaya, MYStartup Accelerator offers mentorship and pre-seed support to launch an MVP.',
            nextStep:
                'Develop a concise pitch deck and apply to MYStartup Accelerator before the next intake.',
        }

        const plan = validateInvestorFundingPlan(fixture)

        expect(plan.grants).toHaveLength(4)
        expect(plan.bestRecommendation.source).toBe('MYStartup Accelerator')
    })

    it('rejects a URL outside the allowlist', () => {
        const fixture = baseFixture()
        fixture.grants[0].url = 'https://example.com/grant'

        expect(() => validateInvestorFundingPlan(fixture)).toThrow(SyntaxError)
        expect(() => validateInvestorFundingPlan(fixture)).toThrow(
            /not in the official allowlist/,
        )
    })

    it('rejects a bestRecommendation source that matches no card', () => {
        const fixture = baseFixture()
        fixture.bestRecommendation.source = 'Unknown Venture Fund'

        expect(() => validateInvestorFundingPlan(fixture)).toThrow(
            /does not match any grant, investor, or accelerator/,
        )
    })

    it('rejects a bank or loan name', () => {
        const fixture = baseFixture()
        fixture.investors[0].name = 'Maybank'

        expect(() => validateInvestorFundingPlan(fixture)).toThrow(
            /loan\/debt category/,
        )
    })

    it('rejects fewer than 2 grants', () => {
        const fixture = baseFixture()
        fixture.grants = fixture.grants.slice(0, 1)

        expect(() => validateInvestorFundingPlan(fixture)).toThrow(
            /grants must contain 2-5 items/,
        )
    })

    it('rejects a guaranteed-funding claim', () => {
        const fixture = baseFixture()
        fixture.bestRecommendation.reason = 'Funding is guaranteed.'

        expect(() => validateInvestorFundingPlan(fixture)).toThrow(
            /guaranteed-funding claim/,
        )
    })

    it('rejects an unknown top-level key', () => {
        const fixture = { ...baseFixture(), fundingAmount: 100000 }

        expect(() => validateInvestorFundingPlan(fixture)).toThrow(
            /Unknown top-level keys: fundingAmount/,
        )
    })

    it('rejects an extra url key inside bestRecommendation', () => {
        const fixture = baseFixture()
        const bad = {
            ...fixture,
            bestRecommendation: {
                ...fixture.bestRecommendation,
                url: 'https://example.com',
            },
        }

        expect(() => validateInvestorFundingPlan(bad)).toThrow(
            /bestRecommendation has unknown keys: url/,
        )
    })

    it('rejects an extra key inside a grant item', () => {
        const fixture = baseFixture()
        const bad = {
            ...fixture,
            grants: [
                { ...fixture.grants[0], type: 'grant' },
                ...fixture.grants.slice(1),
            ],
        }

        expect(() => validateInvestorFundingPlan(bad)).toThrow(
            /grants\[0\] has unknown keys: type/,
        )
    })
})

describe('normaliseInvestorFundingPlan', () => {
    it('adds PitchIN when accelerators has only one item', () => {
        const fixture = baseFixture()
        fixture.accelerators = [fixture.accelerators[1]]

        const { plan, repairs } = normaliseInvestorFundingPlan(fixture)
        const validated = validateInvestorFundingPlan(plan)

        expect(validated.accelerators).toHaveLength(2)
        expect(validated.accelerators.map((item) => item.name)).toContain(
            'PitchIN',
        )
        expect(
            repairs.some((repair) => repair.includes('added PitchIN')),
        ).toBe(true)
    })

    it('does not duplicate PitchIN when it is already present', () => {
        const fixture = baseFixture()
        fixture.accelerators = [
            { name: 'PitchIN', url: 'https://www.pitchin.my' },
        ]

        const { plan } = normaliseInvestorFundingPlan(fixture)
        const validated = validateInvestorFundingPlan(plan)

        expect(validated.accelerators).toHaveLength(2)
        expect(
            validated.accelerators.filter((item) => item.name === 'PitchIN'),
        ).toHaveLength(1)
        expect(validated.accelerators.map((item) => item.name)).toContain(
            'MYStartup Accelerator',
        )
    })

    it('adds two accelerators when the list is empty', () => {
        const fixture = baseFixture()
        fixture.accelerators = []

        const { plan } = normaliseInvestorFundingPlan(fixture)
        const validated = validateInvestorFundingPlan(plan)

        expect(validated.accelerators.map((item) => item.name)).toEqual([
            'PitchIN',
            'MYStartup Accelerator',
        ])
    })

    it('leaves a valid list unchanged', () => {
        const fixture = baseFixture()

        const { plan, repairs } = normaliseInvestorFundingPlan(fixture)
        const validated = validateInvestorFundingPlan(plan)

        expect(repairs).toHaveLength(0)
        expect(validated.grants).toHaveLength(3)
        expect(validated.investors).toHaveLength(3)
        expect(validated.accelerators).toHaveLength(3)
    })

    it('fills grants and investors when they are below the minimum', () => {
        const fixture = baseFixture()
        fixture.grants = [fixture.grants[0]]
        fixture.investors = [fixture.investors[1]]

        const { plan, repairs } = normaliseInvestorFundingPlan(fixture)
        const validated = validateInvestorFundingPlan(plan)

        expect(validated.grants).toHaveLength(2)
        expect(validated.investors).toHaveLength(2)
        expect(
            repairs.some((repair) =>
                repair.includes('added SME Corp Malaysia'),
            ),
        ).toBe(true)
        expect(
            repairs.some((repair) => repair.includes('added 1337 Ventures')),
        ).toBe(true)
    })
})
