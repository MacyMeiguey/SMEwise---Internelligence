import { describe, expect, it } from 'vitest'
import { validateStartupGuide } from './validateStartupGuide.js'

function baseFixture() {
    return {
        company: 'CoolMei',
        industry: 'bubble milk tea',
        businessStage: 'Just Launched',
        location: 'Wilayah Persekutuan Kuala Lumpur',
        businessType: 'Enterprise',
        liabilityStatus: 'UNLIMITED',
        part1: {
            title: 'Before You Register',
            sections: [
                {
                    heading: 'Business Structure',
                    liabilityStatus: 'UNLIMITED',
                    points: [
                        'Enterprise (Sole Proprietorship) has unlimited personal liability for the owner.',
                        'Ownership and operational control rests solely with the founder.',
                        'Compliance duties include annual SSM returns and personal responsibility for all business debts.',
                    ],
                },
                {
                    heading: 'Startup Capital',
                    minimumStatutory: 'RM 1',
                    realisticEstimate: 'RM 10,000-RM 30,000',
                    points: [
                        'RM 1 is the minimum statutory capital for an Enterprise, but this is not realistic for operations.',
                        'A realistic range accounts for initial inventory, licences, a basic premise deposit, and marketing.',
                        'Your current funds of RM 5,000 will need careful budgeting until additional capital is secured.',
                    ],
                },
                {
                    heading: 'Pre-Registration Checklist',
                    points: [
                        'Conduct a name search via SSM to ensure the business name is unique.',
                        'Gather necessary documents: National ID, address proof, and any premises lease or ownership documents.',
                        'Secure a suitable premise in Kuala Lumpur and ensure it meets DBKL licensing requirements.',
                        'Register a business domain for online presence and future marketing.',
                    ],
                },
                {
                    heading: 'Banking',
                    points: [
                        'Open a dedicated corporate bank account in the business name after SSM registration.',
                        'Designate at least two authorised signatories for account operations.',
                        'Avoid using a personal account for business transactions to maintain compliance and clarity.',
                        'Ensure all business income and expenses flow through the corporate account only.',
                    ],
                },
                {
                    heading: 'Funding Options',
                    points: [
                        'Explore SME grants via HRD Corp or MYSMART for early-stage support.',
                        'Consider short-term micro-financing from licensed financial institutions for working capital.',
                        'Look into crowdfunding platforms or angel investors for larger capital needs.',
                    ],
                },
                {
                    heading: 'Hiring Obligations',
                    points: [
                        'Register with EPF, SOCSO, and EIS when hiring your first employee.',
                        'Comply with minimum wage requirements and employment contract standards.',
                        'Maintain employee records and contribute to HRD Corp if applicable.',
                    ],
                },
                {
                    heading: 'Key Warnings',
                    points: [
                        'Ensure your food premise complies with DBKL and health department regulations.',
                        'Food handler training and certification are mandatory for all staff preparing food.',
                        'Maintain accurate food safety records and undergo periodic health inspections.',
                        'Avoid operating without a valid business licence or food handler permits.',
                    ],
                },
            ],
        },
        part2: {
            title: 'Registration Checklist',
            steps: [
                {
                    stepNumber: 1,
                    title: 'SSM Name Search and Reservation',
                    where: 'ssm.com.my',
                    documents: [
                        'National ID copy',
                        'Address proof',
                        'Proposed business name(s)',
                    ],
                    fee: 'RM 20',
                    processingTime: '1 working day',
                    note: 'Ensure the name aligns with your bubble tea brand and is unique.',
                },
                {
                    stepNumber: 2,
                    title: 'SSM Business Registration',
                    where: 'ssm.com.my',
                    documents: [
                        'National ID copy',
                        'Address proof',
                        'Business address proof (lease or ownership)',
                        'Business activity description',
                    ],
                    fee: 'RM 2 for Enterprises',
                    processingTime: '1 working day',
                    note: "Select 'Food and Beverage' as the business activity.",
                },
                {
                    stepNumber: 3,
                    title: 'Corporate Bank Account Opening',
                    where: 'Bank branch (Maybank, CIMB, etc.)',
                    documents: [
                        'SSM registration certificate',
                        'National ID copy',
                        'Business address proof',
                        'Personal identification of signatories',
                    ],
                    fee: 'RM 0',
                    processingTime: '1-3 working days',
                    note: 'Choose a bank with business-friendly fees and online services.',
                },
                {
                    stepNumber: 4,
                    title: 'LHDN Tax Registration',
                    where: 'mytax.hasil.gov.my',
                    documents: [
                        'SSM registration certificate',
                        'National ID copy',
                        'Business address proof',
                        'Bank account details',
                    ],
                    fee: 'RM 0',
                    processingTime: 'Within 30 days of commencing business',
                    note: 'Complete this before you start earning income.',
                },
                {
                    stepNumber: 5,
                    title: 'DBKL Business Premises Licence',
                    where: 'dbkl.gov.my',
                    documents: [
                        'SSM registration certificate',
                        'Lease agreement or proof of ownership',
                        'Site plan and floor layout',
                        'Fire safety certificate',
                        'Health department clearance',
                    ],
                    fee: 'Approx. RM 500-RM 1,000',
                    processingTime: '4-6 weeks',
                    note: 'Apply after securing your premise and before opening to the public.',
                },
                {
                    stepNumber: 6,
                    title: 'Food Premises Licence & Handler Training',
                    where: 'DBKL Health Office',
                    documents: [
                        'Business premise proof',
                        'Food handler training certificates',
                        'Hygiene plan',
                        'SSM registration certificate',
                    ],
                    fee: 'Approx. RM 200-RM 500',
                    processingTime: '2-4 weeks',
                    note: 'Food handler training is compulsory for all staff involved in food preparation.',
                },
                {
                    stepNumber: 7,
                    title: 'Halal Certification (Optional)',
                    where: 'JAKIM or state halal authority',
                    documents: [
                        'Business premise proof',
                        'Food ingredients proof',
                        'Hygiene practices documentation',
                        'Application form',
                    ],
                    fee: 'Approx. RM 1,000-RM 5,000',
                    processingTime: '3-6 months',
                    note: 'Only required if you intend to market the bubble tea as halal.',
                },
            ],
            localAuthorityLicense: {
                council: 'Dewan Bandaraya Kuala Lumpur (DBKL)',
                portal: 'dbkl.gov.my',
                license: 'Business Premises Licence',
                documents: [
                    'SSM registration certificate',
                    'Lease agreement or proof of ownership',
                    'Site plan and floor layout',
                    'Fire safety certificate',
                    'Health department clearance',
                ],
                fee: 'Approx. RM 500-RM 1,000',
                processingTime: '4-6 weeks',
            },
            industryLicenses: [
                {
                    licenseName: 'Food Premises Licence',
                    issuingBody: 'DBKL Health Office',
                    portal: 'dbkl.gov.my',
                    fee: 'Approx. RM 200-RM 500',
                    processingTime: '2-4 weeks',
                },
                {
                    licenseName: 'Food Handler Training',
                    issuingBody: 'DBKL or accredited training providers',
                    portal: 'dbkl.gov.my',
                    fee: 'Approx. RM 100-RM 300 per person',
                    processingTime: 'Immediate upon training completion',
                },
            ],
            taxRegistration: {
                body: 'LHDN (Inland Revenue Board of Malaysia)',
                portal: 'mytax.hasil.gov.my',
                form: 'Form B/BE (Business Registration)',
                timeline: 'Within 30 days of commencing business',
                fee: 'RM 0',
            },
            sstRegistration:
                'SST registration is not currently required as your turnover is below the RM500,000 threshold. Monitor your revenue and register with Customs Department via mysst.customs.gov.my if you exceed this limit.',
        },
        stageNote:
            'As you are Just Launched, prioritise SSM registration, LHDN tax registration, and DBKL business licence before opening your first outlet.',
        disclaimer:
            'This is general guidance only and does not constitute legal or tax advice; confirm requirements with SSM, LHDN, DBKL, and a licensed adviser.',
    }
}

describe('validateStartupGuide', () => {
    it('accepts the CoolMei guide', () => {
        const guide = validateStartupGuide(baseFixture())

        expect(guide.company).toBe('CoolMei')
        expect(guide.liabilityStatus).toBe('UNLIMITED')
        expect(guide.part1.sections).toHaveLength(7)
        expect(guide.part2.steps).toHaveLength(7)
        expect(guide.part2.localAuthorityLicense.portal).toBe('dbkl.gov.my')
        expect(guide.part2.taxRegistration.portal).toBe(
            'mytax.hasil.gov.my',
        )
        expect(guide.part2.industryLicenses).toHaveLength(2)
    })

    it('rejects a wrong section heading', () => {
        const fixture = baseFixture()
        fixture.part1.sections[0].heading = 'Structure'

        expect(() => validateStartupGuide(fixture)).toThrow(
            /heading must be "Business Structure"/,
        )
    })

    it('rejects a liability mismatch', () => {
        const fixture = baseFixture()
        fixture.businessType = 'Sdn Bhd'

        expect(() => validateStartupGuide(fixture)).toThrow(
            /does not match businessType/,
        )
    })

    it('rejects fewer than 5 steps', () => {
        const fixture = baseFixture()
        fixture.part2.steps = fixture.part2.steps.slice(0, 4)

        expect(() => validateStartupGuide(fixture)).toThrow(
            /must contain 5-8 steps/,
        )
    })

    it('rejects a tax portal with https://', () => {
        const fixture = baseFixture()
        fixture.part2.taxRegistration.portal =
            'https://mytax.hasil.gov.my'

        expect(() => validateStartupGuide(fixture)).toThrow(
            /must be a bare domain without https/,
        )
    })

    it('rejects a non-sequential step number', () => {
        const fixture = baseFixture()
        fixture.part2.steps[1].stepNumber = 5

        expect(() => validateStartupGuide(fixture)).toThrow(
            /stepNumber must be 2/,
        )
    })

    it('rejects an extra top-level key', () => {
        const fixture = { ...baseFixture(), extra: true }

        expect(() => validateStartupGuide(fixture)).toThrow(
            /unknown keys: extra/,
        )
    })

    it('rejects an extra step key', () => {
        const fixture = baseFixture()
        const bad = {
            ...fixture,
            part2: {
                ...fixture.part2,
                steps: [
                    { ...fixture.part2.steps[0], extra: true },
                    ...fixture.part2.steps.slice(1),
                ],
            },
        }

        expect(() => validateStartupGuide(bad)).toThrow(
            /part2\.steps\[0\] has unknown keys: extra/,
        )
    })

    it('accepts a none-required industry licence', () => {
        const fixture = baseFixture()
        fixture.part2.industryLicenses = [
            {
                licenseName: 'None required',
                issuingBody: 'N/A',
                portal: 'N/A',
                fee: 'N/A',
                processingTime: 'N/A',
            },
        ]

        const guide = validateStartupGuide(fixture)
        expect(guide.part2.industryLicenses[0].licenseName).toBe(
            'None required',
        )
    })

    it('rejects a missing disclaimer', () => {
        const fixture = baseFixture()
        fixture.disclaimer = ''

        expect(() => validateStartupGuide(fixture)).toThrow(
            /disclaimer must be a non-empty string/,
        )
    })
})
