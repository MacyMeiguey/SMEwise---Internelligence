/**
 * PricingOptionalInputs — optional context fields for Pricing Strategy.
 * Exposes a `validate()` method via forwardRef so Dashboard can block
 * widget generation until both Product Name and Cost pass validation.
 */

import { forwardRef, useImperativeHandle, useState } from 'react';
import type { PricingOptionalInputs } from '../types';

// ─── Validation helpers ───────────────────────────────────────────────────────

/**
 * Returns true if the product name looks like real input.
 * Rejects: empty, < 2 chars, all-numeric, gibberish (no vowels in 4+ char strings),
 * or strings that are only punctuation/symbols.
 */
function isValidProductName(raw: string): boolean {
  const s = raw.trim()
  if (!s || s.length < 2) return false
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(s)) return false
  // If 4+ chars and no vowels → likely gibberish (e.g. "xkcd", "qwrt")
  if (s.length >= 4 && !/[aeiouAEIOU]/.test(s)) return false
  return true
}

/**
 * Returns true if every non-empty line in the cost field is a positive number.
 * Strips common RM prefix before parsing.
 */
function isValidCost(raw: string): boolean {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return false
  return lines.every(line => {
    const cleaned = line.replace(/^RM\s*/i, '').replace(/,/g, '')
    const num = parseFloat(cleaned)
    return !isNaN(num) && num > 0
  })
}

// ─── Public interface exposed via ref ─────────────────────────────────────────

export interface PricingInputsValidationRef {
  /** Returns true if both fields pass. Shows inline errors if not. */
  validate: () => boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

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

const fieldErrorClass =
  'w-full rounded-xl px-3 py-2.5 text-sm ' +
  'border border-red-400 bg-white text-neutral-900 placeholder:text-neutral-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-red-300/80 focus:border-red-400 transition-colors ' +
  'dark:border-red-500/60 dark:bg-white/[0.06] dark:text-neutral-100 dark:placeholder:text-neutral-500 ' +
  'dark:focus:ring-red-500/35 dark:focus:border-red-500/60';

const labelClass =
  'block text-[11px] font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide dark:text-neutral-400';

const PricingOptionalInputsComponent = forwardRef<
  PricingInputsValidationRef,
  PricingOptionalInputsProps
>(function PricingOptionalInputsComponent({ value, onChange }, ref) {
  const [productNameError, setProductNameError] = useState<string>('')
  const [costError, setCostError]               = useState<string>('')

  // Expose validate() to parent via ref
  useImperativeHandle(ref, () => ({
    validate() {
      let valid = true

      const productName = value.productServiceNames?.trim() ?? ''
      if (!isValidProductName(productName)) {
        setProductNameError(
          'Please enter a valid product or service name (e.g. "Iced Latte", "Logo Design"). Avoid gibberish or single characters.'
        )
        valid = false
      } else {
        setProductNameError('')
      }

      const cost = value.costPerProduct?.trim() ?? ''
      if (!isValidCost(cost)) {
        setCostError(
          'Please enter a valid cost (e.g. 5.50 or RM 8). Cost must be a positive number.'
        )
        valid = false
      } else {
        setCostError('')
      }

      return valid
    },
  }))

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

      {/* Monthly revenue range */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pricing-revenue-range" className={labelClass}>
          Monthly revenue range
        </label>
        <select
          id="pricing-revenue-range"
          value={value.monthlyRevenueRange ?? ''}
          onChange={(e) =>
            onChange({ ...value, monthlyRevenueRange: e.target.value || null })
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

      {/* Product or service names */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pricing-product-names" className={labelClass}>
          Product or service names <span className="text-red-500 ml-0.5">*</span>
        </label>
        <textarea
          id="pricing-product-names"
          rows={2}
          placeholder="e.g. Nasi lemak set, catering package"
          value={value.productServiceNames ?? ''}
          onChange={(e) => {
            if (productNameError) setProductNameError('')
            onChange({ ...value, productServiceNames: e.target.value || null })
          }}
          className={`${productNameError ? fieldErrorClass : fieldClass} resize-none`}
        />
        {productNameError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 leading-snug" role="alert">
            {productNameError}
          </p>
        )}
      </div>

      {/* Cost per product */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pricing-cost-per-product" className={labelClass}>
          Cost per product or package <span className="text-red-500 ml-0.5">*</span>
        </label>
        <textarea
          id="pricing-cost-per-product"
          rows={2}
          placeholder="e.g. 8.50 or RM 8 to make"
          value={value.costPerProduct ?? ''}
          onChange={(e) => {
            if (costError) setCostError('')
            onChange({ ...value, costPerProduct: e.target.value || null })
          }}
          className={`${costError ? fieldErrorClass : fieldClass} resize-none`}
        />
        {costError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 leading-snug" role="alert">
            {costError}
          </p>
        )}
      </div>
    </div>
  );
});

export default PricingOptionalInputsComponent;
