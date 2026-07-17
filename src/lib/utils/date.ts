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
