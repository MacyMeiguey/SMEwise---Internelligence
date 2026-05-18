/**
 * Extract the first top-level `{ ... }` JSON object from text, respecting strings
 * so `}` inside quoted content does not truncate the payload (unlike lastIndexOf).
 */
export function extractBalancedJsonObject(raw: string): string | null {
    const s = raw.trim()
    const start = s.indexOf('{')
    if (start === -1) return null

    let depth = 0
    let inString = false
    let escape = false

    for (let i = start; i < s.length; i++) {
        const c = s[i]!
        if (escape) {
            escape = false
            continue
        }
        if (inString) {
            if (c === '\\') {
                escape = true
                continue
            }
            if (c === '"') inString = false
            continue
        }
        switch (c) {
            case '"':
                inString = true
                break
            case '{':
                depth++
                break
            case '}':
                depth--
                if (depth === 0) return s.slice(start, i + 1)
                break
            default:
                break
        }
    }
    return null
}

/** Escape literal newlines/tabs inside JSON string values (invalid in strict JSON). */
export function escapeControlCharsInJsonStrings(json: string): string {
    let result = ''
    let inString = false
    let escape = false

    for (let i = 0; i < json.length; i++) {
        const c = json[i]!
        if (escape) {
            result += c
            escape = false
            continue
        }
        if (inString) {
            if (c === '\\') {
                escape = true
                result += c
            } else if (c === '"') {
                inString = false
                result += c
            } else if (c === '\n') {
                result += '\\n'
            } else if (c === '\r') {
                result += '\\r'
            } else if (c === '\t') {
                result += '\\t'
            } else {
                result += c
            }
            continue
        }
        if (c === '"') inString = true
        result += c
    }
    return result
}

export function stripTrailingJsonCommas(json: string): string {
    return json.replace(/,(\s*[}\]])/g, '$1')
}
