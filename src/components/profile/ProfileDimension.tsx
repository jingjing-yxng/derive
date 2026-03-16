"use client";

interface ProfileDimensionProps {
  label: string;
  description: string;
  value: number;
  color?: string;
  onChange?: (value: number) => void;
}

export function ProfileDimension({
  label,
  description,
  value,
  color = "#7B82C7",
  onChange,
}: ProfileDimensionProps) {
  const pct = ((value - 1) / 9) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[1px] text-n-500">{label}</span>
        <span
          className="text-sm font-semibold"
          style={{ color }}
        >
          {value}/10
        </span>
      </div>
      <div className="relative h-5">
        {/* Visible track — single 6px bar, fill + unfill via gradient */}
        <div
          className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, ${color}18 ${pct}%, ${color}18 100%)`,
          }}
        />
        {/* Transparent range input overlaid, thumb centered on track */}
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => onChange?.(parseInt(e.target.value))}
          className="slider-input absolute inset-x-0 top-1/2 z-10 w-full -translate-y-1/2 cursor-pointer"
          style={{
            // @ts-expect-error CSS custom property for slider thumb
            "--slider-color": color,
          }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-n-400">
        <span>{description.split(" vs ")[0]}</span>
        <span>{description.split(" vs ")[1]}</span>
      </div>
    </div>
  );
}
