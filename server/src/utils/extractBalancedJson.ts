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
