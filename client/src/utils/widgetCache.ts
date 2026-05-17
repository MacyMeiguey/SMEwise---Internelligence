/**
 * widgetCache — localStorage-backed result cache for auto-generated widgets.
 *
 * Each cache entry stores:
 *   - inputHash  : a short hash of the inputs used to produce the result
 *   - result     : the parsed result object (or raw string for text widgets)
 *   - rawString  : optional raw API response string (needed for widgets whose
 *                  downstream consumers receive the raw text, e.g. Marketing
 *                  Strategy → Guidelines / Forecast)
 *
 * A cache hit is valid only when the current inputHash matches the stored one.
 * If the profile changes, the hash changes → automatic cache miss → regenerate.
 */

const CACHE_PREFIX = "smewise:widget:";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WidgetCacheEntry<T = unknown> {
    inputHash: string;
    result: T;
    /** Raw API response string — only set for widgets that need to pass the raw
     *  text to downstream consumers (e.g. MarketingStrategy). */
    rawString?: string;
}

// ─── Hash ─────────────────────────────────────────────────────────────────────

/**
 * Deterministic djb2-style hash of any JSON-serialisable value.
 * Returns a compact hex string (8 chars).
 */
export function hashInputs(inputs: unknown): string {
    const str = JSON.stringify(inputs, Object.keys(inputs as object).sort());
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
        h = h >>> 0; // keep unsigned 32-bit
    }
    return h.toString(16).padStart(8, "0");
}

// ─── Read / Write ─────────────────────────────────────────────────────────────

export function readCache<T>(widgetKey: string): WidgetCacheEntry<T> | null {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + widgetKey);
        if (!raw) return null;
        return JSON.parse(raw) as WidgetCacheEntry<T>;
    } catch {
        return null;
    }
}

export function writeCache<T>(
    widgetKey: string,
    inputHash: string,
    result: T,
    rawString?: string,
): void {
    try {
        const entry: WidgetCacheEntry<T> = { inputHash, result, ...(rawString !== undefined ? { rawString } : {}) };
        localStorage.setItem(CACHE_PREFIX + widgetKey, JSON.stringify(entry));
    } catch (err) {
        // Quota exceeded or private-mode — silently ignore.
        console.warn("[SMEwise] Failed to write widget cache:", err);
    }
}

export function clearCache(widgetKey: string): void {
    try {
        localStorage.removeItem(CACHE_PREFIX + widgetKey);
    } catch {
        // ignore
    }
}

/**
 * Check whether a stored cache entry is still valid for the given inputs.
 * Returns the entry if valid, null otherwise.
 */
export function checkCache<T>(
    widgetKey: string,
    currentInputs: unknown,
): WidgetCacheEntry<T> | null {
    const entry = readCache<T>(widgetKey);
    if (!entry) return null;
    const currentHash = hashInputs(currentInputs);
    if (entry.inputHash !== currentHash) return null;
    return entry;
}

/**
 * Snapshot every widget cache entry currently in localStorage.
 * Used by the AI advisor to feed the agent the full set of generated outputs
 * as part of the conversation context.
 *
 * Returns an object keyed by widget name (e.g. "fund-allocation") whose values
 * are the parsed `result` field of each cache entry. Entries that fail to
 * parse are silently skipped.
 */
export function getAllWidgetCacheEntries(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(CACHE_PREFIX)) continue;
            const widgetKey = key.slice(CACHE_PREFIX.length);
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            try {
                const entry = JSON.parse(raw) as WidgetCacheEntry<unknown>;
                out[widgetKey] = entry.result;
            } catch {
                // skip malformed entries
            }
        }
    } catch {
        // Some browsers/contexts (private mode quotas, denied storage) throw.
        // Just return whatever we collected so far.
    }
    return out;
}
