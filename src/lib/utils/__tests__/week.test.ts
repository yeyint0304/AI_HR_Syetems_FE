import {
  addDaysToDateOnly,
  clampDateOnly,
  compareDateOnly,
  formatWeekRangeLabel,
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

  describe("formatWeekRangeLabel", () => {
    it("formats a week range spanning two months", () => {
      // Month-first, per the wireframe's exact "Feb 24 – Mar 2, 2025" label
      // for `/timesheets` (docs/HR_System_FE_wireframe.pdf).
      expect(formatWeekRangeLabel("2025-02-24", "2025-03-02")).toBe("Feb 24 – Mar 2, 2025");
    });
  });
});
