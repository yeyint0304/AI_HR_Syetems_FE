import {
  mapBackendMonthlyCostRevenue,
  mapBackendTimesheetReport,
  mapBackendUserRolesSummary,
} from "@/lib/server/reportResponseMappers";

describe("reportResponseMappers", () => {
  describe("mapBackendTimesheetReport", () => {
    it("maps a fully-populated PascalCase backend payload", () => {
      const mapped = mapBackendTimesheetReport({
        ReportGeneratedAt: "2026-07-20T00:00:00Z",
        StartDate: "2026-07-01",
        EndDate: "2026-07-20",
        TotalHours: 40,
        TotalCount: 2,
        Page: 1,
        PageSize: 100,
        Items: [
          {
            User: { Id: "u1", FullName: "Jane Doe", EmployeeId: "E001" },
            Project: { Id: "p1", Code: "PRJ-A", Name: "Project Alpha" },
            EntryDate: "2026-07-01",
            Hours: 8,
            TaskDescription: "Did work",
            IsApproved: true,
          },
        ],
      });

      expect(mapped).toEqual({
        reportGeneratedAt: "2026-07-20T00:00:00Z",
        startDate: "2026-07-01",
        endDate: "2026-07-20",
        totalHours: 40,
        totalCount: 2,
        page: 1,
        pageSize: 100,
        items: [
          {
            user: { id: "u1", fullName: "Jane Doe", employeeId: "E001" },
            project: { id: "p1", code: "PRJ-A", name: "Project Alpha" },
            entryDate: "2026-07-01",
            hours: 8,
            taskDescription: "Did work",
            isApproved: true,
          },
        ],
      });
    });

    it("drops items missing a required User or Project reference", () => {
      const mapped = mapBackendTimesheetReport({
        StartDate: "2026-07-01",
        EndDate: "2026-07-20",
        Items: [
          { User: null, Project: { Id: "p1", Code: "PRJ-A", Name: "Project Alpha" }, Hours: 8 },
          { User: { Id: "u1", FullName: "Jane Doe" }, Project: null, Hours: 8 },
        ],
      });

      expect(mapped?.items).toEqual([]);
    });

    it("returns null for a non-object payload", () => {
      expect(mapBackendTimesheetReport(null)).toBeNull();
      expect(mapBackendTimesheetReport(undefined)).toBeNull();
      expect(mapBackendTimesheetReport("not an object")).toBeNull();
    });

    it("defaults missing numeric/array fields safely", () => {
      const mapped = mapBackendTimesheetReport({});
      expect(mapped).toEqual({
        reportGeneratedAt: "",
        startDate: "",
        endDate: "",
        totalHours: 0,
        totalCount: 0,
        page: 1,
        pageSize: 0,
        items: [],
      });
    });
  });

  describe("mapBackendUserRolesSummary", () => {
    it("maps a fully-populated payload", () => {
      const mapped = mapBackendUserRolesSummary({
        StartDate: "2026-07-01",
        EndDate: "2026-07-20",
        GrandTotalHours: 120,
        Summary: [
          { ResourceRoleType: { Id: "r1", Name: "Developer" }, TotalHours: 80, UserCount: 4 },
          { ResourceRoleType: { Id: "r2", Name: "QA" }, TotalHours: 40, UserCount: 2 },
        ],
      });

      expect(mapped?.summary).toHaveLength(2);
      expect(mapped?.grandTotalHours).toBe(120);
      expect(mapped?.summary[0]).toEqual({
        resourceRoleType: { id: "r1", name: "Developer" },
        totalHours: 80,
        userCount: 4,
      });
    });

    it("drops rows missing a resourceRoleType reference", () => {
      const mapped = mapBackendUserRolesSummary({
        StartDate: "2026-07-01",
        EndDate: "2026-07-20",
        Summary: [{ ResourceRoleType: null, TotalHours: 10, UserCount: 1 }],
      });
      expect(mapped?.summary).toEqual([]);
    });

    it("returns null for a non-object payload", () => {
      expect(mapBackendUserRolesSummary(42)).toBeNull();
    });
  });

  describe("mapBackendMonthlyCostRevenue", () => {
    it("maps a fully-populated payload, including the string ResourceRoleType breakdown row", () => {
      const mapped = mapBackendMonthlyCostRevenue({
        Year: 2026,
        Month: 7,
        Currency: { Id: "c1", Code: "SGD", Symbol: "$" },
        Projects: [
          {
            Project: { Id: "p1", Code: "PRJ-A", Name: "Project Alpha" },
            TotalHours: 100,
            TotalCost: 5000,
            TotalRevenue: 8000,
            Margin: 0.375,
            Breakdown: [
              {
                ResourceRoleType: "Developer",
                Hours: 100,
                CostRate: 50,
                BillingRate: 80,
                Cost: 5000,
                Revenue: 8000,
              },
            ],
          },
        ],
      });

      expect(mapped?.year).toBe(2026);
      expect(mapped?.month).toBe(7);
      expect(mapped?.currency).toEqual({ id: "c1", code: "SGD", symbol: "$" });
      expect(mapped?.projects[0].breakdown[0]).toEqual({
        resourceRoleType: "Developer",
        hours: 100,
        costRate: 50,
        billingRate: 80,
        cost: 5000,
        revenue: 8000,
      });
    });

    it("omits currency when absent rather than defaulting to an empty object", () => {
      const mapped = mapBackendMonthlyCostRevenue({ Year: 2026, Month: 7, Projects: [] });
      expect(mapped?.currency).toBeUndefined();
    });

    it("drops project rows missing a project reference", () => {
      const mapped = mapBackendMonthlyCostRevenue({
        Year: 2026,
        Month: 7,
        Projects: [{ Project: null, TotalHours: 10 }],
      });
      expect(mapped?.projects).toEqual([]);
    });

    it("supports camelCase backend payloads as well as PascalCase", () => {
      const mapped = mapBackendMonthlyCostRevenue({
        year: 2026,
        month: 7,
        currency: { id: "c1", code: "SGD", symbol: "$" },
        projects: [],
      });
      expect(mapped).toEqual({ year: 2026, month: 7, currency: { id: "c1", code: "SGD", symbol: "$" }, projects: [] });
    });
  });
});
