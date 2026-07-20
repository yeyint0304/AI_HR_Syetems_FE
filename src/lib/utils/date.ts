/** Small date-formatting helpers shared by the Project list/detail screens. */

/** Formats an ISO date/datetime string as `yyyy-MM-dd` for `<input type="date">` binding. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

/** Formats an ISO date string for display (e.g. "15 Jan 2025"). Falls back to the raw value if unparsable. */
export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-SG", { year: "numeric", month: "short", day: "2-digit" });
}

/** Formats a `Date` as a local (not UTC) `yyyy-MM-dd` string, for `<input type="date">` defaults. */
function toIsoDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Default `{ startDate, endDate }` range used to pre-fill report filter bars
 * (`components/reports/*`): the 1st of the current month through today, in
 * local time. Callers remain free to change either bound before applying.
 */
export function getCurrentMonthToDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: toIsoDateOnly(startOfMonth), endDate: toIsoDateOnly(now) };
}
