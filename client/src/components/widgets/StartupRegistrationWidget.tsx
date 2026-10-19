/**
 * StartupRegistrationWidget — Operations Section
 * Calls the Bedrock startup agent and renders the JSON response
 * as a structured, modern UI with Part 1 overview and Part 2 checklist.
 */

import { useState, useCallback, useEffect } from 'react'
import type { BusinessProfile } from '../../types'
import { useWidgetState } from '../../hooks/useWidgetState'
import WidgetCard from '../WidgetCard'
import { API_BASE } from '../../lib/api'

// ─── JSON schema types ────────────────────────────────────────────────────────

interface StartupSection {
  heading: string
  liabilityStatus?: string
  minimumStatutory?: string
  realisticEstimate?: string
  points: string[]
}

interface StartupStep {
  stepNumber: number
  title: string
  where: string
  documents: string[]
  fee: string
  processingTime: string
  note?: string
}

interface IndustryLicense {
  licenseName: string
  issuingBody: string
  portal: string
  fee: string
  processingTime: string
}

interface TaxRegistration {
  body: string
  portal: string
  form: string
  timeline: string
  fee: string
}

interface StartupGuide {
  company: string
  industry: string
  businessStage: string
  location: string
  businessType: string
  liabilityStatus?: string
  part1: {
    title: string
    sections: StartupSection[]
  }
  part2: {
    title: string
    steps: StartupStep[]
    localAuthorityLicense: {
      council: string
      portal?: string
      license: string
      documents?: string[]
      fee: string
      processingTime?: string
    }
    industryLicenses: IndustryLicense[] | string[]
    taxRegistration: TaxRegistration | string
    sstRegistration: string
  }
  stageNote: string
  disclaimer: string
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function fetchStartupGuide(profile: BusinessProfile): Promise<StartupGuide> {
  const res = await fetch(`${API_BASE}/api/bedrock/startup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: profile.companyName,
      industry: profile.industry,
      businessStage: profile.businessStage,
      city: profile.city,
      businessType: profile.businessType,
      currentFunds: profile.currentFunds,
    }),
  })

  if (!res.ok) {
    if (res.status === 429) throw new Error('Service is busy. Please try again in a moment.')
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? 'Something went wrong. Please try again.')
  }

  const { content } = await res.json() as { content: string }

  // Strip <answer> tags if present (Bedrock agent wraps response)
  let cleaned = content.trim()
  const answerMatch = cleaned.match(/<answer>([\s\S]*?)<\/answer>/i)
  if (answerMatch) cleaned = answerMatch[1].trim()

  // Strip markdown fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim()
  }
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1)

  return JSON.parse(cleaned) as StartupGuide
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeeBadge({ fee }: { fee: string }) {
  const isFree = fee === 'RM 0' || fee.toLowerCase() === 'free' || fee === 'N/A'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
      isFree
        ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50'
        : 'bg-primary-500/20 text-primary-300 border-primary-500/30'
    }`}>
      {fee}
    </span>
  )
}

function TimeBadge({ time }: { time: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-neutral-500 bg-white/[0.04] border border-white/[0.08]">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {time}
    </span>
  )
}

function Part1Section({ section }: { section: StartupSection }) {
  const isWarning = section.heading === 'Key Warnings'
  const isCapital = section.heading === 'Startup Capital'
  const isStructure = section.heading === 'Business Structure'

  return (
    <div className={`rounded-lg border p-4 ${
      isWarning ? 'border-amber-700/50 bg-amber-900/10' : 'border-white/[0.08] bg-white/[0.03]'
    }`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${isWarning ? 'bg-amber-400' : 'bg-primary-500'}`}
            aria-hidden
          />
          <h4 className={`text-sm font-semibold ${isWarning ? 'text-amber-300' : 'text-white'}`}>
            {section.heading}
          </h4>
        </div>
        {/* Liability badge on Business Structure */}
        {isStructure && section.liabilityStatus && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
            section.liabilityStatus === 'LIMITED'
              ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50'
              : 'bg-orange-900/40 text-orange-300 border-orange-700/50'
          }`}>
            {section.liabilityStatus} Liability
          </span>
        )}
      </div>

      {/* Capital estimates */}
      {isCapital && (section.minimumStatutory || section.realisticEstimate) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {section.minimumStatutory && (
            <div className="flex flex-col rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Statutory Min.</span>
              <span className="text-sm font-semibold text-primary-300">{section.minimumStatutory}</span>
            </div>
          )}
          {section.realisticEstimate && (
            <div className="flex flex-col rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Realistic Est.</span>
              <span className="text-sm font-semibold text-white">{section.realisticEstimate}</span>
            </div>
          )}
        </div>
      )}

      <ul className="space-y-1.5">
        {section.points.map((point, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
              isWarning ? 'bg-amber-500' : 'bg-primary-600'
            }`} />
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}

function StepCard({ step }: { step: StartupStep }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
        aria-expanded={open}
      >
        <span className="shrink-0 w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
          {step.stepNumber}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{step.title}</p>
          <p className="text-xs text-neutral-500 truncate">{step.where}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <FeeBadge fee={step.fee} />
          <TimeBadge time={step.processingTime} />
        </div>
        <svg className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.08] pt-3 space-y-3">
          <div className="flex sm:hidden items-center gap-2 flex-wrap">
            <FeeBadge fee={step.fee} />
            <TimeBadge time={step.processingTime} />
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wide">Where</p>
            <p className="text-sm text-primary-300">{step.where}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wide">Documents needed</p>
            <ul className="space-y-1">
              {step.documents.map((doc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#4c3d8f] shrink-0" />
                  {doc}
                </li>
              ))}
            </ul>
          </div>
          {step.note && (
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs text-neutral-500">
              📝 {step.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IndustryLicenseCard({ license }: { license: IndustryLicense }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{license.licenseName}</p>
          <p className="text-xs text-neutral-500">{license.issuingBody}</p>
        </div>
        <FeeBadge fee={license.fee} />
      </div>
      <div className="flex items-center justify-between gap-2">
        {license.portal && license.portal !== 'N/A' && (
          <a
            href={license.portal.startsWith('http') ? license.portal : `https://${license.portal}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-300 hover:underline truncate"
          >
            {license.portal}
          </a>
        )}
        <TimeBadge time={license.processingTime} />
      </div>
    </div>
  )
}

function StartupGuideOutput({ guide }: { guide: StartupGuide }) {
  const [activeTab, setActiveTab] = useState<'part1' | 'part2'>('part1')

  // Normalise industryLicenses — handle both string[] and object[]
  const industryLicenses: IndustryLicense[] = (guide.part2.industryLicenses ?? []).map(lic => {
    if (typeof lic === 'string') {
      return { licenseName: lic, issuingBody: 'N/A', portal: 'N/A', fee: 'N/A', processingTime: 'N/A' }
    }
    return lic as IndustryLicense
  })

  const noLicenses = industryLicenses.length === 1 &&
    industryLicenses[0].licenseName.toLowerCase().startsWith('none')

  // Normalise taxRegistration — handle both string and object
  const taxReg = typeof guide.part2.taxRegistration === 'string'
    ? null
    : guide.part2.taxRegistration as TaxRegistration

  return (
    <div className="flex flex-col gap-4">
      {/* Meta tags */}
      <div className="flex flex-wrap gap-2">
        {[guide.businessType, guide.businessStage, guide.location].map(tag => (
          <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-primary-300">
            {tag}
          </span>
        ))}
        {(guide.liabilityStatus ?? guide.part1.sections.find(s => s.liabilityStatus)?.liabilityStatus) && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-900/30 border border-green-700/50 text-green-300">
            {guide.liabilityStatus ?? guide.part1.sections.find(s => s.liabilityStatus)?.liabilityStatus} Liability
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex rounded-lg bg-white/[0.04] p-1 gap-1">
        <button type="button" onClick={() => setActiveTab('part1')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'part1' ? 'bg-primary-600 text-white shadow-sm' : 'text-neutral-500 hover:text-white'
          }`}>
          Before You Register
        </button>
        <button type="button" onClick={() => setActiveTab('part2')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'part2' ? 'bg-primary-600 text-white shadow-sm' : 'text-neutral-500 hover:text-white'
          }`}>
          Registration Checklist
        </button>
      </div>

      {/* Part 1 */}
      {activeTab === 'part1' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">{guide.part1.title}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guide.part1.sections.map(section => (
              <Part1Section key={section.heading} section={section} />
            ))}
          </div>
        </div>
      )}

      {/* Part 2 */}
      {activeTab === 'part2' && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">{guide.part2.title}</p>

          {/* Steps */}
          <div className="flex flex-col gap-2">
            {guide.part2.steps.map(step => (
              <StepCard key={step.stepNumber} step={step} />
            ))}
          </div>

          {/* Local authority license */}
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
            <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Local Authority License</p>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{guide.part2.localAuthorityLicense.license}</p>
                <p className="text-xs text-neutral-500">{guide.part2.localAuthorityLicense.council}</p>
                {guide.part2.localAuthorityLicense.portal && (
                  <a
                    href={guide.part2.localAuthorityLicense.portal.startsWith('http')
                      ? guide.part2.localAuthorityLicense.portal
                      : `https://${guide.part2.localAuthorityLicense.portal}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-300 hover:underline"
                  >
                    {guide.part2.localAuthorityLicense.portal}
                  </a>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <FeeBadge fee={guide.part2.localAuthorityLicense.fee} />
                {guide.part2.localAuthorityLicense.processingTime && (
                  <TimeBadge time={guide.part2.localAuthorityLicense.processingTime} />
                )}
              </div>
            </div>
          </div>

          {/* Industry licenses */}
          {!noLicenses && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Industry-Specific Licenses</p>
              {industryLicenses.map(lic => (
                <IndustryLicenseCard key={lic.licenseName} license={lic} />
              ))}
            </div>
          )}

          {/* Tax registration */}
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4 space-y-2">
            <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Tax & SST</p>
            {taxReg ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{taxReg.body}</p>
                  <FeeBadge fee={taxReg.fee} />
                </div>
                <a href={`https://${taxReg.portal}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary-300 hover:underline">{taxReg.portal}</a>
                <p className="text-xs text-neutral-400">Form: {taxReg.form} · {taxReg.timeline}</p>
              </div>
            ) : (
              <p className="text-sm text-neutral-300">{guide.part2.taxRegistration as string}</p>
            )}
            <div className="pt-2 border-t border-white/[0.08]">
              <p className="text-xs text-neutral-500 mb-1">SST Registration</p>
              <p className="text-sm text-neutral-300">{guide.part2.sstRegistration}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stage note */}
      <div className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-4 py-3">
        <p className="text-sm text-primary-200">{guide.stageNote}</p>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-neutral-500 text-center">{guide.disclaimer}</p>
    </div>
  )
}

// ─── Idle placeholder ─────────────────────────────────────────────────────────

function IdlePlaceholder() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500">
        Fill in <span className="text-primary-300 font-medium">Company Name, Industry, City, Business Stage</span> and{' '}
        <span className="text-primary-300 font-medium">Business Type</span> to generate your personalised startup guide.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          'Business structure & liability',
          'Startup capital estimate',
          'Step-by-step registration',
          'Banking & funding options',
          'EPF, SOCSO, EIS obligations',
          'Compliance warnings',
        ].map(item => (
          <div key={item} className="flex items-center gap-2 text-xs text-neutral-500 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.08]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500/70" aria-hidden />
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

import { checkCache, writeCache, hashInputs } from '../../utils/widgetCache'

const CACHE_KEY = 'startup-registration'

interface StartupRegistrationWidgetProps {
  profile: BusinessProfile
  onGenerateRef?: (fn: () => Promise<void>) => void
  hideGenerateButton?: boolean
}

export default function StartupRegistrationWidget({
  profile,
  onGenerateRef,
  hideGenerateButton = false,
}: StartupRegistrationWidgetProps) {
  const [guide, setGuide] = useState<StartupGuide | null>(null)
  const { state, generate, restoreSuccess } = useWidgetState()

  const cacheInputs = {
    companyName: profile.companyName,
    industry: profile.industry,
    businessStage: profile.businessStage,
    city: profile.city,
    businessType: profile.businessType,
    currentFunds: profile.currentFunds,
  }

  // Restore from cache on mount if inputs haven't changed.
  useEffect(() => {
    const cached = checkCache<StartupGuide>(CACHE_KEY, cacheInputs)
    if (cached) {
      setGuide(cached.result)
      restoreSuccess()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerate = useCallback(async () => {
    const cached = checkCache<StartupGuide>(CACHE_KEY, cacheInputs)
    if (cached) {
      setGuide(cached.result)
      restoreSuccess()
      return
    }
    setGuide(null)
    await generate(async () => {
      const data = await fetchStartupGuide(profile)
      setGuide(data)
      writeCache(CACHE_KEY, hashInputs(cacheInputs), data)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, generate])

  useEffect(() => {
    onGenerateRef?.(handleGenerate)
  }, [onGenerateRef, handleGenerate])

  return (
    <WidgetCard
      title="Startup Registration Guidelines"
      onGenerate={handleGenerate}
      state={state}
      idleContent={<IdlePlaceholder />}
      hideGenerateButton={hideGenerateButton}
    >
      {guide && <StartupGuideOutput guide={guide} />}
    </WidgetCard>
  )
}
