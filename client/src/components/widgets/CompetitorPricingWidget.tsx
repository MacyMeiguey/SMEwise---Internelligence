/**
 * CompetitorPricingWidget — Pricing Strategy Section
 * Calls the Bedrock competitor-pricing agent and renders a structured
 * analysis card. Exposes parsed JSON via onAnalysisComplete so the
 * SmartPricingWidget can use it as market intelligence input.
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { useState, useCallback, useEffect } from 'react'
import type { BusinessProfile, PricingOptionalInputs } from '../../types'
import { useWidgetState } from '../../hooks/useWidgetState'
import WidgetCard from '../WidgetCard'
import { API_BASE } from '../../lib/api'

// ─── Exact schema from agent instruction ─────────────────────────────────────

export interface CompetitorAnalysisResult {
  company?: string
  industry?: string
  location?: string
  targetCustomer?: string
  marketSnapshot?: {
    typicalPriceRange: string
    expectedCustomerPrice: string
    competitionLevel: string
    mainPricingFactor: string
  }
  competitorOverview?: Array<{
    competitorType: string
    exampleNames: string
    priceRange: string
    strength: string
    weakness: string
    sources?: Array<{ name: string; url: string }>
  }>
  recommendedPositioning?: {
    marketPosition: string      // non-price whitespace description
    reason: string
    bestDifferentiator: string  // non-price advantage only
  }
  marketWarning?: string
  bottomLine?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href : null
  } catch { return null }
}

function competitionBadgeClass(level: string) {
  const l = level.toLowerCase()
  if (l.includes('high'))   return 'bg-red-500/20 text-red-300 border border-red-500/30'
  if (l.includes('low'))    return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
  return 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
}

const PRICE_PILL_CLASSES = [
  'bg-emerald-500/20 text-emerald-300',
  'bg-primary-500/25 text-primary-300',
  'bg-primary-500/20 text-primary-300',
  'bg-teal-500/20 text-teal-300',
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SnapshotPill({
  label, value, isLevel,
}: { label: string; value: string; isLevel?: boolean }) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-1.5 min-w-0 bg-neutral-50 border border-neutral-200 dark:bg-white/[0.04] dark:border-white/[0.08]">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500 whitespace-normal leading-snug">
        {label}
      </span>
      {isLevel ? (
        <span className={`self-start rounded-full border px-2 py-0.5 text-xs font-semibold break-words ${competitionBadgeClass(value)}`}>
          {value}
        </span>
      ) : (
        <span className="text-sm font-bold text-neutral-900 dark:text-white break-words leading-snug">{value}</span>
      )}
    </div>
  )
}

function CompetitorCard({
  entry, index,
}: { entry: NonNullable<CompetitorAnalysisResult['competitorOverview']>[0]; index: number }) {
  const pillClass = PRICE_PILL_CLASSES[index % PRICE_PILL_CLASSES.length]
  const sources = (Array.isArray(entry.sources) ? entry.sources : []).flatMap(source => {
    if (!source || typeof source.name !== 'string' || !source.name.trim()) return []
    const url = safeSourceUrl(source.url)
    return url ? [{ name: source.name, url }] : []
  })
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 min-w-0 overflow-hidden hover:-translate-y-0.5 transition-transform duration-200 dark:border-white/[0.08] dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
        <span className="font-semibold text-neutral-900 dark:text-white text-sm leading-snug min-w-0 break-words">
          {entry.competitorType}
        </span>
        {entry.priceRange && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-normal break-words text-center max-w-[40%] ${pillClass}`}>
            {entry.priceRange}
          </span>
        )}
      </div>
      {entry.exampleNames && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2 break-words">{entry.exampleNames}</p>
      )}
      {sources.length > 0 && (
        <div className="flex flex-col gap-1 mb-3 text-xs">
          {sources.map((source, sourceIndex) => (
            <a
              key={`${source.url}-${sourceIndex}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-300 underline underline-offset-2 break-words"
            >
              View source — {source.name} ↗
            </a>
          ))}
        </div>
      )}
      <p className="text-xs leading-relaxed break-words">
        {entry.strength && (
          <span className="text-emerald-600 dark:text-emerald-400">
            <span className="font-bold">+</span> {entry.strength}
          </span>
        )}
        {entry.strength && entry.weakness && (
          <span className="text-neutral-300 dark:text-neutral-600 mx-1.5">·</span>
        )}
        {entry.weakness && (
          <span className="text-red-500 dark:text-red-400">
            <span className="font-bold">−</span> {entry.weakness}
          </span>
        )}
      </p>
    </div>
  )
}

function AnalysisResult({ data }: { data: CompetitorAnalysisResult }) {
  const snap = data.marketSnapshot
  const pos  = data.recommendedPositioning
  const competitors = data.competitorOverview ?? []

  return (
    <div className="flex flex-col gap-5">

      {/* ── Market snapshot ── */}
      {snap && (
        <div className="grid grid-cols-3 gap-2 min-w-0">
          <SnapshotPill label="Market Range"   value={snap.typicalPriceRange} />
          <SnapshotPill label="Sweet Spot"     value={snap.expectedCustomerPrice} />
          <SnapshotPill label="Competition"    value={snap.competitionLevel} isLevel />
        </div>
      )}

      {/* ── Competitors ── */}
      {competitors.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500">
            Competitors
          </span>
          {competitors.map((c, i) => (
            <CompetitorCard key={i} entry={c} index={i} />
          ))}
        </div>
      )}

      {/* ── Recommended position ── */}
      {pos && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-500/40 dark:bg-primary-500/10">
          <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 mb-1">
            Recommended position
          </p>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
            {pos.marketPosition}
          </p>
          <p className="text-xs text-primary-800 dark:text-primary-300/80 leading-relaxed">
            {pos.reason}
            {pos.bestDifferentiator && (
              <> Lead with <span className="font-medium">{pos.bestDifferentiator}</span>.</>
            )}
          </p>
        </div>
      )}

      {/* ── Watch out ── */}
      {data.marketWarning && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex gap-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <span className="text-amber-500 dark:text-amber-400 shrink-0 text-base">⚠</span>
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Watch out</p>
            <p className="text-xs text-amber-800 dark:text-amber-200/80 leading-relaxed">
              {data.marketWarning}
            </p>
          </div>
        </div>
      )}

      {/* ── Bottom line ── */}
      {data.bottomLine && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
            Bottom Line
          </p>
          <p className="text-sm text-neutral-900 dark:text-white leading-relaxed">{data.bottomLine}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CompetitorPricingWidgetProps {
  profile: BusinessProfile
  pricingInputs: PricingOptionalInputs
  onGenerateRef?: (fn: () => Promise<void>) => void
  /** Called with the parsed JSON after successful generation — used by SmartPricingWidget */
  onAnalysisComplete?: (result: CompetitorAnalysisResult) => void
  onBeforeGenerate?: () => boolean
}

export default function CompetitorPricingWidget({
  profile,
  pricingInputs,
  onGenerateRef,
  onAnalysisComplete,
  onBeforeGenerate, 
}: CompetitorPricingWidgetProps) {
  const { state, generate } = useWidgetState()
  const [analysis, setAnalysis]       = useState<CompetitorAnalysisResult | null>(null)
  const [rawFallback, setRawFallback] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const handleGenerate = useCallback(async () => {
     if (onBeforeGenerate && !onBeforeGenerate()) return
    setAnalysis(null)
    setRawFallback('')
    setErrorMessage('')

    await generate(async () => {
      const products: Array<{ name: string; cost: string }> = []
      if (pricingInputs.productServiceNames) {
        const names = pricingInputs.productServiceNames.split('\n').map(s => s.trim()).filter(Boolean)
        const costs = pricingInputs.costPerProduct
          ? pricingInputs.costPerProduct.split('\n').map(s => s.trim()).filter(Boolean)
          : []
        names.forEach((name, i) => products.push({ name, cost: costs[i] ?? '' }))
      }

      const url = `${API_BASE}/api/bedrock/competitor-pricing`
      console.log('[CompetitorPricing] POST', url)

      let res: Response
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName:    profile.companyName,
            industry:       profile.industry,
            city:           profile.city,
            targetCustomer: profile.targetCustomer,
            businessType:   profile.businessType,
            monthlyRevenue: pricingInputs.monthlyRevenueRange ?? undefined,
            products:       products.length > 0 ? products : undefined,
          }),
        })
      } catch (networkErr) {
        console.error('[CompetitorPricing] Network error:', networkErr)
        throw new Error('Cannot reach the server. Make sure npm run dev is running.')
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('[CompetitorPricing] HTTP error:', res.status, text)
        throw new Error(`Server error ${res.status}`)
      }

      const json = await res.json() as { content?: string; error?: string }
      if (json.error) throw new Error(json.error)
      if (!json.content) throw new Error('Empty response from server')

      console.log('[CompetitorPricing] Response length:', json.content.length)

      let cleaned = json.content.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim()
      }
      const start = cleaned.indexOf('{')
      const end   = cleaned.lastIndexOf('}')
      if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1)

      try {
        const parsed = JSON.parse(cleaned) as CompetitorAnalysisResult & { error?: boolean; errorMessage?: string }
        if (parsed.error === true) {
          setErrorMessage(parsed.errorMessage ?? 'An error occurred. Please check your inputs and try again.')
          return
        }
        setAnalysis(parsed)
        onAnalysisComplete?.(parsed)
      } catch {
        console.warn('[CompetitorPricing] JSON parse failed — showing raw text')
        setRawFallback(json.content)
      }
    })
  }, [profile, pricingInputs, generate, onAnalysisComplete])

  useEffect(() => {
    onGenerateRef?.(handleGenerate)
  }, [onGenerateRef, handleGenerate])

  return (
    <WidgetCard
      title="Competitor Pricing Analysis"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Benchmarks peers around your city and category — add products and costs above for sharper results."
      idleButtonLabel="Benchmark peers"
      regenerateLabel="Refresh benchmark"
    >
      {analysis ? (
        <AnalysisResult data={analysis} />
      ) : rawFallback ? (
        <pre className="whitespace-pre-wrap font-sans text-sm text-primary-300 leading-relaxed">
          {rawFallback}
      </pre>
      ) : null}
      {errorMessage && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">
              Unable to generate analysis
            </span>
          </div>
          <p className="text-xs text-red-800 dark:text-red-200/80 leading-relaxed">
            {errorMessage}
          </p>
        </div>
      )}
    </WidgetCard>
  )
}
