/**
 * ProfileWizard — multi-step business profile (first-time or edit).
 * UX: clear progress, edit mode copy, per-field review jumps, accessible labels.
 */

import { useState, useEffect, useId, useRef } from 'react';
import type { BusinessProfile, BusinessStage, BusinessType } from '../../types';
import { validateProfile } from '../../utils/validateProfile';
import { API_BASE } from '../../lib/api';
import Button from '../shared/Button';
import LogoWordmark from '../shared/LogoWordmark';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Wallet,
  ClipboardCheck,
  Pencil,
  Briefcase,
  MapPin,
  TrendingUp,
  Users,
  Goal,
  DollarSign,
} from 'lucide-react';

interface ProfileWizardProps {
  onSubmit: (profile: BusinessProfile) => void;
  initialProfile?: BusinessProfile | null;
}

const BUSINESS_STAGE_OPTIONS: BusinessStage[] = [
  'Idea Stage',
  'Just Launched',
  '1–2 Years Operating',
  'Established 3+ Years',
];

const BUSINESS_TYPE_OPTIONS: BusinessType[] = [
  'Enterprise',
  'Sdn Bhd',
  'PLT',
  'Sole Proprietorship',
  'Partnership',
];

const STEPS = [
  { n: 1, title: 'Business basics', hint: 'Name, place, structure', icon: Building2 },
  { n: 2, title: 'Goals & funds', hint: 'Who you serve and capital', icon: Wallet },
  { n: 3, title: 'Review', hint: 'Confirm before saving', icon: ClipboardCheck },
] as const;

const panelClass =
  'rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md shadow-panel p-5 sm:p-6';
const btnPrimaryDark =
  '!bg-primary-600 hover:!bg-primary-500 active:!bg-primary-700 !border-2 !border-primary-400/40 !text-white';
const btnGhostDark =
  '!border-2 !border-white/15 !text-neutral-200 hover:!bg-white/[0.07] hover:!border-white/25 !bg-transparent';

export default function ProfileWizard({ onSubmit, initialProfile }: ProfileWizardProps) {
  const formId = useId();
  const topRef = useRef<HTMLDivElement>(null);

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [businessStage, setBusinessStage] = useState<BusinessStage | ''>('');
  const [businessType, setBusinessType] = useState<BusinessType | ''>('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [mainGoal, setMainGoal] = useState('');
  const [currentFunds, setCurrentFunds] = useState<number>(10000);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const isEdit = Boolean(
    initialProfile &&
      (initialProfile.companyName || initialProfile.industry || initialProfile.city),
  );

  useEffect(() => {
    if (!initialProfile) return;
    setCompanyName(initialProfile.companyName);
    setIndustry(initialProfile.industry);
    setCity(initialProfile.city);
    setBusinessStage(initialProfile.businessStage);
    setBusinessType(initialProfile.businessType);
    setTargetCustomer(initialProfile.targetCustomer);
    setMainGoal(initialProfile.mainGoal ?? '');
    setCurrentFunds(initialProfile.currentFunds);
    setCurrentStep(1);
  }, [initialProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const values: Partial<BusinessProfile> = {
      companyName,
      industry,
      city,
      businessStage: businessStage as BusinessStage,
      businessType: businessType as BusinessType,
      targetCustomer,
      mainGoal,
      currentFunds,
    };

    const validationErrors = validateProfile(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      if (
        validationErrors.companyName ||
        validationErrors.industry ||
        validationErrors.city ||
        validationErrors.businessStage ||
        validationErrors.businessType
      ) {
        setCurrentStep(1);
      } else if (
        validationErrors.targetCustomer ||
        validationErrors.mainGoal ||
        validationErrors.currentFunds
      ) {
        setCurrentStep(2);
      }
      return;
    }

    setIsSubmitting(true);
    setVerificationError(null);

    try {
      const response = await fetch(`${API_BASE}/api/bedrock/profile-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          industry: industry.trim(),
          businessStage,
          city: city.trim(),
          targetCustomer: targetCustomer.trim(),
          mainGoal: mainGoal.trim() || undefined,
          currentFunds,
          businessType,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Verification request failed.');
      }

      const { result } = await response.json() as { result: string };

      if (result.toLowerCase() === 'pass') {
        // Profile is valid — proceed
        onSubmit({
          companyName: companyName.trim(),
          industry: industry.trim(),
          city: city.trim(),
          businessStage: businessStage as BusinessStage,
          businessType: businessType as BusinessType,
          targetCustomer: targetCustomer.trim(),
          mainGoal: mainGoal.trim(),
          currentFunds,
        });
      } else {
        // Agent returned a reason — show it to the user
        setVerificationError(result);
      }
    } catch (err) {
      setVerificationError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while verifying your profile. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToStep2 =
    !!(companyName && industry && city && businessStage && businessType);
  const canProceedToStep3 = canProceedToStep2 && !!(targetCustomer && currentFunds >= 1000);

  const goTryReview = () => {
    if (canProceedToStep3) setCurrentStep(3);
  };

  return (
    <div
      ref={topRef}
      className="relative min-h-screen border-b border-white/[0.06] bg-[#07070b] text-white [color-scheme:dark]"
    >
      {/* Background gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-15%,rgba(124,58,237,0.22),transparent_55%),radial-gradient(ellipse_50%_45%_at_100%_0%,rgba(196,181,253,0.08),transparent_50%)]"
      />

      {/* ── Two-column layout on lg+, stacked on mobile ── */}
      <div className="relative w-full px-6 sm:px-10 lg:px-16 xl:px-24 py-10 sm:py-14 pb-28 sm:pb-14 lg:flex lg:gap-20 xl:gap-28 lg:items-start">

        {/* ── LEFT PANEL — logo, header, step nav ── */}
        <aside className="lg:w-96 xl:w-[26rem] lg:shrink-0 lg:sticky lg:top-14">
          {/* Logo + header */}
          <header className="text-center lg:text-left mb-8 lg:mb-10">
            <div className="flex justify-center lg:justify-start mb-4">
              <LogoWordmark size="lg" variant="light" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-300 mb-2">
              {isEdit ? 'Edit profile' : 'Get started'}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
              {isEdit ? 'Update your business profile' : 'Tell us about your business'}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-neutral-400 leading-relaxed">
              {isEdit
                ? 'Changes apply to your workspace, generators, and advisor immediately. Saved on this device only.'
                : 'Rough answers are fine — you can refine anything later. About three minutes.'}
            </p>
          </header>

          {/* Step nav */}
          <div role="navigation" aria-label="Form progress">
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden mb-6">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-[width] duration-500 ease-out shadow-[0_0_12px_rgba(167,139,250,0.35)]"
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              />
            </div>

            {/* Step buttons — vertical on lg, horizontal on mobile */}
            <ol className="flex lg:flex-col justify-between lg:justify-start gap-2 lg:gap-1">
              {STEPS.map(({ n, title, hint, icon: Icon }) => {
                const done = currentStep > n;
                const active = currentStep === n;
                const canClick =
                  n === 1 ||
                  (n === 2 && canProceedToStep2) ||
                  (n === 3 && canProceedToStep3);
                return (
                  <li key={n} className="flex-1 lg:flex-none min-w-0">
                    <button
                      type="button"
                      disabled={!canClick}
                      onClick={() => canClick && setCurrentStep(n)}
                      className={`w-full flex flex-col lg:flex-row lg:items-center lg:gap-3 items-center text-center lg:text-left gap-1.5 rounded-xl px-2 lg:px-3 py-2 lg:py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070b] ${
                        active
                          ? 'bg-white/[0.08] shadow-panel ring-1 ring-white/[0.12]'
                          : done
                            ? 'hover:bg-white/[0.05]'
                            : 'opacity-55 hover:opacity-90'
                      } ${!canClick ? 'cursor-not-allowed opacity-35' : ''}`}
                      aria-current={active ? 'step' : undefined}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                          done
                            ? 'border-primary-400/50 bg-primary-500/20 text-primary-200'
                            : active
                              ? 'border-primary-300 bg-primary-600/30 text-white'
                              : 'border-white/15 bg-white/[0.04] text-neutral-500'
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] sm:text-xs font-semibold text-neutral-100 leading-tight truncate">
                          {title}
                        </span>
                        <span className="block text-[10px] text-neutral-500 leading-tight hidden sm:block lg:block">
                          {hint}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {isEdit && canProceedToStep3 && currentStep !== 3 && (
              <button
                type="button"
                onClick={goTryReview}
                className="mt-4 w-full flex items-center justify-center lg:justify-start gap-1.5 text-sm font-semibold text-primary-300 hover:text-primary-200 underline underline-offset-2 decoration-primary-500/50"
              >
                Jump to review <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </aside>

        {/* ── RIGHT PANEL — form ── */}
        <div className="flex-1 min-w-0 mt-8 lg:mt-0">
          <p className="text-sm text-neutral-400 mb-6" aria-live="polite">
            Step {currentStep} of 3 · {STEPS[currentStep - 1]?.title}
          </p>

          <form id={formId} onSubmit={handleSubmit} className="space-y-6">
          {currentStep === 1 && (
            <section
              aria-labelledby={`${formId}-step1-title`}
              className={panelClass}
            >
              <h2 id={`${formId}-step1-title`} className="text-lg font-bold text-white">
                Business basics
              </h2>
              <p className="text-sm text-neutral-400 mt-1 mb-6">
                Registration-style details your tools use for Malaysian context.
              </p>
              <div className="space-y-5">
                <FormField
                  id={`${formId}-company`}
                  label="Company name"
                  required
                  error={errors.companyName}
                  helper="Registered or trading name"
                >
                  <input
                    id={`${formId}-company`}
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Warung Maju Sdn Bhd"
                    autoComplete="organization"
                    className={inputClass(errors.companyName)}
                  />
                </FormField>
                <FormField
                  id={`${formId}-industry`}
                  label="Industry or niche"
                  required
                  error={errors.industry}
                  helper="Sector or focus area"
                >
                  <input
                    id={`${formId}-industry`}
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. F&B, e-commerce, retail"
                    className={inputClass(errors.industry)}
                  />
                </FormField>
                <FormField
                  id={`${formId}-city`}
                  label="City or state"
                  required
                  error={errors.city}
                  helper="Primary operating location"
                >
                  <input
                    id={`${formId}-city`}
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Kuala Lumpur, Johor Bahru"
                    autoComplete="address-level2"
                    className={inputClass(errors.city)}
                  />
                </FormField>
                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField
                    id={`${formId}-stage`}
                    label="Business stage"
                    required
                    error={errors.businessStage}
                  >
                    <select
                      id={`${formId}-stage`}
                      value={businessStage}
                      onChange={(e) => setBusinessStage(e.target.value as BusinessStage)}
                      className={inputClass(errors.businessStage)}
                      style={{ backgroundColor: '#1a1a2e', colorScheme: 'dark' }}
                    >
                      <option value="" style={{ background: '#1a1a2e', color: '#e5e5e5' }}>Select stage…</option>
                      {BUSINESS_STAGE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} style={{ background: '#1a1a2e', color: '#ffffff' }}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    id={`${formId}-type`}
                    label="Business type"
                    required
                    error={errors.businessType}
                  >
                    <select
                      id={`${formId}-type`}
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                      className={inputClass(errors.businessType)}
                      style={{ backgroundColor: '#1a1a2e', colorScheme: 'dark' }}
                    >
                      <option value="" style={{ background: '#1a1a2e', color: '#e5e5e5' }}>Select type…</option>
                      {BUSINESS_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} style={{ background: '#1a1a2e', color: '#ffffff' }}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>
              <div className="mt-8 hidden sm:flex justify-end">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2}
                  className={btnPrimaryDark}
                  rightIcon={<ChevronRight className="w-5 h-5" aria-hidden />}
                >
                  Continue
                </Button>
              </div>
            </section>
          )}

          {currentStep === 2 && (
            <section
              aria-labelledby={`${formId}-step2-title`}
              className={panelClass}
            >
              <h2 id={`${formId}-step2-title`} className="text-lg font-bold text-white">
                Goals & funds
              </h2>
              <p className="text-sm text-neutral-400 mt-1 mb-6">
                Used for pricing, marketing, and money tools — all in RM.
              </p>
              <div className="space-y-5">
                <FormField
                  id={`${formId}-audience`}
                  label="Target customer"
                  required
                  error={errors.targetCustomer}
                  helper="Who buys from you?"
                >
                  <input
                    id={`${formId}-audience`}
                    type="text"
                    value={targetCustomer}
                    onChange={(e) => setTargetCustomer(e.target.value)}
                    placeholder="e.g. Office workers nearby, families, B2B buyers"
                    className={inputClass(errors.targetCustomer)}
                  />
                </FormField>
                <FormField
                  id={`${formId}-goal`}
                  label="Main business goal"
                  error={errors.mainGoal}
                  helper="Optional — helps the advisor prioritise"
                >
                  <input
                    id={`${formId}-goal`}
                    type="text"
                    value={mainGoal}
                    onChange={(e) => setMainGoal(e.target.value)}
                    placeholder="e.g. Stabilise cash flow in the next 6 months"
                    className={inputClass(errors.mainGoal)}
                  />
                </FormField>
                <FormField
                  id={`${formId}-funds`}
                  label="Current funds (RM)"
                  required
                  error={errors.currentFunds}
                  helper="Capital you can deploy (estimate is OK)"
                >
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-500 pointer-events-none">
                      RM
                    </span>
                    <input
                      id={`${formId}-funds`}
                      type="number"
                      value={currentFunds}
                      onChange={(e) => setCurrentFunds(Number(e.target.value))}
                      min={1000}
                      max={999999999}
                      step={1000}
                      className={`${inputClass(errors.currentFunds)} pl-[2.75rem] tabular-nums`}
                    />
                  </div>
                  <input
                    type="range"
                    value={currentFunds}
                    onChange={(e) => setCurrentFunds(Number(e.target.value))}
                    min={1000}
                    max={500000}
                    step={1000}
                    aria-label="Adjust amount roughly"
                    className="wizard-range mt-3 w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-primary-400"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-2 tabular-nums">
                    <span>RM 1k</span>
                    <span className="font-semibold text-primary-200">RM {currentFunds.toLocaleString('en-MY')}</span>
                    <span>RM 500k+</span>
                  </div>
                </FormField>
              </div>
              <div className="mt-8 hidden sm:flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                <Button type="button" variant="ghost" className={btnGhostDark} onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedToStep3}
                  className={btnPrimaryDark}
                  rightIcon={<ChevronRight className="w-5 h-5" aria-hidden />}
                >
                  Review
                </Button>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section
              aria-labelledby={`${formId}-step3-title`}
              className={panelClass}
            >
              <h2 id={`${formId}-step3-title`} className="text-lg font-bold text-white">
                Review
              </h2>
              <p className="text-sm text-neutral-400 mt-1 mb-4">
                {isEdit ? 'Tap edit on any row to change it.' : 'Double-check once — you can edit anytime later.'}
              </p>
              <ul className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.06] bg-white/[0.03] overflow-hidden">
                <ReviewRow
                  label="Company"
                  value={companyName}
                  onEdit={() => setCurrentStep(1)}
                  icon={<Building2 className="h-4 w-4" />}
                />
                <ReviewRow
                  label="Industry"
                  value={industry}
                  onEdit={() => setCurrentStep(1)}
                  icon={<Briefcase className="h-4 w-4" />}
                />
                <ReviewRow
                  label="Location"
                  value={city}
                  onEdit={() => setCurrentStep(1)}
                  icon={<MapPin className="h-4 w-4" />}
                />
                <ReviewRow
                  label="Stage"
                  value={businessStage}
                  onEdit={() => setCurrentStep(1)}
                  icon={<TrendingUp className="h-4 w-4" />}
                />
                <ReviewRow
                  label="Type"
                  value={businessType}
                  onEdit={() => setCurrentStep(1)}
                  icon={<ClipboardCheck className="h-4 w-4" />}
                />
                <ReviewRow
                  label="Target customer"
                  value={targetCustomer}
                  onEdit={() => setCurrentStep(2)}
                  icon={<Users className="h-4 w-4" />}
                />
                {mainGoal ? (
                  <ReviewRow
                    label="Goal"
                    value={mainGoal}
                    onEdit={() => setCurrentStep(2)}
                    icon={<Goal className="h-4 w-4" />}
                  />
                ) : null}
                <ReviewRow
                  label="Funds"
                  value={`RM ${currentFunds.toLocaleString('en-MY')}`}
                  onEdit={() => setCurrentStep(2)}
                  icon={<DollarSign className="h-4 w-4" />}
                />
              </ul>

              {/* ── Verification error from the AI agent ── */}
              {verificationError && (
                <div
                  role="alert"
                  className="mt-5 flex gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3.5"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 shrink-0 text-red-400 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-red-300 mb-0.5">
                      Please update your profile
                    </p>
                    <p className="text-sm text-red-200 leading-relaxed whitespace-pre-wrap">
                      {verificationError}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                <Button type="button" variant="ghost" className={btnGhostDark} onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  variant="primary"
                  className={btnPrimaryDark}
                  isLoading={isSubmitting}
                  rightIcon={
                    !isSubmitting ? <ChevronRight className="w-5 h-5" aria-hidden /> : undefined
                  }
                >
                  {isSubmitting
                    ? 'Verifying…'
                    : isEdit
                      ? 'Save & return to workspace'
                      : 'Generate my business guidance'}
                </Button>
              </div>
            </section>
          )}
        </form>
        </div>{/* end right panel */}
      </div>{/* end two-column wrapper */}

      {/* Mobile sticky action — only when step has primary forward action */}
      {currentStep < 3 && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-[#07070b]/95 backdrop-blur-xl border-t border-white/[0.08] z-20">
          {currentStep === 1 && (
            <Button
              type="button"
              fullWidth
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedToStep2}
              className={btnPrimaryDark}
              rightIcon={<ChevronRight className="w-5 h-5" aria-hidden />}
            >
              Continue
            </Button>
          )}
          {currentStep === 2 && (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className={`flex-1 shrink-0 ${btnGhostDark}`} onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                className={`flex-[2] min-w-0 ${btnPrimaryDark}`}
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedToStep3}
                rightIcon={<ChevronRight className="w-5 h-5" aria-hidden />}
              >
                Review
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormField({
  id,
  label,
  required,
  error,
  helper,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-neutral-200 mb-1.5">
        {label}
        {required && (
          <span className="text-primary-300 ml-0.5" aria-hidden>
            *
          </span>
        )}
      </label>
      {helper && <p className="text-xs text-neutral-500 mb-2">{helper}</p>}
      {children}
      {error && (
        <p className="mt-1.5 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  icon,
  onEdit,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 bg-white/[0.02]">
      {icon && <span className="text-primary-300 shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 shrink-0 w-24">
          {label}
        </p>
        <p className="text-sm font-medium text-neutral-100 truncate">{value || '—'}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary-300 hover:text-primary-200 px-2 py-1 rounded-lg hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Edit
      </button>
    </li>
  );
}

function inputClass(error?: string) {
  return `w-full px-3.5 py-2.5 rounded-xl border text-sm transition-shadow duration-150 bg-white/[0.06] text-white placeholder:text-neutral-500 [&_option]:bg-[#1a1728] [&_option]:text-white ${
    error
      ? '!border-red-500/70 focus:!border-red-400 focus:ring-2 focus:ring-red-500/25'
      : 'border-white/[0.12] focus:border-primary-400 focus:ring-2 focus:ring-primary-500/25 hover:border-white/20'
  } focus:outline-none`;
}
