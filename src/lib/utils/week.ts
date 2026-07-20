/**
 * Pure, timezone-safe date-only helpers backing the "My Timesheets" weekly
 * grid (`components/timesheets/MyTimesheetView.tsx`). All inputs/outputs are
 * `yyyy-MM-dd` strings — matching the backend's documented date-only format
 * for `TimesheetEntry.EntryDate`/`TimesheetPeriod.PeriodStart`/`PeriodEnd`
 * (see `docs/HR_System_BE.postman_collection.json`) — and every calculation
 * is done against UTC-midnight `Date` instances specifically to avoid the
 * classic local-timezone off-by-one-day bug when parsing/formatting
 * date-only values.
 */

/** Parses a `yyyy-MM-dd` string into a UTC-midnight `Date`. */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Formats a UTC-midnight `Date` back to `yyyy-MM-dd`. */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Adds (or subtracts, if negative) whole days to a `yyyy-MM-dd` value. */
export function addDaysToDateOnly(value: string, days: number): string {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

/** Returns the Monday (ISO week start) of the week containing `value`. */
export function getWeekStart(value: string): string {
  const date = parseDateOnly(value);
  const day = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diffToMonday);
  return formatDateOnly(date);
}

/** Returns the 7 date-only strings (Mon..Sun) of the week starting at `weekStart`. */
export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysToDateOnly(weekStart, index));
}

/** Lexicographic `yyyy-MM-dd` comparison (safe because the format is zero-padded). */
export function compareDateOnly(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Clamps a `yyyy-MM-dd` value into the inclusive `[min, max]` range. */
export function clampDateOnly(value: string, min: string, max: string): string {
  if (compareDateOnly(value, min) < 0) return min;
  if (compareDateOnly(value, max) > 0) return max;
  return value;
}

/** Returns true if `value` falls within the inclusive `[start, end]` range. */
export function isDateOnlyInRange(value: string, start: string, end: string): boolean {
  return compareDateOnly(value, start) >= 0 && compareDateOnly(value, end) <= 0;
}

export const WEEKDAY_LABELS: readonly string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_ABBREVIATIONS: readonly string[] = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats a `yyyy-MM-dd` value as "MMM D" (e.g. "Feb 24"). Deliberately does
 * *not* use `Date#toLocaleDateString` — `Intl` month/day ordering for a given
 * locale (e.g. `en-SG`) depends on the runtime's ICU data and can render
 * day-before-month, which would silently diverge from the exact "Feb 24"
 * month-first format the weekly grid's column headers and week-range label
 * are specified with in `docs/HR_System_FE_wireframe.pdf` (`/timesheets`).
 * Formatting it manually keeps the output deterministic across every
 * environment (dev, CI, production) regardless of locale/ICU support.
 */
function formatMonthDay(value: string): string {
  const date = parseDateOnly(value);
  return `${MONTH_ABBREVIATIONS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/** Formats a `yyyy-MM-dd` week range for display, e.g. "Feb 24 – Mar 2, 2025". */
export function formatWeekRangeLabel(weekStart: string, weekEnd: string): string {
  const endYear = parseDateOnly(weekEnd).getUTCFullYear();
  return `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd)}, ${endYear}`;
}

/** Short day-of-month label for a grid column header, e.g. "Feb 24". */
export function formatShortDate(value: string): string {
  return formatMonthDay(value);
}
