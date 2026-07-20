import {
  monthlyCostRevenueFilterSchema,
  monthlyCostRevenueQuerySchema,
  timesheetReportFilterSchema,
  timesheetReportQuerySchema,
  userRolesSummaryFilterSchema,
  userRolesSummaryQuerySchema,
} from "@/lib/validators/report.validators";

describe("report.validators", () => {
  describe("timesheetReportFilterSchema", () => {
    it("accepts a minimal valid filter bar", () => {
      const result = timesheetReportFilterSchema.safeParse({ startDate: "2026-01-01", endDate: "2026-01-31" });
      expect(result.success).toBe(true);
    });

    it("rejects a missing startDate", () => {
      const result = timesheetReportFilterSchema.safeParse({ startDate: "", endDate: "2026-01-31" });
      expect(result.success).toBe(false);
    });

    it("rejects a malformed date string", () => {
      const result = timesheetReportFilterSchema.safeParse({ startDate: "01/01/2026", endDate: "2026-01-31" });
      expect(result.success).toBe(false);
    });

    it("rejects startDate after endDate", () => {
      const result = timesheetReportFilterSchema.safeParse({ startDate: "2026-02-01", endDate: "2026-01-01" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(["endDate"]);
      }
    });

    it("accepts startDate equal to endDate (single-day range)", () => {
      const result = timesheetReportFilterSchema.safeParse({ startDate: "2026-01-01", endDate: "2026-01-01" });
      expect(result.success).toBe(true);
    });
  });

  describe("timesheetReportQuerySchema", () => {
    it("accepts a fully-populated valid query", () => {
      const result = timesheetReportQuerySchema.safeParse({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
        userId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
        isApproved: "true",
        page: "2",
        pageSize: "50",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.pageSize).toBe(50);
      }
    });

    it("rejects a non-GUID projectId", () => {
      const result = timesheetReportQuerySchema.safeParse({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        projectId: "not-a-guid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a pageSize above the 500 cap", () => {
      const result = timesheetReportQuerySchema.safeParse({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        pageSize: "501",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an isApproved value outside true/false", () => {
      const result = timesheetReportQuerySchema.safeParse({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        isApproved: "maybe",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("userRolesSummaryFilterSchema / querySchema", () => {
    it("requires both startDate and endDate", () => {
      expect(userRolesSummaryFilterSchema.safeParse({ startDate: "2026-01-01", endDate: "" }).success).toBe(false);
    });

    it("rejects an inverted date range", () => {
      const result = userRolesSummaryQuerySchema.safeParse({ startDate: "2026-03-01", endDate: "2026-01-01" });
      expect(result.success).toBe(false);
    });

    it("accepts an optional projectId omitted", () => {
      const result = userRolesSummaryFilterSchema.safeParse({ startDate: "2026-01-01", endDate: "2026-01-31" });
      expect(result.success).toBe(true);
    });
  });

  describe("monthlyCostRevenueFilterSchema / querySchema", () => {
    it("coerces string year/month to numbers", () => {
      const result = monthlyCostRevenueFilterSchema.safeParse({ year: "2026", month: "7" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.year).toBe(2026);
        expect(result.data.month).toBe(7);
      }
    });

    it("rejects a month outside 1-12", () => {
      expect(monthlyCostRevenueFilterSchema.safeParse({ year: "2026", month: "13" }).success).toBe(false);
      expect(monthlyCostRevenueFilterSchema.safeParse({ year: "2026", month: "0" }).success).toBe(false);
    });

    it("rejects a year outside the documented bounds", () => {
      expect(monthlyCostRevenueFilterSchema.safeParse({ year: "1999", month: "1" }).success).toBe(false);
      expect(monthlyCostRevenueFilterSchema.safeParse({ year: "2101", month: "1" }).success).toBe(false);
    });

    it("rejects a non-GUID currencyId on the query schema", () => {
      const result = monthlyCostRevenueQuerySchema.safeParse({ year: "2026", month: "7", currencyId: "abc" });
      expect(result.success).toBe(false);
    });
  });
});
