import {
  addDaysToDateOnly,
  clampDateOnly,
  compareDateOnly,
  formatWeekRangeLabel,
  getTodayDateOnly,
  getWeekDates,
  getWeekStart,
  isDateOnlyInRange,
} from "@/lib/utils/week";

describe("week utils", () => {
  describe("getWeekStart", () => {
    it("returns the same date when it is already a Monday", () => {
      expect(getWeekStart("2025-02-24")).toBe("2025-02-24");
    });

    it("returns the preceding Monday for a mid-week date", () => {
      expect(getWeekStart("2025-02-26")).toBe("2025-02-24");
    });

    it("returns the preceding Monday for a Sunday", () => {
      expect(getWeekStart("2025-03-02")).toBe("2025-02-24");
    });
  });

  describe("getWeekDates", () => {
    it("returns 7 consecutive dates starting from the given Monday", () => {
      expect(getWeekDates("2025-02-24")).toEqual([
        "2025-02-24",
        "2025-02-25",
        "2025-02-26",
        "2025-02-27",
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
      ]);
    });
  });

  describe("addDaysToDateOnly", () => {
    it("adds days across a month boundary", () => {
      expect(addDaysToDateOnly("2025-02-28", 1)).toBe("2025-03-01");
    });

    it("subtracts days across a month boundary", () => {
      expect(addDaysToDateOnly("2025-03-01", -1)).toBe("2025-02-28");
    });
  });

  describe("compareDateOnly / clampDateOnly / isDateOnlyInRange", () => {
    it("compares two dates lexicographically", () => {
      expect(compareDateOnly("2025-01-01", "2025-01-02")).toBeLessThan(0);
      expect(compareDateOnly("2025-01-02", "2025-01-01")).toBeGreaterThan(0);
      expect(compareDateOnly("2025-01-01", "2025-01-01")).toBe(0);
    });

    it("clamps a value below the range to the minimum", () => {
      expect(clampDateOnly("2024-12-31", "2025-01-01", "2025-01-31")).toBe("2025-01-01");
    });

    it("clamps a value above the range to the maximum", () => {
      expect(clampDateOnly("2025-02-01", "2025-01-01", "2025-01-31")).toBe("2025-01-31");
    });

    it("leaves an in-range value unchanged", () => {
      expect(clampDateOnly("2025-01-15", "2025-01-01", "2025-01-31")).toBe("2025-01-15");
    });

    it("reports whether a date falls within an inclusive range", () => {
      expect(isDateOnlyInRange("2025-01-01", "2025-01-01", "2025-01-31")).toBe(true);
      expect(isDateOnlyInRange("2025-01-31", "2025-01-01", "2025-01-31")).toBe(true);
      expect(isDateOnlyInRange("2025-02-01", "2025-01-01", "2025-01-31")).toBe(false);
    });
  });

  describe("getTodayDateOnly", () => {
    const originalTZ = process.env.TZ;

    afterEach(() => {
      process.env.TZ = originalTZ;
      jest.useRealTimers();
    });

    // Only one TZ reassignment per test file: Node's timezone lookup is
    // process-wide, and reassigning `process.env.TZ` a second time within
    // the same process was observed to no longer take effect reliably —
    // so this single case covers the regression rather than risking a
    // flaky second scenario.
    it("returns the user's local calendar date, not the UTC calendar date", () => {
      // UTC+14 (always ahead of UTC) — at 23:30 UTC, local time has already
      // rolled over into the next calendar day. Regression test for the bug
      // where `MyTimesheetView` derived "today" via `formatDateOnly(new
      // Date())`, which goes through `toISOString()` (UTC) and would report
      // the *previous* day for users east of UTC (e.g. Singapore, UTC+8) for
      // the first several hours of every local day.
      process.env.TZ = "Pacific/Kiritimati";
      jest.useFakeTimers().setSystemTime(new Date("2025-02-24T23:30:00Z"));

      expect(getTodayDateOnly()).toBe("2025-02-25");
    });
  });

  describe("formatWeekRangeLabel", () => {
    it("formats a week range spanning two months", () => {
      // Month-first, per the wireframe's exact "Feb 24 – Mar 2, 2025" label
      // for `/timesheets` (docs/HR_System_FE_wireframe.pdf).
      expect(formatWeekRangeLabel("2025-02-24", "2025-03-02")).toBe("Feb 24 – Mar 2, 2025");
    });
  });
});
