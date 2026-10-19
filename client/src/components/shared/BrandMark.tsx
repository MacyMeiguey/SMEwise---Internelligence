/**
 * BrandMark — filled lavender tile with white S (matches favicon).
 */

type Size = 'xs' | 'sm' | 'md' | 'lg';

interface BrandMarkProps {
  size?: Size;
  className?: string;
}

const SIZE_MAP: Record<Size, string> = {
  xs: 'h-5 w-5 rounded-[5px] text-[11px]',
  sm: 'h-6 w-6 rounded-md text-[13px]',
  md: 'h-8 w-8 rounded-lg text-[15px]',
  lg: 'h-9 w-9 rounded-[10px] text-[17px]',
};

export default function BrandMark({ size = 'sm', className = '' }: BrandMarkProps) {
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center shrink-0 bg-primary-600 text-white font-extrabold leading-none tracking-tight select-none ${SIZE_MAP[size]} ${className}`}
    >
      S
    </span>
  );
}
