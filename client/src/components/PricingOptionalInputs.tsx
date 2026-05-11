/**
 * PricingOptionalInputs — optional context fields for Pricing Strategy section
 * Requirements: 11.1
 *
 * Props:
 *   value    — current PricingOptionalInputs state
 *   onChange — callback when any field changes
 */

import type { PricingOptionalInputs } from "../types";

interface PricingOptionalInputsProps {
  value: PricingOptionalInputs;
  onChange: (value: PricingOptionalInputs) => void;
}

const REVENUE_OPTIONS = [
  "",
  "Below RM 5,000",
  "RM 5,000–RM 20,000",
  "RM 20,000–RM 50,000",
  "RM 50,000–RM 100,000",
  "Above RM 100,000",
] as const;

export default function PricingOptionalInputsComponent({
  value,
  onChange,
}: PricingOptionalInputsProps) {
  return (
    <div className="rounded-xl border border-[#3d3660] bg-[#1a1728] px-5 py-4 flex flex-col gap-4">
      <p className="text-sm font-medium text-[#a78bfa]">
        Optional: Add details to improve pricing recommendations
      </p>

      {/* Monthly Revenue Range */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pricing-revenue-range"
          className="block text-[11px] uppercase tracking-widest text-[#a78bfa] font-semibold mb-1"
        >
          Monthly Revenue Range
        </label>
        <select
          id="pricing-revenue-range"
          value={value.monthlyRevenueRange ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              monthlyRevenueRange: e.target.value || null,
            })
          }
          className="w-full bg-[#221f35] border border-[#3d3660] rounded-[10px] px-3 py-2 text-white
                     placeholder-[#6b6890] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40
                     transition-all duration-200 text-sm"
        >
          {REVENUE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "" ? "Select a range…" : opt}
            </option>
          ))}
        </select>
      </div>

      {/* Product or Service Names */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pricing-product-names"
          className="block text-[11px] uppercase tracking-widest text-[#a78bfa] font-semibold mb-1"
        >
          Product or Service Names
        </label>
        <textarea
          id="pricing-product-names"
          rows={2}
          placeholder="e.g. Nasi Lemak Set, Catering Package"
          value={value.productServiceNames ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              productServiceNames: e.target.value || null,
            })
          }
          className="w-full bg-[#221f35] border border-[#3d3660] rounded-[10px] px-3 py-2 text-white
                     placeholder-[#6b6890] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40
                     transition-all duration-200 text-sm resize-none"
        />
      </div>

      {/* Cost Per Product */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pricing-cost-per-product"
          className="block text-[11px] uppercase tracking-widest text-[#a78bfa] font-semibold mb-1"
        >
          Cost Per Product
        </label>
        <textarea
          id="pricing-cost-per-product"
          rows={2}
          placeholder="e.g. Nasi Lemak Set costs RM 8 to make"
          value={value.costPerProduct ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              costPerProduct: e.target.value || null,
            })
          }
          className="w-full bg-[#221f35] border border-[#3d3660] rounded-[10px] px-3 py-2 text-white
                     placeholder-[#6b6890] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40
                     transition-all duration-200 text-sm resize-none"
        />
      </div>
    </div>
  );
}
