/**
 * ProfileWizard Component
 * Multi-step, grouped business profile input
 */

import { useState, useEffect } from 'react';
import type { BusinessProfile, BusinessStage, BusinessType } from '../../types';
import { validateProfile } from '../../utils/validateProfile';
import Card, { CardHeader, CardBody } from '../shared/Card';
import Button from '../shared/Button';
import { Building2, Target, CheckCircle2 } from 'lucide-react';

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

export default function ProfileWizard({ onSubmit, initialProfile }: ProfileWizardProps) {
  // Form state
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

  // Pre-populate from initialProfile
  useEffect(() => {
    if (initialProfile) {
      setCompanyName(initialProfile.companyName);
      setIndustry(initialProfile.industry);
      setCity(initialProfile.city);
      setBusinessStage(initialProfile.businessStage);
      setBusinessType(initialProfile.businessType);
      setTargetCustomer(initialProfile.targetCustomer);
      setMainGoal(initialProfile.mainGoal ?? '');
      setCurrentFunds(initialProfile.currentFunds);
      setCurrentStep(3); // Jump to review if editing
    }
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
      // Jump to the step with errors
      if (validationErrors.companyName || validationErrors.industry || validationErrors.city || validationErrors.businessStage || validationErrors.businessType) {
        setCurrentStep(1);
      } else if (validationErrors.targetCustomer || validationErrors.mainGoal || validationErrors.currentFunds) {
        setCurrentStep(2);
      }
      return;
    }

    setIsSubmitting(true);
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
    setTimeout(() => setIsSubmitting(false), 1500);
  };

  const canProceedToStep2 = companyName && industry && city && businessStage && businessType;
  const canProceedToStep3 = canProceedToStep2 && targetCustomer && currentFunds >= 1000;

  return (
    <section className="bg-white border-b-2 border-neutral-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="eyebrow mb-3">One-time setup · ~3 minutes</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-950 leading-tight">
            Tell us about<br />your business<span className="text-primary-300">.</span>
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base mt-3 max-w-md leading-relaxed">
            We only ask what the tools need. Edit anytime from the header.
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-0 mb-8 max-w-sm">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => {
                  if (step === 1) setCurrentStep(1);
                  if (step === 2 && canProceedToStep2) setCurrentStep(2);
                  if (step === 3 && canProceedToStep3) setCurrentStep(3);
                }}
                className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                  currentStep === step
                    ? 'bg-neutral-950 text-white border-neutral-950'
                    : currentStep > step
                    ? 'bg-primary-300 text-neutral-950 border-neutral-950'
                    : 'bg-white text-neutral-400 border-neutral-300'
                }`}
                aria-label={`Step ${step}`}
                aria-current={currentStep === step ? 'step' : undefined}
              >
                {currentStep > step ? (
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                ) : (
                  step
                )}
              </button>
              {step < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors duration-200 ${
                    currentStep > step ? 'bg-neutral-950' : 'bg-neutral-200'
                  }`}
                />
              )}
            </div>
          ))}
          <p className="ml-4 text-sm font-medium text-neutral-600 whitespace-nowrap" aria-live="polite">
            {currentStep === 1 && 'Registration'}
            {currentStep === 2 && 'Goals & funds'}
            {currentStep === 3 && 'Review'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Business Basics */}
          {currentStep === 1 && (
            <Card variant="bordered" padding="lg" className="mb-6 border-2 border-neutral-950" style={{ boxShadow: '4px 4px 0 0 #0f0f0f' }}>
              <CardHeader
                title="Business basics"
                subtitle="Registration-style details — takes 2 minutes"
              />
              <CardBody className="mt-6 space-y-5">
                <FormField
                  label="Company Name"
                  required
                  error={errors.companyName}
                  helper="Your registered or trading business name"
                >
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Warung Maju Sdn Bhd"
                    className={inputClass(errors.companyName)}
                  />
                </FormField>

                <FormField
                  label="Industry or Niche"
                  required
                  error={errors.industry}
                  helper="The sector your business operates in"
                >
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. F&B, e-commerce, IT consulting"
                    className={inputClass(errors.industry)}
                  />
                </FormField>

                <FormField
                  label="City or State"
                  required
                  error={errors.city}
                  helper="Your primary operating location in Malaysia"
                >
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Kuala Lumpur, Penang, Johor Bahru"
                    className={inputClass(errors.city)}
                  />
                </FormField>

                <div className="grid md:grid-cols-2 gap-5">
                  <FormField
                    label="Business Stage"
                    required
                    error={errors.businessStage}
                  >
                    <select
                      value={businessStage}
                      onChange={(e) => setBusinessStage(e.target.value as BusinessStage)}
                      className={inputClass(errors.businessStage)}
                    >
                      <option value="">Select stage...</option>
                      {BUSINESS_STAGE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    label="Business type"
                    required
                    error={errors.businessType}
                    helper="How you’re registered (e.g. enterprise, Sdn Bhd, sole prop)"
                  >
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                      className={inputClass(errors.businessType)}
                    >
                      <option value="">Select type...</option>
                      {BUSINESS_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </CardBody>
              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2}
                  rightIcon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  }
                >
                  Continue to Goals
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Your Goals */}
          {currentStep === 2 && (
            <Card variant="bordered" padding="lg" className="mb-6 border-2 border-neutral-950" style={{ boxShadow: '4px 4px 0 0 #0f0f0f' }}>
              <CardHeader
                title="Goals & Funds"
                subtitle="Targets and available capital"
              />
              <CardBody className="mt-6 space-y-5">
                <FormField
                  label="Target Customer"
                  required
                  error={errors.targetCustomer}
                  helper="Describe your ideal customer"
                >
                  <input
                    type="text"
                    value={targetCustomer}
                    onChange={(e) => setTargetCustomer(e.target.value)}
                    placeholder="e.g. Young urban professionals aged 25–35"
                    className={inputClass(errors.targetCustomer)}
                  />
                </FormField>

                <FormField
                  label="Main Business Goal"
                  error={errors.mainGoal}
                  helper="Optional: Your primary objective"
                >
                  <input
                    type="text"
                    value={mainGoal}
                    onChange={(e) => setMainGoal(e.target.value)}
                    placeholder="e.g. Reach RM 50,000 monthly revenue within 12 months"
                    className={inputClass(errors.mainGoal)}
                  />
                </FormField>

                <FormField
                  label="Current Funds (RM)"
                  required
                  error={errors.currentFunds}
                  helper="Total capital available to invest"
                >
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                      RM
                    </span>
                    <input
                      type="number"
                      value={currentFunds}
                      onChange={(e) => setCurrentFunds(Number(e.target.value))}
                      min={1000}
                      max={999999999}
                      step={1000}
                      className={`${inputClass(errors.currentFunds)} pl-12`}
                    />
                  </div>
                  <input
                    type="range"
                    value={currentFunds}
                    onChange={(e) => setCurrentFunds(Number(e.target.value))}
                    min={1000}
                    max={500000}
                    step={1000}
                    className="w-full mt-2"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span>RM 1,000</span>
                    <span>RM {currentFunds.toLocaleString()}</span>
                    <span>RM 500,000+</span>
                  </div>
                </FormField>
              </CardBody>
              <div className="mt-6 flex justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedToStep3}
                  rightIcon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  }
                >
                  Review & Generate
                </Button>
              </div>
            </Card>
          )}

          {/* Step 3: Review & Generate */}
          {currentStep === 3 && (
            <Card variant="bordered" padding="lg" className="mb-6 border-2 border-neutral-950" style={{ boxShadow: '4px 4px 0 0 #0f0f0f' }}>
              <CardHeader
                title="Review & continue"
                subtitle="Check your details — you can edit anytime"
              />
              <CardBody className="mt-6">
                <div className="bg-neutral-50 rounded-xl border-2 border-neutral-200 p-6 space-y-4">
                  <ReviewItem label="Company" value={companyName} icon={<Building2 size={18} />} />
                  <ReviewItem label="Industry" value={industry} />
                  <ReviewItem label="Location" value={city} />
                  <ReviewItem label="Stage" value={businessStage} />
                  <ReviewItem label="Type" value={businessType} />
                  <ReviewItem label="Target Customer" value={targetCustomer} icon={<Target size={18} />} />
                  {mainGoal && <ReviewItem label="Goal" value={mainGoal} />}
                  <ReviewItem label="Funds" value={`RM ${currentFunds.toLocaleString()}`} />
                </div>
              </CardBody>
              <div className="mt-6 flex justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep(2)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  rightIcon={
                    !isSubmitting && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )
                  }
                >
                  Generate My Business Guidance
                </Button>
              </div>
            </Card>
          )}
        </form>
      </div>
    </section>
  );
}

// ── Helper Components ──

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}

function FormField({ label, required, error, helper, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
        {label}
        {required && <span className="text-error-600 ml-1">*</span>}
      </label>
      {helper && <p className="text-xs text-neutral-500 mb-2">{helper}</p>}
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-error-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface ReviewItemProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

function ReviewItem({ label, value, icon }: ReviewItemProps) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="text-primary-600 mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          {label}
        </div>
        <div className="text-sm font-medium text-neutral-900 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full px-4 py-2.5 rounded-xl border ${
    error
      ? 'border-error-300 focus:border-error-500 focus:ring-error-500'
      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500'
  } bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors duration-200`;
}
