/**
 * ProfileForm component
 * Collects the eight Business Profile fields and validates them before submission.
 * Requirements: 1.1, 1.2, 1.6
 */

import { useState, useEffect } from "react";
import type { BusinessProfile, BusinessStage, BusinessType } from "../types";
import FundsInput from "./FundsInput";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_STAGE_OPTIONS: BusinessStage[] = [
  "Idea Stage",
  "Just Launched",
  "1–2 Years Operating",
  "Established 3+ Years",
];

const BUSINESS_TYPE_OPTIONS: BusinessType[] = [
  "Enterprise",
  "Sdn Bhd",
  "PLT",
  "Sole Proprietorship",
  "Partnership",
];

/** Tooltip text for each field — explains its purpose within SMEwise. */
const FIELD_TOOLTIPS: Record<keyof BusinessProfile, string> = {
  companyName:
    "Your registered or trading business name. SMEwise uses this to personalise all generated content and documents.",
  industry:
    "The sector or niche your business operates in (e.g. F&B, e-commerce, consulting). This drives industry-specific advice across all sections.",
  city:
    "Your primary operating city or state in Malaysia (e.g. Kuala Lumpur, Penang). Used to tailor workspace, competitor, and marketing recommendations.",
  targetCustomer:
    "Describe who your ideal customer is (e.g. young urban professionals, SME owners). This shapes your pricing, marketing, and chatbot guidance.",
  mainGoal:
    "Your primary business objective (e.g. reach RM 50,000 monthly revenue). Optional — when provided, SMEwise aligns all advice toward this goal.",
  currentFunds:
    "The total capital you currently have available to invest in your business (RM 1,000 – RM 999,999,999). Used for fund allocation, revenue projections, and loan guidance.",
  businessStage:
    "How far along your business is. SMEwise adjusts registration steps, risk analysis, and financial projections based on your stage.",
  businessType:
    "Your legal business structure in Malaysia. Determines applicable SSM registration requirements, tax obligations, and funding eligibility.",
  fundAllocation:
    "Optional breakdown of how you plan to allocate your funds across business categories.",
};

// ─── Tooltip Icon ─────────────────────────────────────────────────────────────

interface TooltipIconProps {
  text: string;
}

function TooltipIcon({ text }: TooltipIconProps) {
  return (
    <span className="relative group inline-flex items-center ml-1.5 cursor-help">
      {/* Info circle icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-neutral-500 group-hover:text-primary-400 transition-colors"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      {/* Tooltip bubble */}
      <span
        role="tooltip"
        className="
          absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-10
          w-64 rounded-lg bg-neutral-900 border border-white/[0.08]
          px-3 py-2 text-xs text-neutral-200 leading-relaxed shadow-lg
          opacity-0 group-hover:opacity-100 pointer-events-none
          transition-opacity duration-150
        "
      >
        {text}
        {/* Arrow */}
        <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-900" />
      </span>
    </span>
  );
}

// ─── Field Label ──────────────────────────────────────────────────────────────

interface FieldLabelProps {
  htmlFor: string;
  label: string;
  required?: boolean;
  tooltipKey: keyof BusinessProfile;
}

function FieldLabel({ htmlFor, label, required = false, tooltipKey }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center text-[11px] uppercase tracking-widest text-primary-300 font-semibold mb-1"
    >
      {label}
      {required && <span className="text-primary-300 ml-0.5">*</span>}
      <TooltipIcon text={FIELD_TOOLTIPS[tooltipKey]} />
    </label>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

type FormErrors = Partial<Record<keyof BusinessProfile, string>>;

function validateProfile(values: Partial<BusinessProfile>): FormErrors {
  const errors: FormErrors = {};

  if (!values.companyName?.trim()) {
    errors.companyName = "Company name is required.";
  }
  if (!values.industry?.trim()) {
    errors.industry = "Industry or niche is required.";
  }
  if (!values.city?.trim()) {
    errors.city = "City or state is required.";
  }
  if (!values.targetCustomer?.trim()) {
    errors.targetCustomer = "Target customer is required.";
  }
  if (
    values.currentFunds === undefined ||
    values.currentFunds === null ||
    isNaN(values.currentFunds as number) ||
    (values.currentFunds as number) < 1000 ||
    (values.currentFunds as number) > 999_999_999
  ) {
    errors.currentFunds = "Please enter a valid amount between RM 1,000 and RM 999,999,999.";
  }
  if (!values.businessStage) {
    errors.businessStage = "Business stage is required.";
  }
  if (!values.businessType) {
    errors.businessType = "Business type is required.";
  }

  return errors;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileFormProps {
  onSubmit: (profile: BusinessProfile) => void;
  initialProfile?: BusinessProfile | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileForm({ onSubmit, initialProfile }: ProfileFormProps) {
  // ── Field state ──
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [currentFunds, setCurrentFunds] = useState<number>(10000);
  const [businessStage, setBusinessStage] = useState<BusinessStage | "">("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");

  // ── Validation errors ──
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Pre-populate from initialProfile ──
  useEffect(() => {
    if (initialProfile) {
      setCompanyName(initialProfile.companyName);
      setIndustry(initialProfile.industry);
      setCity(initialProfile.city);
      setTargetCustomer(initialProfile.targetCustomer);
      setMainGoal(initialProfile.mainGoal ?? "");
      setCurrentFunds(initialProfile.currentFunds);
      setBusinessStage(initialProfile.businessStage);
      setBusinessType(initialProfile.businessType);
    }
  }, [initialProfile]);

  // ── Submit ──
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    const values: Partial<BusinessProfile> = {
      companyName,
      industry,
      city,
      targetCustomer,
      mainGoal,
      currentFunds,
      businessStage: businessStage as BusinessStage,
      businessType: businessType as BusinessType,
    };

    const validationErrors = validateProfile(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    onSubmit({
      companyName: companyName.trim(),
      industry: industry.trim(),
      city: city.trim(),
      targetCustomer: targetCustomer.trim(),
      mainGoal: mainGoal.trim(),
      currentFunds,
      businessStage: businessStage as BusinessStage,
      businessType: businessType as BusinessType,
    });
    // Reset submitting state after a short delay
    setTimeout(() => setIsSubmitting(false), 1500);
  }

  // ── Shared input classes ──
  const inputBase =
    "w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white " +
    "placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all duration-200";

  const inputError = "border-red-500 focus:ring-red-500";

  function fieldClass(key: keyof BusinessProfile) {
    return `${inputBase} ${submitted && errors[key] ? inputError : ""}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#07070b] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Set Up Your Business Profile</h2>
          <p className="mt-2 text-neutral-500 text-sm">
            Tell SMEwise about your business so we can generate personalised, Malaysia-specific
            guidance for you.
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-neutral-900 rounded-xl border border-white/[0.08] p-5"
        >
          {/* Grid layout for fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* ── Company Name ── */}
            <div>
              <FieldLabel
                htmlFor="companyName"
                label="Company Name"
                required
                tooltipKey="companyName"
              />
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Warung Maju Sdn Bhd"
                className={fieldClass("companyName")}
                aria-describedby={errors.companyName ? "companyName-error" : undefined}
              />
              {submitted && errors.companyName && (
                <p id="companyName-error" className="mt-1.5 text-xs text-red-400" role="alert">
                  {errors.companyName}
                </p>
              )}
            </div>

            {/* ── Industry ── */}
            <div>
              <FieldLabel
                htmlFor="industry"
                label="Industry or Niche"
                required
                tooltipKey="industry"
              />
              <input
                id="industry"
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. F&B, e-commerce, IT consulting"
                className={fieldClass("industry")}
                aria-describedby={errors.industry ? "industry-error" : undefined}
              />
              {submitted && errors.industry && (
                <p id="industry-error" className="mt-1.5 text-xs text-red-400" role="alert">
                  {errors.industry}
                </p>
              )}
            </div>

            {/* ── City ── */}
            <div>
              <FieldLabel
                htmlFor="city"
                label="City or State"
                required
                tooltipKey="city"
              />
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Kuala Lumpur, Penang, Johor Bahru"
                className={fieldClass("city")}
                aria-describedby={errors.city ? "city-error" : undefined}
              />
              {submitted && errors.city && (
                <p id="city-error" className="mt-1.5 text-xs text-red-400" role="alert">
                  {errors.city}
                </p>
              )}
            </div>

            {/* ── Target Customer ── */}
            <div>
              <FieldLabel
                htmlFor="targetCustomer"
                label="Target Customer"
                required
                tooltipKey="targetCustomer"
              />
              <input
                id="targetCustomer"
                type="text"
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                placeholder="e.g. Young urban professionals aged 25–35"
                className={fieldClass("targetCustomer")}
                aria-describedby={errors.targetCustomer ? "targetCustomer-error" : undefined}
              />
              {submitted && errors.targetCustomer && (
                <p id="targetCustomer-error" className="mt-1.5 text-xs text-red-400" role="alert">
                  {errors.targetCustomer}
                </p>
              )}
            </div>

            {/* ── Main Goal (optional) — full width ── */}
            <div className="md:col-span-2">
              <FieldLabel
                htmlFor="mainGoal"
                label="Main Business Goal"
                tooltipKey="mainGoal"
              />
              <input
                id="mainGoal"
                type="text"
                value={mainGoal}
                onChange={(e) => setMainGoal(e.target.value)}
                placeholder="e.g. Reach RM 50,000 monthly revenue within 12 months (optional)"
                className={inputBase}
              />
            </div>

            {/* ── Current Funds — full width ── */}
            <div className="md:col-span-2">
              <FieldLabel
                htmlFor="currentFunds"
                label="Current Funds (RM)"
                required
                tooltipKey="currentFunds"
              />
              <div
                id="currentFunds"
                className={submitted && errors.currentFunds ? "ring-1 ring-red-500 rounded-lg" : ""}
                aria-describedby={errors.currentFunds ? "currentFunds-error" : undefined}
              >
                <FundsInput
                  value={currentFunds}
                  onChange={(val) => setCurrentFunds(val)}
                />
              </div>
              {submitted && errors.currentFunds && (
                <p id="currentFunds-error" className="mt-1.5 text-xs text-red-400" role="alert">
                  {errors.currentFunds}
                </p>
              )}
            </div>

            {/* ── Business Stage ── */}
            <div>
              <FieldLabel
                htmlFor="businessStage"
                label="Business Stage"
                required
                tooltipKey="businessStage"
              />
              <select
                id="businessStage"
                value={businessStage}
                onChange={(e) => setBusinessStage(e.target.value as BusinessStage)}
                className={`${fieldClass("businessStage")} appearance-none`}
                aria-describedby={errors.businessStage ? "businessStage-error" : undefined}
              >
                <option value="" disabled>
                  Select stage…
                </option>
                {BUSINESS_STAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {submitted && errors.businessStage && (
                <p id="businessStage-error" className="mt-1.5 text-xs text-red-400" role="alert">
                  {errors.businessStage}
                </p>
              )}
            </div>

            {/* ── Business Type ── */}
            <div>
              <FieldLabel
                htmlFor="businessType"
                label="Business Type"
                required
                tooltipKey="businessType"
              />
              <select
                id="businessType"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className={`${fieldClass("businessType")} appearance-none`}
                aria-describedby={errors.businessType ? "businessType-error" : undefined}
              >
                <option value="" disabled>
                  Select type…
                </option>
                {BUSINESS_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {submitted && errors.businessType && (
                <p id="businessType-error" className="mt-1.5 text-xs text-red-400" role="alert">
                  {errors.businessType}
                </p>
              )}
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="pt-5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-lg px-4 py-3 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070b]"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Generating…
                </>
              ) : (
                "Generate My Business Guidance →"
              )}
            </button>
            <p className="mt-3 text-center text-xs text-neutral-500">
              Fields marked <span className="text-primary-300">*</span> are required.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
