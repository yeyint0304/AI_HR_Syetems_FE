import {
  createTimesheetPeriodSchema,
  timesheetPeriodListQuerySchema,
} from "@/lib/validators/timesheetPeriod.validators";

const VALID_PERIOD = {
  periodStart: "2026-03-01",
  periodEnd: "2026-05-15",
};

describe("timesheetPeriod.validators", () => {
  describe("createTimesheetPeriodSchema", () => {
    it("accepts a fully valid payload", () => {
      const result = createTimesheetPeriodSchema.safeParse(VALID_PERIOD);
      expect(result.success).toBe(true);
    });

    it("rejects a missing period start date", () => {
      const result = createTimesheetPeriodSchema.safeParse({ ...VALID_PERIOD, periodStart: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing period end date", () => {
      const result = createTimesheetPeriodSchema.safeParse({ ...VALID_PERIOD, periodEnd: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a non YYYY-MM-DD period start date", () => {
      const result = createTimesheetPeriodSchema.safeParse({
        ...VALID_PERIOD,
        periodStart: "03/01/2026",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an end date before the start date", () => {
      const result = createTimesheetPeriodSchema.safeParse({
        periodStart: "2026-05-15",
        periodEnd: "2026-03-01",
      });
      expect(result.success).toBe(false);
    });

    it("accepts an end date equal to the start date", () => {
      const result = createTimesheetPeriodSchema.safeParse({
        periodStart: "2026-03-01",
        periodEnd: "2026-03-01",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("timesheetPeriodListQuerySchema", () => {
    it("accepts an empty filter set", () => {
      expect(timesheetPeriodListQuerySchema.safeParse({}).success).toBe(true);
    });

    it("accepts valid isLocked/year/month filters", () => {
      const result = timesheetPeriodListQuerySchema.safeParse({
        isLocked: "true",
        year: "2025",
        month: "1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid isLocked value", () => {
      const result = timesheetPeriodListQuerySchema.safeParse({ isLocked: "yes" });
      expect(result.success).toBe(false);
    });

    it("rejects an out-of-range month", () => {
      expect(timesheetPeriodListQuerySchema.safeParse({ month: "13" }).success).toBe(false);
      expect(timesheetPeriodListQuerySchema.safeParse({ month: "0" }).success).toBe(false);
    });
  });
});
