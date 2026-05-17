/**
 * PricingOptionalInputs — optional context fields for Pricing Strategy (light + dark workspace).
 */

import type { PricingOptionalInputs } from '../types';

interface PricingOptionalInputsProps {
  value: PricingOptionalInputs;
  onChange: (value: PricingOptionalInputs) => void;
}

const REVENUE_OPTIONS = [
  '',
  'Below RM 5,000',
  'RM 5,000–RM 20,000',
  'RM 20,000–RM 50,000',
  'RM 50,000–RM 100,000',
  'Above RM 100,000',
] as const;

const fieldClass =
  'w-full rounded-xl px-3 py-2.5 text-sm ' +
  'border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-300/80 focus:border-primary-400 transition-colors ' +
  'dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-neutral-100 dark:placeholder:text-neutral-500 ' +
  'dark:focus:ring-primary-500/35 dark:focus:border-primary-400/50';

const labelClass =
  'block text-[11px] font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide dark:text-neutral-400';

export default function PricingOptionalInputsComponent({
  value,
  onChange,
}: PricingOptionalInputsProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-5 flex flex-col gap-4 shadow-sm dark:border-white/[0.1] dark:bg-[#101018] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div>
        <p className="text-sm font-medium text-neutral-900 dark:text-white">
          Optional context for stronger pricing
        </p>
        <p className="text-xs text-neutral-600 mt-1 leading-relaxed dark:text-neutral-500">
          Revenue band, SKUs, and costs help the widgets below stay specific to your shop.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pricing-revenue-range" className={labelClass}>
          Monthly revenue range
        </label>
        <select
          id="pricing-revenue-range"
          value={value.monthlyRevenueRange ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              monthlyRevenueRange: e.target.value || null,
            })
          }
          className={fieldClass}
        >
          {REVENUE_OPTIONS.map((opt) => (
            <option key={opt} value={opt} style={{ color: '#111827', backgroundColor: '#ffffff' }}>
              {opt === '' ? 'Select a range…' : opt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pricing-product-names" className={labelClass}>
          Product or service names
        </label>
        <textarea
          id="pricing-product-names"
          rows={2}
          placeholder="e.g. Nasi lemak set, catering package"
          value={value.productServiceNames ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              productServiceNames: e.target.value || null,
            })
          }
          className={`${fieldClass} resize-none`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pricing-cost-per-product" className={labelClass}>
          Cost per product or package
        </label>
        <textarea
          id="pricing-cost-per-product"
          rows={2}
          placeholder="e.g. Nasi lemak set costs RM 8 to make"
          value={value.costPerProduct ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              costPerProduct: e.target.value || null,
            })
          }
          className={`${fieldClass} resize-none`}
        />
      </div>
    </div>
  );
}
