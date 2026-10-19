import { describe, expect, it } from 'vitest'
import { validateRiskAnalysis } from './validateRiskAnalysis.js'

function baseFixture() {
    return {
        company: 'CoolMei',
        industry: 'Food & Beverage',
        businessStage: 'Just Launched',
        location: 'Kuala Lumpur, Malaysia',
        businessType: 'Enterprise',
        currentFunds: 60000,
        advisorAnalysis: {
            businessActivityAssumption: 'A food and beverage retail business.',
            stageExposure: 'Early-stage businesses face setup and compliance risks.',
            capitalExposure: 'Available capital should be monitored against operating costs.',
            regulatoryComplexity: 'Medium',
            researchFocus: ['Verify current local licensing requirements.'] as unknown,
        },
        riskSummary: {
            overallRating: 'High',
            biggestThreatNow: 'Insufficient working capital.',
            quickWin: 'Review weekly cash flow.',
        },
        financialHealth: {
            capitalPosition: 'Tight',
            mainConcern: 'Limited runway.',
            reason: 'Early expenses can exceed available funds.',
        },
        risks: [
            {
                riskNumber: 1,
                category: 'Regulatory & Compliance',
                riskName: 'Licensing',
                level: 'Medium',
                whatItIs: 'Required registrations may be incomplete.',
                whyItApplies: 'The business is newly launched.',
                ifIgnored: 'Operations may be disrupted.',
                fixIt: ['Review requirements.', 'Contact the authority.', 'Keep records.'],
            },
            {
                riskNumber: 2,
                category: 'Financial',
                riskName: 'Cash flow',
                level: 'High',
                whatItIs: 'Cash may not cover short-term costs.',
                whyItApplies: 'The business has limited available funds.',
                ifIgnored: 'Payments may be missed.',
                fixIt: ['Forecast cash flow.', 'Track expenses.', 'Review runway.'],
            },
            {
                riskNumber: 3,
                category: 'Market',
                riskName: 'Competition',
                level: 'Medium',
                whatItIs: 'Competitors may attract the same customers.',
                whyItApplies: 'The business operates in a competitive market.',
                ifIgnored: 'Sales may fall.',
                fixIt: ['Research competitors.', 'Differentiate offers.', 'Gather feedback.'],
            },
            {
                riskNumber: 4,
                category: 'Operational',
                riskName: 'Supply disruption',
                level: 'Low',
                whatItIs: 'Key supplies may be unavailable.',
                whyItApplies: 'Operations depend on regular inventory.',
                ifIgnored: 'Service may be interrupted.',
                fixIt: ['Track stock.', 'Identify alternatives.', 'Review suppliers.'],
            },
            {
                riskNumber: 5,
                category: 'Economic / External',
                riskName: 'Cost changes',
                level: 'Medium',
                whatItIs: 'External cost changes may affect margins.',
                whyItApplies: 'Input prices can fluctuate.',
                ifIgnored: 'Margins may narrow.',
                fixIt: ['Monitor costs.', 'Review pricing.', 'Maintain a buffer.'],
            },
        ],
        regulatoryChecklist: [
            {
                item: 'Business registration',
                authority: 'SSM',
                applicability: 'Mandatory',
                reason: 'The business needs registration.',
                action: 'Confirm registration status.',
                portal: 'https://www.ssm.com.my',
            },
        ],
        nextActions: [
            { priority: 1, action: 'Review cash flow.', reason: 'Protect working capital.' },
            { priority: 2, action: 'Confirm registrations.', reason: 'Address compliance needs.' },
            { priority: 3, action: 'Review suppliers.', reason: 'Reduce disruption risk.' },
        ],
        disclaimer: 'This analysis is informational and should be verified.',
    }
}

const options = {
    companyName: 'CoolMei',
    industry: 'Food & Beverage',
    businessStage: 'Just Launched',
    city: 'Kuala Lumpur',
    businessType: 'Enterprise',
    currentFunds: 60000,
}

function expectInvalid(fixture: unknown, expectedError?: RegExp) {
    const result = validateRiskAnalysis(fixture, options)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    if (expectedError) {
        expect(result.errors.join(' ')).toMatch(expectedError)
    }
}

describe('validateRiskAnalysis', () => {
    it('accepts a complete, internally consistent risk analysis', () => {
        const result = validateRiskAnalysis(baseFixture(), options)

        expect(result).toEqual({ valid: true, errors: [] })
    })

    it('rejects a response that is not an object', () => {
        expectInvalid(null, /must be an object/)
    })

    it.each([
        [['Local authority licensing requirements']],
        [
            [
                'Local authority licensing requirements',
                'Food safety requirements',
                'Employment-related requirements',
            ],
        ],
    ])('accepts researchFocus as a non-empty list: %j', (researchFocus) => {
        const fixture = baseFixture()
        fixture.advisorAnalysis.researchFocus = researchFocus

        expect(validateRiskAnalysis(fixture, options).valid).toBe(true)
    })

    it.each([
        [],
        'Local authority licensing requirements',
        [''],
        ['   '],
        [null],
        [42],
        [{}],
        null,
        undefined,
    ])('rejects invalid researchFocus: %j', (researchFocus) => {
        const fixture = baseFixture()
        fixture.advisorAnalysis.researchFocus = researchFocus

        expectInvalid(
            fixture,
            /advisorAnalysis\.researchFocus must be a non-empty array of non-empty strings/,
        )
    })

    it.each(['Low', 'Medium', 'High'])(
        'accepts exact regulatoryComplexity value %s',
        (regulatoryComplexity) => {
            const fixture = baseFixture()
            fixture.advisorAnalysis.regulatoryComplexity = regulatoryComplexity

            expect(validateRiskAnalysis(fixture, options).valid).toBe(true)
        },
    )

    it.each([
        'Medium - Significant regulatory requirements',
        'High - complex regulation',
        'Low risk',
    ])('rejects non-exact regulatoryComplexity value %s', (regulatoryComplexity) => {
        const fixture = baseFixture()
        fixture.advisorAnalysis.regulatoryComplexity = regulatoryComplexity

        expectInvalid(
            fixture,
            /advisorAnalysis\.regulatoryComplexity must be one of: Low, Medium, High/,
        )
    })

    it.each([4, 6])('rejects a risks array with %i entries', (length) => {
        const fixture = baseFixture()
        if (length < fixture.risks.length) {
            fixture.risks = fixture.risks.slice(0, length)
        } else {
            fixture.risks.push({ ...fixture.risks[0], riskNumber: 6 })
        }

        expectInvalid(fixture, /risks must contain exactly 5 items/)
    })

    it('rejects duplicate risk categories', () => {
        const fixture = baseFixture()
        fixture.risks[1].category = fixture.risks[0].category

        expectInvalid(fixture, /Financial.*exactly once/)
    })

    it('rejects a missing required risk category', () => {
        const fixture = baseFixture()
        fixture.risks[4].category = 'Market'

        expectInvalid(fixture, /Economic \/ External.*exactly once/)
    })

    it('rejects risk numbers that are not 1 through 5 in order', () => {
        const fixture = baseFixture()
        fixture.risks[0].riskNumber = 2

        expectInvalid(fixture, /riskNumber must be 1/)
    })

    it('rejects an invalid risk level', () => {
        const fixture = baseFixture()
        fixture.risks[0].level = 'Urgent'

        expectInvalid(fixture, /must be one of: Critical, High, Medium, Low/)
    })

    it('rejects an overall rating that is not the highest risk level', () => {
        const fixture = baseFixture()
        fixture.riskSummary.overallRating = 'Medium'

        expectInvalid(fixture, /must equal the highest risk level "High"/)
    })

    it.each([2, 4])('rejects a fixIt array with %i actions', (length) => {
        const fixture = baseFixture()
        if (length < fixture.risks[0].fixIt.length) {
            fixture.risks[0].fixIt = fixture.risks[0].fixIt.slice(0, length)
        } else {
            fixture.risks[0].fixIt.push('Follow up with an adviser.')
        }

        expectInvalid(fixture, /fixIt must contain exactly 3 items/)
    })

    it.each([2, 4])('rejects nextActions with %i entries', (length) => {
        const fixture = baseFixture()
        if (length < fixture.nextActions.length) {
            fixture.nextActions = fixture.nextActions.slice(0, length)
        } else {
            fixture.nextActions.push({
                priority: 4,
                action: 'Review insurance.',
                reason: 'Prepare for unexpected events.',
            })
        }

        expectInvalid(fixture, /nextActions must contain exactly 3 items/)
    })

    it('rejects incorrect nextAction priorities', () => {
        const fixture = baseFixture()
        fixture.nextActions[0].priority = 2

        expectInvalid(fixture, /nextActions\[0\]\.priority must be 1/)
    })

    it('rejects invalid regulatory applicability', () => {
        const fixture = baseFixture()
        fixture.regulatoryChecklist[0].applicability = 'Required'

        expectInvalid(fixture, /applicability must be one of/)
    })

    it('rejects Markdown-formatted portal links', () => {
        const fixture = baseFixture()
        fixture.regulatoryChecklist[0].portal =
            '[https://www.ssm.com.my](https://www.ssm.com.my)'

        expectInvalid(fixture, /one raw HTTPS URL/)
    })

    it('rejects HTTP portal links', () => {
        const fixture = baseFixture()
        fixture.regulatoryChecklist[0].portal = 'http://www.ssm.com.my'

        expectInvalid(fixture, /one raw HTTPS URL/)
    })

    it('rejects multiple URLs in one portal field', () => {
        const fixture = baseFixture()
        fixture.regulatoryChecklist[0].portal =
            'https://www.ssm.com.my https://www.example.com'

        expectInvalid(fixture, /one raw HTTPS URL/)
    })

    it('accepts N/A as a portal value', () => {
        const fixture = baseFixture()
        fixture.regulatoryChecklist[0].portal = 'N/A'

        expect(validateRiskAnalysis(fixture, options).valid).toBe(true)
    })

    it('rejects MCMC as the authority for a PDPA checklist item', () => {
        const fixture = baseFixture()
        fixture.regulatoryChecklist[0].item =
            'Personal Data Protection Act (PDPA)'
        fixture.regulatoryChecklist[0].authority = 'MCMC'

        expectInvalid(fixture, /must not contain MCMC/)
    })

    it.each(['MBPJ', 'MBSA', 'MBSJ'])(
        'rejects %s for a Kuala Lumpur local-authority item',
        (authority) => {
            const fixture = baseFixture()
            fixture.regulatoryChecklist[0].item =
                'Local authority business premises licence'
            fixture.regulatoryChecklist[0].authority = authority

            expectInvalid(fixture, /must not use MBPJ, MBSA, or MBSJ/)
        },
    )

    it('rejects null and empty required fields', () => {
        const nullFixture = baseFixture()
        nullFixture.company = null as unknown as string
        expectInvalid(nullFixture, /company must be a non-empty string/)

        const emptyFixture = baseFixture()
        emptyFixture.disclaimer = '  '
        expectInvalid(emptyFixture, /disclaimer must be a non-empty string/)
    })
})
