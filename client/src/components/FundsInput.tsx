/**
 * FundsInput — slider + numeric input, synchronised
 * Requirements: 1.3
 *
 * Accepts a numeric value in the range [1000, 999999999] and keeps
 * a range slider and a text input in sync. The current value is
 * displayed below the controls formatted with `formatRM`.
 */

import { useState } from "react";
import { formatRM } from "../utils/formatRM";

const MIN = 1_000;
const MAX = 999_999_999;
const STEP = 1_000;

interface FundsInputProps {
  value: number;
  onChange: (value: number) => void;
}

function clamp(n: number): number {
  if (isNaN(n)) return MIN;
  return Math.min(MAX, Math.max(MIN, n));
}

export default function FundsInput({ value, onChange }: FundsInputProps) {
  // Local raw text state so the user can type freely before committing
  const [rawText, setRawText] = useState<string>(String(value));

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value);
    setRawText(String(next));
    onChange(next);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRawText(e.target.value);
  }

  function handleTextBlur() {
    const parsed = parseInt(rawText.replace(/[^0-9]/g, ""), 10);
    const clamped = clamp(parsed);
    setRawText(String(clamped));
    onChange(clamped);
  }

  function handleTextKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controls row */}
      <div className="flex items-center gap-4">
        {/* Range slider — custom thumb via index.css */}
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={value}
          onChange={handleSliderChange}
          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer w-full accent-primary-600"
          aria-label="Current funds slider"
        />

        {/* Numeric text input */}
        <input
          type="text"
          inputMode="numeric"
          value={rawText}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
          className="w-36 input-field text-right py-2"
          aria-label="Current funds amount"
        />
      </div>

      {/* Formatted display */}
      <p className="text-sm font-semibold text-primary-700">
        {formatRM(value)}
      </p>
    </div>
  );
}
