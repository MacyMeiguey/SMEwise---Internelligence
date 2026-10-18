/**
 * validateGeneratedDocument — contract check for the Report / Document Generator.
 *
 * The harness returns a large JSON document that is rendered and exported to
 * PDF/DOCX. Validate the shape before the client sees it:
 *
 *   - documentType matches the requested type
 *   - 5-11 sections, each with a title and string / string[] content
 *   - optional chart with at least two numeric points
 *   - companyName and generatedAt are overridden with request/server values
 *   - no unknown keys at any level
 *
 * Structural failures throw SyntaxError so the route's retry loop can ask the
 * harness for a fresh response.
 */

export const DOCUMENT_TYPES = [
    'Business Plan Summary',
    'SWOT Analysis',
    'Monthly Operations Report',
    'Investor Pitch Outline',
    'Staff Onboarding Checklist',
    'Marketing Brief',
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

const TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
    'documentType',
    'companyName',
    'generatedAt',
    'sections',
    'disclaimer',
])

const SECTION_KEYS: ReadonlySet<string> = new Set([
    'title',
    'content',
    'chart',
])

const CHART_KEYS: ReadonlySet<string> = new Set([
    'type',
    'yAxisLabel',
    'series',
])

const SERIES_KEYS: ReadonlySet<string> = new Set(['label', 'value'])

export interface SeriesPoint {
    label: string
    value: number
}

export interface SectionChartSpec {
    type: 'bar' | 'line'
    yAxisLabel?: string
    series: SeriesPoint[]
}

export interface DocumentSection {
    title: string
    content: string | string[]
    chart?: SectionChartSpec
}

export interface GeneratedDocument {
    documentType: DocumentType
    companyName: string
    generatedAt: string
    sections: DocumentSection[]
    disclaimer: string
}

export interface ValidateGeneratedDocumentOptions {
    documentType: string
    companyName: string
    /** Injectable clock for deterministic tests. */
    now?: Date
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

function validateContent(
    value: unknown,
    field: string,
    errors: string[],
): string | string[] {
    if (typeof value === 'string') {
        return requireString(value, field, errors)
    }

    if (Array.isArray(value)) {
        if (value.length === 0 || value.length > 50) {
            errors.push(`${field} must contain 1-50 items.`)
            return []
        }
        return value.map((item, index) =>
            requireString(item, `${field}[${index}]`, errors),
        )
    }

    errors.push(`${field} must be a string or an array of strings.`)
    return ''
}

function validateChart(
    value: unknown,
    field: string,
    errors: string[],
): SectionChartSpec | undefined {
    if (value === undefined) return undefined

    if (!isRecord(value)) {
        errors.push(`${field} must be an object.`)
        return undefined
    }

    assertAllowedKeys(value, CHART_KEYS, field, errors)

    const type = requireString(value.type, `${field}.type`, errors)
    if (type !== 'bar' && type !== 'line') {
        errors.push(`${field}.type must be "bar" or "line" (received "${type}").`)
    }

    const yAxisLabel =
        value.yAxisLabel !== undefined
            ? requireString(value.yAxisLabel, `${field}.yAxisLabel`, errors)
            : undefined

    const seriesRaw = value.series
    const series: SeriesPoint[] = []

    if (!Array.isArray(seriesRaw) || seriesRaw.length < 2) {
        const count = Array.isArray(seriesRaw) ? seriesRaw.length : 'non-array'
        errors.push(
            `${field}.series must contain at least 2 data points (received ${count}).`,
        )
    } else {
        seriesRaw.forEach((item, index) => {
            const itemField = `${field}.series[${index}]`
            if (!isRecord(item)) {
                errors.push(`${itemField} must be an object.`)
                return
            }

            assertAllowedKeys(item, SERIES_KEYS, itemField, errors)

            const label = requireString(
                item.label,
                `${itemField}.label`,
                errors,
            )
            const numericValue =
                typeof item.value === 'number'
                    ? item.value
                    : Number(item.value)
            if (!Number.isFinite(numericValue)) {
                errors.push(`${itemField}.value must be a finite number.`)
            }

            series.push({ label, value: numericValue })
        })
    }

    return {
        type: type === 'line' ? 'line' : 'bar',
        ...(yAxisLabel ? { yAxisLabel } : {}),
        series,
    }
}

export function validateGeneratedDocument(
    input: unknown,
    options: ValidateGeneratedDocumentOptions,
): GeneratedDocument {
    if (!isRecord(input)) {
        throw new SyntaxError(
            'Generated document response was not a JSON object.',
        )
    }

    const raw = input
    const errors: string[] = []

    assertAllowedKeys(raw, TOP_LEVEL_KEYS, 'document', errors)

    const requestedType = options.documentType.trim()
    if (!(DOCUMENT_TYPES as readonly string[]).includes(requestedType)) {
        throw new SyntaxError(
            `Unsupported documentType "${options.documentType}".`,
        )
    }

    const rawType = requireString(
        raw.documentType,
        'documentType',
        errors,
    )
    if (rawType && rawType !== requestedType) {
        errors.push(
            `documentType "${rawType}" does not match the requested type ` +
                `"${requestedType}".`,
        )
    }

    const companyName = requireString(
        raw.companyName,
        'companyName',
        errors,
    )

    const sectionsRaw = raw.sections
    const sections: DocumentSection[] = []

    if (
        !Array.isArray(sectionsRaw) ||
        sectionsRaw.length < 5 ||
        sectionsRaw.length > 11
    ) {
        const count = Array.isArray(sectionsRaw)
            ? sectionsRaw.length
            : 'non-array'
        errors.push(
            `sections must contain 5-11 items (received ${count}).`,
        )
    } else {
        sectionsRaw.forEach((sectionRaw, index) => {
            const field = `sections[${index}]`

            if (!isRecord(sectionRaw)) {
                errors.push(`${field} must be an object.`)
                return
            }

            assertAllowedKeys(sectionRaw, SECTION_KEYS, field, errors)

            const title = requireString(
                sectionRaw.title,
                `${field}.title`,
                errors,
            )
            const content = validateContent(
                sectionRaw.content,
                `${field}.content`,
                errors,
            )
            const chart = validateChart(
                sectionRaw.chart,
                `${field}.chart`,
                errors,
            )

            sections.push({
                title,
                content,
                ...(chart ? { chart } : {}),
            })
        })
    }

    const disclaimer = requireString(
        raw.disclaimer,
        'disclaimer',
        errors,
    )

    if (errors.length > 0) {
        throw new SyntaxError(
            `Invalid generated document: ${errors.join(' ')}`,
        )
    }

    return {
        documentType: requestedType as DocumentType,
        companyName: options.companyName || companyName,
        generatedAt: (options.now ?? new Date()).toISOString(),
        sections,
        disclaimer,
    }
}
