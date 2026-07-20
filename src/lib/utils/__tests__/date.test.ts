import { getCurrentMonthToDateRange } from "@/lib/utils/date";

describe("getCurrentMonthToDateRange", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the 1st of the current month through today, in local time, zero-padded", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 20)); // 20 Jul 2026 (month is 0-indexed)

    expect(getCurrentMonthToDateRange()).toEqual({ startDate: "2026-07-01", endDate: "2026-07-20" });
  });

  it("pads single-digit months and days", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 5)); // 05 Jan 2026

    expect(getCurrentMonthToDateRange()).toEqual({ startDate: "2026-01-01", endDate: "2026-01-05" });
  });

  it("returns the same start and end date on the 1st of the month", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 1)); // 01 Mar 2026

    expect(getCurrentMonthToDateRange()).toEqual({ startDate: "2026-03-01", endDate: "2026-03-01" });
  });
});
