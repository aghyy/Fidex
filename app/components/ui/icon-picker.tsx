import React from "react";
import { cn } from "@/lib/utils";
import {
  MorphingPopover,
  MorphingPopoverTrigger,
  MorphingPopoverContent,
  useMorphingPopover,
} from "@/components/motion-primitives/morphing-popover";
import { renderIconByName } from "@/utils/icons";
import { determineTextColor } from "@/utils/colors";

type IconPickerProps = {
  value?: string | null;
  icons: readonly string[];
  onChange: (icon: string) => void;
  className?: string;
  triggerClassName?: string;
  backgroundColor?: string | null;
  gridColumns?: number;
};

const FALLBACK_ICON = "IconQuestionMark" as const;

function normalizeIcon(value: string | null | undefined, palette: readonly string[]): string {
  if (value && palette.includes(value)) {
    return value;
  }
  if (palette.includes(FALLBACK_ICON)) {
    return FALLBACK_ICON;
  }
  return palette[0] ?? FALLBACK_ICON;
}

export function IconPicker({
  value,
  icons,
  onChange,
  className,
  triggerClassName,
  backgroundColor,
  gridColumns = 5,
}: IconPickerProps) {
  const palette = React.useMemo(() => [...icons], [icons]);
  const [current, setCurrent] = React.useState(() => normalizeIcon(value, palette));
  const textColor = determineTextColor(backgroundColor ?? undefined);

  React.useEffect(() => {
    setCurrent(normalizeIcon(value, palette));
  }, [value, palette]);

  const handleSelect = React.useCallback(
    (icon: string) => {
      setCurrent(icon);
      onChange(icon);
    },
    [onChange],
  );

  const columnClass = React.useMemo(() => {
    const safe = Math.max(3, Math.min(8, gridColumns));
    const lookup: Record<number, string> = {
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
      7: "grid-cols-7",
      8: "grid-cols-8",
    };
    return lookup[safe] ?? "grid-cols-5";
  }, [gridColumns]);

  return (
    <MorphingPopover className={cn("h-10 w-10", className)}>
      <MorphingPopoverTrigger
        data-keep-popover-open="true"
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg border bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          triggerClassName,
        )}
        style={{
          backgroundColor: backgroundColor ?? undefined,
          color: textColor,
        }}
        aria-label="Select icon"
      >
        {renderIconByName(current, backgroundColor, true)}
      </MorphingPopoverTrigger>
      <MorphingPopoverContent
        data-keep-popover-open="true"
        className="z-50 w-[252px] p-3 shadow-lg"
      >
        <IconGrid
          palette={palette}
          current={current}
          onSelect={handleSelect}
          backgroundColor={backgroundColor}
          columnClass={columnClass}
        />
      </MorphingPopoverContent>

    </MorphingPopover>
  );
}

type IconGridProps = {
  palette: readonly string[];
  current: string;
  onSelect: (icon: string) => void;
  backgroundColor?: string | null;
  columnClass: string;
};

function IconGrid({ palette, current, onSelect, backgroundColor, columnClass }: IconGridProps) {
  const popover = useMorphingPopover();

  return (
    <div className={cn("grid gap-2", columnClass)}>
      {palette.map((icon) => {
        const isActive = icon === current;
        return (
          <button
            key={icon}
            type="button"
            onClick={() => {
              onSelect(icon);
              popover.close();
            }}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md transition",
              isActive
                ? "border-primary ring-2 ring-primary/80"
                : "hover:border-primary/40",
            )}
            aria-label={icon}
            title={icon}
          >
            {renderIconByName(icon, backgroundColor, true)}
          </button>
        );
      })}
    </div>
  );
}

