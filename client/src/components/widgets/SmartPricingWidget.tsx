/**
 * SmartPricingWidget — Pricing Strategy Section
 * Calls the Bedrock smart-pricing agent with business context + competitor JSON.
 * Renders a structured pricing card matching the reference design.
 * Requirements: 11.3
 */

import { useState, useCallback, useEffect } from 'react'
import type { BusinessProfile, PricingOptionalInputs } from '../../types'
import type { CompetitorAnalysisResult } from './CompetitorPricingWidget'
import { useWidgetState } from '../../hooks/useWidgetState'
import WidgetCard from '../WidgetCard'
import { API_BASE } from '../../lib/api'

// ─── Exact schema from agent instruction ─────────────────────────────────────

interface ProductPricingEntry {
  productName: string
  cost: string
  recommendedPrice: string
  profitPerUnit: string
  marginPercentage: string
  pricingMethod: string
  marketPosition: string
}

interface SmartPricingData {
  company?: string
  industry?: string
  location?: string
  targetCustomer?: string
  pricingOverview?: {
    averageMarkup: string
    averageMargin: string
    marginVsMarket: string
  }
  productPricing?: ProductPricingEntry[]
  pricingRisks?: string
  quickRevenueOpportunity?: string
}

// ─── Result renderer ──────────────────────────────────────────────────────────

function SmartPricingResult({
  data,
  mainGoal,
}: {
  data: SmartPricingData
  mainGoal?: string
}) {
  const overview = data.pricingOverview
  const products = data.productPricing ?? []

  return (
    <div className="flex flex-col gap-5">

      {/* ── Stat boxes ── */}
      {overview && (
        <div className="grid grid-cols-3 gap-2 min-w-0">
          {[
            { label: 'Avg Markup',       value: overview.averageMarkup },
            { label: 'Avg Margin',       value: overview.averageMargin },
            { label: 'Margin vs Market', value: overview.marginVsMarket },
          ].map((s) => (
            <div key={s.label}
              className="rounded-xl border border-neutral-200 bg-white p-2.5 min-w-0
                         dark:border-white/[0.08] dark:bg-[#1a1728]">
              <p className="text-[10px] text-neutral-400 dark:text-[#6b6890] mb-1 uppercase tracking-widest font-medium whitespace-normal leading-snug">
                {s.label}
              </p>
              <p className="text-base font-semibold text-neutral-900 dark:text-white leading-tight break-words">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── SKU price ladder ── */}
      {products.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-[#6b6890] -mb-3">
            SKU Price Ladder
          </p>
          <div className="flex flex-col gap-3">
            {products.map((p, i) => (
              <div key={i}
                className="rounded-xl border border-neutral-200 bg-white p-3 min-w-0 overflow-hidden
                           dark:border-white/[0.08] dark:bg-[#1a1728]">
                <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                  <span className="font-semibold text-neutral-900 dark:text-white text-sm leading-snug min-w-0 break-words">
                    {p.productName}
                  </span>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-normal break-words text-center max-w-[45%]
                                   bg-emerald-100 text-emerald-700
                                   dark:bg-emerald-500/20 dark:text-emerald-300">
                    {p.marketPosition}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs mb-2">
                  <span className="text-neutral-500 dark:text-[#6b6890]">Cost {p.cost}</span>
                  <span className="font-black text-lg text-emerald-400 mx-1">→</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {p.recommendedPrice}
                  </span>
                  <span className="font-black text-lg text-emerald-400 mx-1">·</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {p.marginPercentage} margin
                  </span>
                  <span className="text-neutral-300 dark:text-[#3d3660]">·</span>
                  <span className="text-neutral-500 dark:text-[#6b6890]">
                    {p.profitPerUnit} profit/unit
                  </span>
                </div>
                <p className="text-xs text-neutral-400 dark:text-[#6b6890] break-words">
                  Method: <span className="font-medium text-neutral-600 dark:text-neutral-300">{p.pricingMethod}</span>
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Margin callouts ── */}
      {(data.pricingRisks || data.quickRevenueOpportunity) && (
        <>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-[#6b6890] -mb-3">
            Margin Callouts
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.pricingRisks && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4
                              dark:border-amber-500/30 dark:bg-amber-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Pricing risk
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200/80 leading-relaxed">
                  {data.pricingRisks}
                </p>
              </div>
            )}
            {data.quickRevenueOpportunity && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4
                              dark:border-[#7c3aed]/30 dark:bg-[#7c3aed]/10">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-blue-600 dark:text-[#a78bfa] shrink-0" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  <span className="text-xs font-semibold text-blue-700 dark:text-[#a78bfa]">
                    Revenue opportunity
                  </span>
                </div>
                <p className="text-xs text-blue-800 dark:text-[#a78bfa]/80 leading-relaxed">
                  {data.quickRevenueOpportunity}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Footer goal ── */}
      {mainGoal && (
        <div className="border-t border-neutral-200 dark:border-white/[0.08] pt-3">
          <p className="text-xs text-neutral-400 dark:text-[#6b6890] leading-relaxed">
            Goal: <span className="font-semibold text-neutral-700 dark:text-white">{mainGoal}</span>
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SmartPricingWidgetProps {
  profile: BusinessProfile
  pricingInputs: PricingOptionalInputs
  onGenerateRef?: (fn: () => Promise<void>) => void
  competitorResult?: CompetitorAnalysisResult | null
  onPricingComplete?: (result: SmartPricingData) => void
  onBeforeGenerate?: () => boolean
}

export default function SmartPricingWidget({
  profile,
  pricingInputs,
  onGenerateRef,
  competitorResult,
  onPricingComplete,
  onBeforeGenerate,
}: SmartPricingWidgetProps) {
  const { state, generate } = useWidgetState()
  const [data, setData]               = useState<SmartPricingData | null>(null)
  const [rawFallback, setRawFallback] = useState<string>('')

  const handleGenerate = useCallback(async () => {
    if (onBeforeGenerate && !onBeforeGenerate()) return
    
    setData(null)
    setRawFallback('')
   
    await generate(async () => {
      const products: Array<{ name: string; cost: string }> = []
      if (pricingInputs.productServiceNames) {
        const names = pricingInputs.productServiceNames.split('\n').map(s => s.trim()).filter(Boolean)
        const costs = pricingInputs.costPerProduct
          ? pricingInputs.costPerProduct.split('\n').map(s => s.trim()).filter(Boolean)
          : []
        names.forEach((name, i) => products.push({ name, cost: costs[i] ?? '' }))
      }

      const url = `${API_BASE}/api/bedrock/smart-pricing`
      console.log('[SmartPricing] POST', url)

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
            mainGoal:       profile.mainGoal || undefined,
            monthlyRevenue: pricingInputs.monthlyRevenueRange ?? undefined,
            products:       products.length > 0 ? products : undefined,
            competitorJson: competitorResult
              ? JSON.stringify(competitorResult)
              : undefined,
          }),
        })
      } catch (networkErr) {
        console.error('[SmartPricing] Network error:', networkErr)
        throw new Error('Cannot reach the server. Make sure npm run dev is running.')
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('[SmartPricing] HTTP error:', res.status, text)
        throw new Error(`Server error ${res.status}`)
      }

      const json = await res.json() as { content?: string; error?: string }
      if (json.error) throw new Error(json.error)
      if (!json.content) throw new Error('Empty response from server')

      console.log('[SmartPricing] Response length:', json.content.length)

      let cleaned = json.content.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim()
      }
      const start = cleaned.indexOf('{')
      const end   = cleaned.lastIndexOf('}')
      if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1)

      try {
        const parsed = JSON.parse(cleaned) as SmartPricingData
        setData(parsed)
        onPricingComplete?.(parsed)
      } catch {
        console.warn('[SmartPricing] JSON parse failed — showing raw text')
        setRawFallback(json.content)
      }
    })
  }, [profile, pricingInputs, generate, competitorResult])

  useEffect(() => {
    onGenerateRef?.(handleGenerate)
  }, [onGenerateRef, handleGenerate])

  return (
    <WidgetCard
      title="Smart Pricing Suggestions"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Builds a defendable price ladder with margin callouts — run Competitor Analysis first for best results."
      idleButtonLabel="Price SKUs"
      regenerateLabel="Reprice"
    >
      {data ? (
        <SmartPricingResult data={data} mainGoal={profile.mainGoal} />
      ) : rawFallback ? (
        <pre className="whitespace-pre-wrap font-sans text-sm text-[#a78bfa] leading-relaxed">
          {rawFallback}
      </pre>
      ) : null}
    </WidgetCard>
  )
}