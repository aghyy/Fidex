import { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ColorPickerPopover } from "@/components/ui/color-picker";
import { rgbaArrayToHex } from "@/utils/colors";

export const DEFAULT_COLOR_SWATCHES = [
  "#f43f5e", // rose-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#84cc16", // lime-500
  "#22c55e", // green-500
  "#10b981", // emerald-500
  "#14b8a6", // teal-500
  "#06b6d4", // cyan-500
  "#0ea5e9", // sky-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#d946ef", // fuchsia-500
  "#ec4899", // pink-500
] as const;

export const normalizeHexColor = (
  value?: string | null,
  fallback: string = DEFAULT_COLOR_SWATCHES[0],
): string => {
  const base = typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
  const withHash = base.startsWith("#") ? base : `#${base}`;
  return withHash.toUpperCase();
};

type ColorSwatchPickerProps = {
  value?: string | null;
  onChange: (color: string) => void;
  className?: string;
  colors?: readonly string[];
};

export function ColorSwatchPicker({
  value,
  onChange,
  className,
  colors = DEFAULT_COLOR_SWATCHES,
}: ColorSwatchPickerProps) {
  const palette = useMemo(() => colors.map((color) => normalizeHexColor(color)), [colors]);
  const normalizedValue = normalizeHexColor(value, palette[0]);
  const isPreset = palette.includes(normalizedValue);

  const handlePopoverChange = useCallback(
    (input: unknown) => {
      const hex = rgbaArrayToHex(input);
      if (hex) {
        onChange(normalizeHexColor(hex, palette[0]));
      }
    },
    [onChange, palette],
  );

  return (
    <div className={cn("w-full max-w-full", className)}>
      <div className="flex min-w-max flex-nowrap items-center gap-2 pb-1 pr-1">
        <ColorPickerPopover
          value={normalizedValue}
          onChange={handlePopoverChange}
          isActive={!isPreset}
        />
        {palette.map((hex) => {
          const isActive = normalizedValue === hex;
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              className={cn(
                "h-6 w-6 shrink-0 rounded-full border transition-shadow",
                isActive ? "ring-2 ring-primary" : "",
              )}
              style={{ backgroundColor: hex }}
              aria-label={`Pick ${hex}`}
              title={hex}
            />
          );
        })}
      </div>
    </div>
  );
}

