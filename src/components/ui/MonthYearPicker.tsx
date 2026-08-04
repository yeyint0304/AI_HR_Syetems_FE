"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_OPTIONS } from "@/lib/constants/report.constants";

export interface MonthYearPickerProps {
  label: string;
  id?: string;
  /** Selected year, e.g. `2026`. */
  year: number;
  /** Selected month, `1`-`12`. */
  month: number;
  onChange: (year: number, month: number) => void;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  /** Field-level validation error (e.g. from Zod). */
  error?: string;
}

const SHORT_MONTH_LABELS = MONTH_OPTIONS.map((option) => option.label.slice(0, 3));

/**
 * Accessible month + year calendar picker: a disclosure button showing the
 * currently selected "<Month> <Year>" that opens a popover with year
 * navigation (prev/next) and a 3x4 grid of month buttons — used in place of
 * a native `<input type="month">` textbox on report filter bars (see
 * `components/reports/CostRevenueReportView.tsx`), per the wireframe's
 * calendar-style month/year filter.
 *
 * Follows the same disclosure/click-outside/Escape-to-close pattern as
 * `SearchableSelectField`, but exposes a `role="dialog"` popover of month
 * buttons rather than a `role="listbox"` of text options.
 */
export function MonthYearPicker({
  label,
  id,
  year,
  month,
  onChange,
  minYear = 1900,
  maxYear = 2100,
  disabled = false,
  error,
}: MonthYearPickerProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const panelId = `${fieldId}-panel`;
  const errorId = `${fieldId}-error`;

  const [isOpen, setIsOpen] = useState(false);
  // The year currently being browsed in the popover — may differ from the
  // applied `year` prop while the user is paging through years before
  // picking a month.
  const [viewYear, setViewYear] = useState(year);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset the browsed year to the applied `year` every time the popover
  // transitions from closed to open — adjusted during render (rather than in
  // an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes,
  // since setting state directly inside an effect body causes an extra,
  // avoidable render pass. Mirrors `SearchableSelectField`'s `prevOptions`
  // pattern.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setViewYear(year);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedMonthLabel = MONTH_OPTIONS[month - 1]?.label;
  const displayValue = selectedMonthLabel ? `${selectedMonthLabel} ${year}` : "Select month";

  function selectMonth(nextMonth: number) {
    onChange(viewYear, nextMonth);
    setIsOpen(false);
  }

  const canGoToPreviousYear = viewYear > minYear;
  const canGoToNextYear = viewYear < maxYear;

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <button
        type="button"
        id={fieldId}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-describedby={error ? errorId : undefined}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-sm text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          error ? "border-red-400" : "border-slate-300"
        }`}
      >
        <span>{displayValue}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      </button>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {isOpen && !disabled && (
        <div
          id={panelId}
          role="dialog"
          aria-label={`Choose month and year for ${label}`}
          className="absolute top-full left-0 z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous year"
              disabled={!canGoToPreviousYear}
              onClick={() => setViewYear((prev) => prev - 1)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-sm font-semibold text-slate-900" aria-live="polite">
              {viewYear}
            </span>
            <button
              type="button"
              aria-label="Next year"
              disabled={!canGoToNextYear}
              onClick={() => setViewYear((prev) => prev + 1)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Month">
            {MONTH_OPTIONS.map((option, index) => {
              const optionMonth = index + 1;
              const isSelected = viewYear === year && optionMonth === month;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={isSelected}
                  onClick={() => selectMonth(optionMonth)}
                  className={`rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
                    isSelected ? "bg-blue-600 font-semibold text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {SHORT_MONTH_LABELS[index]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
