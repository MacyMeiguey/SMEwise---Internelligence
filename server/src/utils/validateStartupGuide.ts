/**
 * validateStartupGuide — contract check for the Startup Registration widget.
 *
 * The guide is a large two-part JSON document. Structural drift (wrong section
 * headings, missing steps, a portal with "https://" that produces a double
 * scheme in the UI) is common, so validate it before the client parses it.
 *
 * Validation failures throw SyntaxError so the route retries with a specific
 * reason.
 */

const EXPECTED_HEADINGS = [
    'Business Structure',
    'Startup Capital',
    'Pre-Registration Checklist',
    'Banking',
    'Funding Options',
    'Hiring Obligations',
    'Key Warnings',
] as const

const TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
    'company',
    'industry',
    'businessStage',
    'location',
    'businessType',
    'liabilityStatus',
    'part1',
    'part2',
    'stageNote',
    'disclaimer',
])

const PART1_KEYS: ReadonlySet<string> = new Set(['title', 'sections'])
const SECTION_KEYS: ReadonlySet<string> = new Set([
    'heading',
    'liabilityStatus',
    'minimumStatutory',
    'realisticEstimate',
    'points',
])
const PART2_KEYS: ReadonlySet<string> = new Set([
    'title',
    'steps',
    'localAuthorityLicense',
    'industryLicenses',
    'taxRegistration',
    'sstRegistration',
])
const STEP_KEYS: ReadonlySet<string> = new Set([
    'stepNumber',
    'title',
    'where',
    'documents',
    'fee',
    'processingTime',
    'note',
])
const LOCAL_AUTHORITY_KEYS: ReadonlySet<string> = new Set([
    'council',
    'portal',
    'license',
    'documents',
    'fee',
    'processingTime',
])
const INDUSTRY_LICENSE_KEYS: ReadonlySet<string> = new Set([
    'licenseName',
    'issuingBody',
    'portal',
    'fee',
    'processingTime',
])
const TAX_REGISTRATION_KEYS: ReadonlySet<string> = new Set([
    'body',
    'portal',
    'form',
    'timeline',
    'fee',
])

type LiabilityStatus = 'LIMITED' | 'UNLIMITED'

export interface StartupSection {
    heading: string
    liabilityStatus?: LiabilityStatus
    minimumStatutory?: string
    realisticEstimate?: string
    points: string[]
}

export interface StartupStep {
    stepNumber: number
    title: string
    where: string
    documents: string[]
    fee: string
    processingTime: string
    note?: string
}

export interface IndustryLicense {
    licenseName: string
    issuingBody: string
    portal: string
    fee: string
    processingTime: string
}

export interface TaxRegistration {
    body: string
    portal: string
    form: string
    timeline: string
    fee: string
}

export interface StartupGuide {
    company: string
    industry: string
    businessStage: string
    location: string
    businessType: string
    liabilityStatus: LiabilityStatus
    part1: {
        title: string
        sections: StartupSection[]
    }
    part2: {
        title: string
        steps: StartupStep[]
        localAuthorityLicense: {
            council: string
            portal: string
            license: string
            documents: string[]
            fee: string
            processingTime: string
        }
        industryLicenses: IndustryLicense[]
        taxRegistration: TaxRegistration
        sstRegistration: string
    }
    stageNote: string
    disclaimer: string
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

function requireStringArray(
    value: unknown,
    field: string,
    min: number,
    max: number,
    errors: string[],
): string[] {
    if (!Array.isArray(value) || value.length < min || value.length > max) {
        const count = Array.isArray(value) ? value.length : 'non-array'
        errors.push(
            `${field} must contain ${min}-${max} items (received ${count}).`,
        )
        return []
    }

    return value.map((item, index) =>
        requireString(item, `${field}[${index}]`, errors),
    )
}

function assertAllowedKeys(
    value: Record<string, unknown>,
    allowed: ReadonlySet<string>,
    field: string,
    errors: string[],
): void {
    const unknown = Object.keys(value).filter((key) => !allowed.has(key))
    if (unknown.length > 0) {
        errors.push(`${field} has unknown keys: ${unknown.join(', ')}.`)
    }
}

function parseLiability(
    value: unknown,
    field: string,
    errors: string[],
): LiabilityStatus | undefined {
    if (value === undefined) return undefined

    const text = requireString(value, field, errors)
    if (!text) return undefined

    if (text !== 'LIMITED' && text !== 'UNLIMITED') {
        errors.push(
            `${field} must be "LIMITED" or "UNLIMITED" (received "${text}").`,
        )
        return undefined
    }

    return text
}

function expectedLiability(businessType: string): LiabilityStatus {
    const type = businessType.toLowerCase()
    if (
        type.includes('sdn') ||
        type.includes('plt') ||
        type.includes('llp')
    ) {
        return 'LIMITED'
    }
    return 'UNLIMITED'
}

function isBareDomain(value: string): boolean {
    return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s]*)?$/i.test(
        value,
    )
}

function validatePortal(
    value: unknown,
    field: string,
    errors: string[],
    allowNA = false,
): string {
    const text = requireString(value, field, errors)
    if (!text) return ''

    if (allowNA && /^n\/?a$/i.test(text)) return text

    if (!isBareDomain(text)) {
        errors.push(
            `${field} must be a bare domain without https:// (received "${text}").`,
        )
    }

    return text
}

export function validateStartupGuide(input: unknown): StartupGuide {
    if (!isRecord(input)) {
        throw new SyntaxError(
            'Startup guide response was not a JSON object.',
        )
    }

    const raw = input
    const errors: string[] = []

    assertAllowedKeys(raw, TOP_LEVEL_KEYS, 'startup guide', errors)

    const company = requireString(raw.company, 'company', errors)
    const industry = requireString(raw.industry, 'industry', errors)
    const businessStage = requireString(
        raw.businessStage,
        'businessStage',
        errors,
    )
    const location = requireString(raw.location, 'location', errors)
    const businessType = requireString(
        raw.businessType,
        'businessType',
        errors,
    )

    const liabilityStatus = parseLiability(
        raw.liabilityStatus,
        'liabilityStatus',
        errors,
    )
    if (!liabilityStatus) {
        errors.push('liabilityStatus is required.')
    } else if (
        businessType &&
        liabilityStatus !== expectedLiability(businessType)
    ) {
        errors.push(
            `liabilityStatus "${liabilityStatus}" does not match businessType ` +
                `"${businessType}" (expected "${expectedLiability(businessType)}").`,
        )
    }

    const part1Raw = raw.part1
    let part1: StartupGuide['part1'] = { title: '', sections: [] }

    if (!isRecord(part1Raw)) {
        errors.push('part1 must be an object.')
    } else {
        assertAllowedKeys(part1Raw, PART1_KEYS, 'part1', errors)
        const title = requireString(part1Raw.title, 'part1.title', errors)
        const sectionsRaw = part1Raw.sections
        const sections: StartupSection[] = []

        if (
            !Array.isArray(sectionsRaw) ||
            sectionsRaw.length !== EXPECTED_HEADINGS.length
        ) {
            const count = Array.isArray(sectionsRaw)
                ? sectionsRaw.length
                : 'non-array'
            errors.push(
                `part1.sections must contain exactly ${EXPECTED_HEADINGS.length} ` +
                    `sections (received ${count}).`,
            )
        } else {
            sectionsRaw.forEach((sectionRaw, index) => {
                const field = `part1.sections[${index}]`

                if (!isRecord(sectionRaw)) {
                    errors.push(`${field} must be an object.`)
                    return
                }

                assertAllowedKeys(sectionRaw, SECTION_KEYS, field, errors)

                const heading = requireString(
                    sectionRaw.heading,
                    `${field}.heading`,
                    errors,
                )
                if (
                    heading &&
                    heading !== EXPECTED_HEADINGS[index]
                ) {
                    errors.push(
                        `${field}.heading must be "${EXPECTED_HEADINGS[index]}" ` +
                            `(received "${heading}").`,
                    )
                }

                const points = requireStringArray(
                    sectionRaw.points,
                    `${field}.points`,
                    2,
                    4,
                    errors,
                )

                const sectionLiability = parseLiability(
                    sectionRaw.liabilityStatus,
                    `${field}.liabilityStatus`,
                    errors,
                )
                if (
                    sectionLiability &&
                    businessType &&
                    sectionLiability !== expectedLiability(businessType)
                ) {
                    errors.push(
                        `${field}.liabilityStatus "${sectionLiability}" does not match ` +
                            `businessType "${businessType}".`,
                    )
                }

                const minimumStatutory =
                    sectionRaw.minimumStatutory !== undefined
                        ? requireString(
                              sectionRaw.minimumStatutory,
                              `${field}.minimumStatutory`,
                              errors,
                          )
                        : undefined
                const realisticEstimate =
                    sectionRaw.realisticEstimate !== undefined
                        ? requireString(
                              sectionRaw.realisticEstimate,
                              `${field}.realisticEstimate`,
                              errors,
                          )
                        : undefined

                if (heading === 'Startup Capital') {
                    if (!minimumStatutory) {
                        errors.push(
                            `${field}.minimumStatutory is required for Startup Capital.`,
                        )
                    }
                    if (!realisticEstimate) {
                        errors.push(
                            `${field}.realisticEstimate is required for Startup Capital.`,
                        )
                    }
                }

                sections.push({
                    heading,
                    ...(sectionLiability
                        ? { liabilityStatus: sectionLiability }
                        : {}),
                    ...(minimumStatutory ? { minimumStatutory } : {}),
                    ...(realisticEstimate ? { realisticEstimate } : {}),
                    points,
                })
            })
        }

        part1 = { title, sections }
    }

    const part2Raw = raw.part2
    let part2: StartupGuide['part2'] = {
        title: '',
        steps: [],
        localAuthorityLicense: {
            council: '',
            portal: '',
            license: '',
            documents: [],
            fee: '',
            processingTime: '',
        },
        industryLicenses: [],
        taxRegistration: {
            body: '',
            portal: '',
            form: '',
            timeline: '',
            fee: '',
        },
        sstRegistration: '',
    }

    if (!isRecord(part2Raw)) {
        errors.push('part2 must be an object.')
    } else {
        assertAllowedKeys(part2Raw, PART2_KEYS, 'part2', errors)

        const title = requireString(part2Raw.title, 'part2.title', errors)

        const stepsRaw = part2Raw.steps
        const steps: StartupStep[] = []

        if (
            !Array.isArray(stepsRaw) ||
            stepsRaw.length < 5 ||
            stepsRaw.length > 8
        ) {
            const count = Array.isArray(stepsRaw)
                ? stepsRaw.length
                : 'non-array'
            errors.push(
                `part2.steps must contain 5-8 steps (received ${count}).`,
            )
        } else {
            stepsRaw.forEach((stepRaw, index) => {
                const field = `part2.steps[${index}]`

                if (!isRecord(stepRaw)) {
                    errors.push(`${field} must be an object.`)
                    return
                }

                assertAllowedKeys(stepRaw, STEP_KEYS, field, errors)

                const numericStep = Number(stepRaw.stepNumber)
                const stepNumber = Number.isFinite(numericStep)
                    ? Math.round(numericStep)
                    : 0

                if (stepNumber !== index + 1) {
                    errors.push(
                        `${field}.stepNumber must be ${index + 1} ` +
                            `(received ${String(stepRaw.stepNumber)}).`,
                    )
                }

                const stepTitle = requireString(
                    stepRaw.title,
                    `${field}.title`,
                    errors,
                )
                const where = requireString(
                    stepRaw.where,
                    `${field}.where`,
                    errors,
                )
                const documents = requireStringArray(
                    stepRaw.documents,
                    `${field}.documents`,
                    2,
                    5,
                    errors,
                )
                const fee = requireString(
                    stepRaw.fee,
                    `${field}.fee`,
                    errors,
                )
                const processingTime = requireString(
                    stepRaw.processingTime,
                    `${field}.processingTime`,
                    errors,
                )
                const note =
                    stepRaw.note !== undefined
                        ? requireString(
                              stepRaw.note,
                              `${field}.note`,
                              errors,
                          )
                        : undefined

                steps.push({
                    stepNumber,
                    title: stepTitle,
                    where,
                    documents,
                    fee,
                    processingTime,
                    ...(note ? { note } : {}),
                })
            })
        }

        const localRaw = part2Raw.localAuthorityLicense
        let localAuthorityLicense = part2.localAuthorityLicense

        if (!isRecord(localRaw)) {
            errors.push('part2.localAuthorityLicense must be an object.')
        } else {
            const field = 'part2.localAuthorityLicense'
            assertAllowedKeys(
                localRaw,
                LOCAL_AUTHORITY_KEYS,
                field,
                errors,
            )

            localAuthorityLicense = {
                council: requireString(
                    localRaw.council,
                    `${field}.council`,
                    errors,
                ),
                portal: validatePortal(
                    localRaw.portal,
                    `${field}.portal`,
                    errors,
                ),
                license: requireString(
                    localRaw.license,
                    `${field}.license`,
                    errors,
                ),
                documents: requireStringArray(
                    localRaw.documents,
                    `${field}.documents`,
                    2,
                    5,
                    errors,
                ),
                fee: requireString(localRaw.fee, `${field}.fee`, errors),
                processingTime: requireString(
                    localRaw.processingTime,
                    `${field}.processingTime`,
                    errors,
                ),
            }
        }

        const industryRaw = part2Raw.industryLicenses
        const industryLicenses: IndustryLicense[] = []

        if (
            !Array.isArray(industryRaw) ||
            industryRaw.length < 1 ||
            industryRaw.length > 3
        ) {
            const count = Array.isArray(industryRaw)
                ? industryRaw.length
                : 'non-array'
            errors.push(
                `part2.industryLicenses must contain 1-3 items (received ${count}).`,
            )
        } else {
            industryRaw.forEach((licenseRaw, index) => {
                const field = `part2.industryLicenses[${index}]`

                if (!isRecord(licenseRaw)) {
                    errors.push(`${field} must be an object.`)
                    return
                }

                assertAllowedKeys(
                    licenseRaw,
                    INDUSTRY_LICENSE_KEYS,
                    field,
                    errors,
                )

                industryLicenses.push({
                    licenseName: requireString(
                        licenseRaw.licenseName,
                        `${field}.licenseName`,
                        errors,
                    ),
                    issuingBody: requireString(
                        licenseRaw.issuingBody,
                        `${field}.issuingBody`,
                        errors,
                    ),
                    portal: validatePortal(
                        licenseRaw.portal,
                        `${field}.portal`,
                        errors,
                        true,
                    ),
                    fee: requireString(
                        licenseRaw.fee,
                        `${field}.fee`,
                        errors,
                    ),
                    processingTime: requireString(
                        licenseRaw.processingTime,
                        `${field}.processingTime`,
                        errors,
                    ),
                })
            })
        }

        const taxRaw = part2Raw.taxRegistration
        let taxRegistration = part2.taxRegistration

        if (!isRecord(taxRaw)) {
            errors.push('part2.taxRegistration must be an object.')
        } else {
            const field = 'part2.taxRegistration'
            assertAllowedKeys(
                taxRaw,
                TAX_REGISTRATION_KEYS,
                field,
                errors,
            )

            taxRegistration = {
                body: requireString(
                    taxRaw.body,
                    `${field}.body`,
                    errors,
                ),
                portal: validatePortal(
                    taxRaw.portal,
                    `${field}.portal`,
                    errors,
                ),
                form: requireString(
                    taxRaw.form,
                    `${field}.form`,
                    errors,
                ),
                timeline: requireString(
                    taxRaw.timeline,
                    `${field}.timeline`,
                    errors,
                ),
                fee: requireString(taxRaw.fee, `${field}.fee`, errors),
            }
        }

        const sstRegistration = requireString(
            part2Raw.sstRegistration,
            'part2.sstRegistration',
            errors,
        )

        part2 = {
            title,
            steps,
            localAuthorityLicense,
            industryLicenses,
            taxRegistration,
            sstRegistration,
        }
    }

    const stageNote = requireString(
        raw.stageNote,
        'stageNote',
        errors,
    )
    const disclaimer = requireString(
        raw.disclaimer,
        'disclaimer',
        errors,
    )

    if (errors.length > 0) {
        throw new SyntaxError(
            `Invalid startup guide response: ${errors.join(' ')}`,
        )
    }

    return {
        company,
        industry,
        businessStage,
        location,
        businessType,
        liabilityStatus: liabilityStatus!,
        part1,
        part2,
        stageNote,
        disclaimer,
    }
}
