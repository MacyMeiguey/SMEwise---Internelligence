import { describe, expect, it } from 'vitest'
import { validateLoansFundingPlan } from './validateLoansFundingPlan.js'

function validFixture() {
    return {
        company: 'Kedai Kopi Sdn Bhd',
        industry: 'Food & Beverage',
        governmentSchemes: [
            { name: 'SME Bank', url: 'https://www.smebank.com.my' },
            { name: 'TEKUN Nasional', url: 'https://www.tekun.gov.my' },
            { name: 'MARA', url: 'https://www.mara.gov.my' },
            { name: 'SME Corp Malaysia', url: 'https://smecorp.gov.my' },
            { name: 'MIDF', url: 'https://www.midf.com.my' },
        ],
        commercialBanks: [
            { bank: 'Maybank', url: 'https://www.maybank.com.my' },
            { bank: 'CIMB Bank', url: 'https://www.cimb.com.my' },
            { bank: 'Public Bank', url: 'https://www.publicbank.com.my' },
            { bank: 'RHB Bank', url: 'https://www.rhbgroup.com' },
            { bank: 'Hong Leong Bank', url: 'https://www.hlb.com.my' },
        ],
        bestFit: {
            scheme: 'SME Bank',
            reason:
                'SME Bank provides targeted financing for newly launched SMEs, with flexible terms and support for micro-enterprises like a just launched coffee shop.',
            alternative: 'TEKUN Nasional',
        },
        requirements: [
            'SSM registration',
            '6 months bank statements',
            'Tax identification number',
            'Business plan or pitch deck',
            "Director's IC",
            'Proof of business address',
            'Collateral or personal guarantor (if required)',
        ],
        timeline: '2-4 weeks for SME Bank; 4-8 weeks for commercial banks',
    }
}

describe('validateLoansFundingPlan', () => {
    it('accepts the Kedai Kopi output', () => {
        const plan = validateLoansFundingPlan(validFixture())

        expect(plan.company).toBe('Kedai Kopi Sdn Bhd')
        expect(plan.governmentSchemes).toHaveLength(5)
        expect(plan.commercialBanks).toHaveLength(5)
        expect(plan.bestFit.scheme).toBe('SME Bank')
        expect(plan.requirements).toHaveLength(7)
        expect(plan.timeline).toContain('2-4 weeks')
    })

    it('accepts a trailing slash on an allowlisted URL', () => {
        const fixture = validFixture()
        fixture.governmentSchemes[0].url = 'https://www.smebank.com.my/'

        const plan = validateLoansFundingPlan(fixture)
        expect(plan.governmentSchemes[0].url).toBe('https://www.smebank.com.my/')
    })

    it('rejects a URL outside the allowlist', () => {
        const fixture = validFixture()
        fixture.governmentSchemes[0].url = 'https://example.com/sme-loan'

        expect(() => validateLoansFundingPlan(fixture)).toThrow(SyntaxError)
        expect(() => validateLoansFundingPlan(fixture)).toThrow(
            /not in the official allowlist/,
        )
    })

    it('rejects a bestFit that does not match a card', () => {
        const fixture = validFixture()
        fixture.bestFit.scheme = 'Unknown Development Bank'

        expect(() => validateLoansFundingPlan(fixture)).toThrow(
            /does not match any government scheme or commercial bank/,
        )
    })

    it('rejects fewer than 5 requirements', () => {
        const fixture = validFixture()
        fixture.requirements = fixture.requirements.slice(0, 4)

        expect(() => validateLoansFundingPlan(fixture)).toThrow(
            /requirements must contain 5-8 items/,
        )
    })

    it('rejects a grant or equity category', () => {
        const fixture = validFixture()
        fixture.governmentSchemes[0].name = 'Cradle Grant'

        expect(() => validateLoansFundingPlan(fixture)).toThrow(
            /non-loan category/,
        )
    })

    it('rejects fewer than 3 schemes', () => {
        const fixture = validFixture()
        fixture.governmentSchemes = fixture.governmentSchemes.slice(0, 2)

        expect(() => validateLoansFundingPlan(fixture)).toThrow(
            /governmentSchemes must contain 3-5 items/,
        )
    })
})
