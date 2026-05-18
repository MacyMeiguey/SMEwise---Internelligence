/**
 * PricingHistoryWidget — Pricing Strategy Section
 *
 * Caches every pricing analysis run (product names + costs entered by the user)
 * alongside the competitor analysis and smart pricing results generated at that
 * time. Each entry is stored in localStorage and displayed as a collapsible
 * accordion row. Clicking a row expands it to reveal the full analysis results.
 *
 * Widget name: "Pricing Intelligence Log"
 */

import { useState, useEffect, useCallback } from 'react'
import type { PricingOptionalInputs } from '../../types'
import type { CompetitorAnalysisResult } from './CompetitorPricingWidget'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmartPricingEntry {
  productName: string
  cost: string
  recommendedPrice: string
  profitPerUnit: string
  marginPercentage: string
  pricingMethod: string
  marketPosition: string
}

interface SmartPricingSnapshot {
  pricingOverview?: {
    averageMarkup: string
    averageMargin: string
    marginVsMarket: string
  }
  productPricing?: SmartPricingEntry[]
  pricingRisks?: string
  quickRevenueOpportunity?: string
}

export interface PricingHistoryEntry {
  id: string
  timestamp: number
  /** Products/services the user entered */
  products: Array<{ name: string; cost: string }>
  monthlyRevenueRange: string | null
  competitorResult: CompetitorAnalysisResult | null
  smartPricingResult: SmartPricingSnapshot | null
}

const STORAGE_KEY = 'smewise_pricing_history'
const MAX_ENTRIES = 20

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadHistory(): PricingHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PricingHistoryEntry[]
  } catch {
    return []
  }
}

function saveHistory(entries: PricingHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    // quota exceeded — silently ignore
  }
}

export function appendHistoryEntry(entry: PricingHistoryEntry) {
  const existing = loadHistory()
  // Deduplicate by same product names + costs within the last 60 s
  const isDuplicate = existing.some(
    (e) =>
      Date.now() - e.timestamp < 60_000 &&
      JSON.stringify(e.products) === JSON.stringify(entry.products),
  )
  if (isDuplicate) return
  saveHistory([entry, ...existing])
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CompetitionBadge({ level }: { level: string }) {
  const l = level.toLowerCase()
  const cls = l.includes('high')
    ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
    : l.includes('low')
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{level}</span>
  )
}

function CompetitorPanel({ data }: { data: CompetitorAnalysisResult }) {
  const snap = data.marketSnapshot
  const competitors = data.competitorOverview ?? []
  const pos = data.recommendedPositioning

  return (
    <div className="flex flex-col gap-4">
      {/* Snapshot pills */}
      {snap && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Market Range', value: snap.typicalPriceRange },
            { label: 'Sweet Spot', value: snap.expectedCustomerPrice },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">{s.label}</p>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">{s.value}</p>
            </div>
          ))}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Competition</p>
            <CompetitionBadge level={snap.competitionLevel} />
          </div>
        </div>
      )}

      {/* Competitors */}
      {competitors.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500">Competitors</p>
          {competitors.map((c, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">{c.competitorType}</span>
                <span className="shrink-0 rounded-full bg-violet-100 text-violet-700 dark:bg-[#7c3aed]/20 dark:text-[#a78bfa] px-2 py-0.5 text-[10px] font-semibold">{c.priceRange}</span>
              </div>
              {c.exampleNames && <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mb-1">e.g. {c.exampleNames}</p>}
              <p className="text-[11px] leading-relaxed">
                <span className="text-emerald-600 dark:text-emerald-400">+ {c.strength}</span>
                <span className="text-neutral-300 dark:text-neutral-600 mx-1">·</span>
                <span className="text-red-500 dark:text-red-400">− {c.weakness}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Recommended position */}
      {pos && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 dark:border-[#7c3aed]/30 dark:bg-[#7c3aed]/10">
          <p className="text-[10px] font-semibold text-violet-600 dark:text-[#a78bfa] mb-1">Recommended Position</p>
          <p className="text-xs font-semibold text-neutral-900 dark:text-white mb-0.5">{pos.marketPosition}</p>
          <p className="text-[11px] text-violet-700 dark:text-[#a78bfa]/80 leading-relaxed">{pos.reason}</p>
        </div>
      )}

      {/* Warning + Bottom line */}
      {data.marketWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/25 dark:bg-amber-500/10">
          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-0.5">⚠ Watch out</p>
          <p className="text-[11px] text-amber-800 dark:text-amber-200/80 leading-relaxed">{data.marketWarning}</p>
        </div>
      )}
      {data.bottomLine && (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed italic">{data.bottomLine}</p>
      )}
    </div>
  )
}

function SmartPricingPanel({ data }: { data: SmartPricingSnapshot }) {
  const overview = data.pricingOverview
  const products = data.productPricing ?? []

  return (
    <div className="flex flex-col gap-4">
      {/* Overview stats */}
      {overview && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Avg Markup', value: overview.averageMarkup },
            { label: 'Avg Markup', value: overview.averageMarkup },
            { label: 'Margin vs Market', value: overview.marginVsMarket },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">{s.label}</p>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Product pricing rows */}
      {products.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500">Pricing Recommendation</p>
          {products.map((p, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">{p.productName}</span>
                <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">{p.marketPosition}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Cost {p.cost}</span>
                <span className="text-neutral-300 dark:text-neutral-600">→</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.recommendedPrice}</span>
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{p.marginPercentage} margin</span>
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
                <span className="text-neutral-500 dark:text-neutral-400">{p.profitPerUnit} profit/unit</span>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">Method: {p.pricingMethod}</p>
            </div>
          ))}
        </div>
      )}

      {/* Callouts */}
      {(data.pricingRisks || data.quickRevenueOpportunity) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.pricingRisks && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/25 dark:bg-amber-500/10">
              <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-1">⚠ Pricing Risk</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-200/80 leading-relaxed">{data.pricingRisks}</p>
            </div>
          )}
          {data.quickRevenueOpportunity && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-[#7c3aed]/25 dark:bg-[#7c3aed]/10">
              <p className="text-[10px] font-semibold text-blue-700 dark:text-[#a78bfa] mb-1">⚡ Revenue Opportunity</p>
              <p className="text-[11px] text-blue-800 dark:text-[#a78bfa]/80 leading-relaxed">{data.quickRevenueOpportunity}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── History entry row ────────────────────────────────────────────────────────

function HistoryRow({ entry, onDelete }: { entry: PricingHistoryEntry; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'competitor' | 'pricing'>('competitor')

  const date = new Date(entry.timestamp)
  const dateStr = date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })

  const productLabel = entry.products.length > 0
    ? entry.products.map(p => p.name).join(', ')
    : 'No products specified'

  const hasCompetitor = !!entry.competitorResult
  const hasSmart = !!entry.smartPricingResult

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden transition-all duration-200 dark:border-white/[0.09] dark:bg-[#101018]">
      {/* Row header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors"
        aria-expanded={expanded}
      >
        {/* Chevron */}
        <span className={`shrink-0 text-neutral-400 dark:text-neutral-500 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </span>

        {/* Product names */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{productLabel}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{dateStr} · {timeStr}</span>
            {entry.monthlyRevenueRange && (
              <span className="text-[10px] rounded-full bg-neutral-100 dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400 px-2 py-0.5">
                {entry.monthlyRevenueRange}
              </span>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasCompetitor && (
            <span className="rounded-full bg-violet-100 text-violet-700 dark:bg-[#7c3aed]/20 dark:text-[#a78bfa] text-[10px] font-semibold px-2 py-0.5">
              Competitor ✓
            </span>
          )}
          {hasSmart && (
            <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[10px] font-semibold px-2 py-0.5">
              Pricing ✓
            </span>
          )}
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
          className="shrink-0 p-1 rounded-lg text-neutral-300 hover:text-red-400 dark:text-neutral-600 dark:hover:text-red-400 transition-colors"
          aria-label="Delete entry"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </button>

      {/* Expanded content */}
      {expanded && (hasCompetitor || hasSmart) && (
        <div className="border-t border-neutral-100 dark:border-white/[0.06] px-4 pb-4 pt-3">
          {/* Product + cost summary */}
          {entry.products.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {entry.products.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
                  <span className="text-xs font-medium text-neutral-900 dark:text-white">{p.name}</span>
                  {p.cost && (
                    <>
                      <span className="text-neutral-300 dark:text-neutral-600">·</span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">{p.cost}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tab switcher */}
          {hasCompetitor && hasSmart && (
            <div className="flex gap-1 mb-4 p-1 rounded-lg bg-neutral-100 dark:bg-white/[0.05] w-fit">
              {(['competitor', 'pricing'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                    activeTab === tab
                      ? 'bg-white text-neutral-900 shadow-sm dark:bg-[#1a1728] dark:text-white'
                      : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  {tab === 'competitor' ? '🏪 Competitor Analysis' : '💰 Smart Pricing'}
                </button>
              ))}
            </div>
          )}

          {/* Tab content */}
          {(activeTab === 'competitor' || !hasSmart) && hasCompetitor && (
            <CompetitorPanel data={entry.competitorResult!} />
          )}
          {(activeTab === 'pricing' || !hasCompetitor) && hasSmart && (
            <SmartPricingPanel data={entry.smartPricingResult!} />
          )}
        </div>
      )}

      {/* Expanded but no data yet */}
      {expanded && !hasCompetitor && !hasSmart && (
        <div className="border-t border-neutral-100 dark:border-white/[0.06] px-4 py-4">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
            No analysis results were saved for this search. Run Competitor Analysis or Smart Pricing to populate.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main widget ──────────────────────────────────────────────────────────────

interface PricingHistoryWidgetProps {
  pricingInputs: PricingOptionalInputs
  competitorResult: CompetitorAnalysisResult | null
  smartPricingResult: SmartPricingSnapshot | null
}

export default function PricingHistoryWidget({
  pricingInputs,
  competitorResult,
  smartPricingResult,
}: PricingHistoryWidgetProps) {
  const [entries, setEntries] = useState<PricingHistoryEntry[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    setEntries(loadHistory())
  }, [])

  // When either analysis result arrives, save a new history entry
  useEffect(() => {
    if (!competitorResult && !smartPricingResult) return

    const products: Array<{ name: string; cost: string }> = []
    if (pricingInputs.productServiceNames) {
      const names = pricingInputs.productServiceNames.split('\n').map(s => s.trim()).filter(Boolean)
      const costs = pricingInputs.costPerProduct
        ? pricingInputs.costPerProduct.split('\n').map(s => s.trim()).filter(Boolean)
        : []
      names.forEach((name, i) => products.push({ name, cost: costs[i] ?? '' }))
    }

    const entry: PricingHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      products,
      monthlyRevenueRange: pricingInputs.monthlyRevenueRange,
      competitorResult: competitorResult ?? null,
      smartPricingResult: smartPricingResult ?? null,
    }

    appendHistoryEntry(entry)
    setEntries(loadHistory())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitorResult, smartPricingResult])

  const handleDelete = useCallback((id: string) => {
    const updated = entries.filter(e => e.id !== id)
    saveHistory(updated)
    setEntries(updated)
  }, [entries])

  const handleClearAll = useCallback(() => {
    saveHistory([])
    setEntries([])
  }, [])

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm dark:border-white/[0.09] dark:bg-[#101018] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/80 px-5 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight">
            Pricing Intelligence Log
          </h3>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
            {entries.length === 0
              ? 'Searches will appear here after you run an analysis'
              : `${entries.length} saved search${entries.length !== 1 ? 'es' : ''} · expand to view results`}
          </p>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] font-medium text-neutral-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Entry list */}
      <div className="p-4 flex flex-col gap-2">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-white/[0.06] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 dark:text-neutral-500" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No searches yet</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                Enter products above and run Competitor Analysis or Smart Pricing
              </p>
            </div>
          </div>
        ) : (
          entries.map(entry => (
            <HistoryRow key={entry.id} entry={entry} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  )
}
