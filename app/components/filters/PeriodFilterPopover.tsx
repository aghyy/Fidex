"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MorphingPopover,
  MorphingPopoverContent,
  MorphingPopoverTrigger,
} from "@/components/motion-primitives/morphing-popover";

type PeriodMode = "month" | "year";

function SafePopoverSelect({
  value,
  onValueChange,
  placeholder,
  children,
  className,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          document.body.dataset.radixSelectOpen = "true";
        }
      }}
    >
      <SelectTrigger className={className} disabled={disabled}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent data-keep-popover-open="true">{children}</SelectContent>
    </Select>
  );
}

export default function PeriodFilterPopover({
  appliedMode,
  appliedYear,
  appliedMonth,
  years,
  monthsByYear,
  onApply,
  className,
  triggerAriaLabel = "Open filters",
}: {
  appliedMode: PeriodMode;
  appliedYear: string;
  appliedMonth: string;
  years: string[];
  monthsByYear: Record<string, string[]>;
  onApply: (next: { mode: PeriodMode; year: string; month: string }) => void;
  className?: string;
  triggerAriaLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftMode, setDraftMode] = useState<PeriodMode>(appliedMode);
  const [draftYear, setDraftYear] = useState(appliedYear);
  const [draftMonth, setDraftMonth] = useState(appliedMonth);

  const draftSelectedMonthPart = draftMonth.split("-")[1] ?? "";
  const draftMonthOptionsForSelectedYear = monthsByYear[draftYear] ?? [];

  useEffect(() => {
    if (!isOpen) return;
    setDraftMode(appliedMode);
    setDraftYear(appliedYear);
    setDraftMonth(appliedMonth);
  }, [isOpen, appliedMode, appliedYear, appliedMonth]);

  useEffect(() => {
    if (years.length === 0) return;
    if (!years.includes(draftYear)) {
      setDraftYear(years[0]);
    }
  }, [years, draftYear]);

  useEffect(() => {
    if (draftMode !== "month") return;
    const months = monthsByYear[draftYear] ?? [];
    if (months.length === 0) return;
    if (!draftMonth.startsWith(`${draftYear}-`) || !months.includes(draftSelectedMonthPart)) {
      setDraftMonth(`${draftYear}-${months[0]}`);
    }
  }, [draftMode, monthsByYear, draftYear, draftMonth, draftSelectedMonthPart]);

  const applyDraftFilters = () => {
    let nextYear = draftYear;
    if (years.length > 0 && !years.includes(nextYear)) {
      nextYear = years[0];
    }
    let nextMonth = draftMonth;
    if (draftMode === "month") {
      const months = monthsByYear[nextYear] ?? [];
      const monthPart = nextMonth.split("-")[1] ?? "";
      if (months.length > 0 && (!nextMonth.startsWith(`${nextYear}-`) || !months.includes(monthPart))) {
        nextMonth = `${nextYear}-${months[0]}`;
      }
    }

    onApply({ mode: draftMode, year: nextYear, month: nextMonth });
    setIsOpen(false);
  };

  return (
    <div className={className}>
      <MorphingPopover open={isOpen} onOpenChange={setIsOpen}>
        <MorphingPopoverTrigger
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/25 text-white shadow-md backdrop-blur-md transition-colors hover:bg-white/35 dark:border-white/30 dark:bg-white/10 dark:hover:bg-white/20"
          aria-label={triggerAriaLabel}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </MorphingPopoverTrigger>
        <MorphingPopoverContent className="right-0 top-0 w-[320px] p-3">
          <div className="space-y-3" data-keep-popover-open="true">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Filters</p>
            <div className="inline-flex rounded-lg border bg-background p-1">
              <Button
                type="button"
                variant={draftMode === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDraftMode("month")}
              >
                Month
              </Button>
              <Button
                type="button"
                variant={draftMode === "year" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDraftMode("year")}
              >
                Year
              </Button>
            </div>
            {draftMode === "month" ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <SafePopoverSelect
                  value={draftYear}
                  onValueChange={setDraftYear}
                  placeholder="Select year"
                  className="h-10 bg-background"
                  disabled={years.length === 0}
                >
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SafePopoverSelect>
                <SafePopoverSelect
                  value={draftSelectedMonthPart}
                  onValueChange={(month) => setDraftMonth(`${draftYear}-${month}`)}
                  placeholder="Select month"
                  className="h-10 bg-background"
                  disabled={draftMonthOptionsForSelectedYear.length === 0}
                >
                  {draftMonthOptionsForSelectedYear.map((month) => (
                    <SelectItem key={month} value={month}>
                      {new Date(2000, Number(month) - 1, 1).toLocaleString(undefined, { month: "long" })}
                    </SelectItem>
                  ))}
                </SafePopoverSelect>
              </div>
            ) : (
              <SafePopoverSelect
                value={draftYear}
                onValueChange={setDraftYear}
                placeholder="Select year"
                className="h-10 bg-background"
                disabled={years.length === 0}
              >
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SafePopoverSelect>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={applyDraftFilters}>
                Apply filters
              </Button>
            </div>
          </div>
        </MorphingPopoverContent>
      </MorphingPopover>
    </div>
  );
}
