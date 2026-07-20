import { canManageReports, REPORT_HUB_ITEMS, REPORT_MANAGER_ROLES } from "@/lib/constants/report.constants";

describe("report.constants", () => {
  describe("canManageReports", () => {
    it.each(REPORT_MANAGER_ROLES)("returns true for the manager role %s", (role) => {
      expect(canManageReports(role)).toBe(true);
    });

    it("returns false for a plain User", () => {
      expect(canManageReports("User")).toBe(false);
    });

    it("returns false for Guest", () => {
      expect(canManageReports("Guest")).toBe(false);
    });

    it("returns false for null/undefined/empty string", () => {
      expect(canManageReports(null)).toBe(false);
      expect(canManageReports(undefined)).toBe(false);
      expect(canManageReports("")).toBe(false);
    });

    it("returns false for an unrecognized role string", () => {
      expect(canManageReports("NotARealRole")).toBe(false);
    });
  });

  describe("REPORT_HUB_ITEMS", () => {
    it("exposes exactly the three documented report cards", () => {
      expect(REPORT_HUB_ITEMS.map((item) => item.key)).toEqual(["timesheet", "roles-summary", "cost-revenue"]);
    });

    it("only restricts the Roles Summary and Cost & Revenue cards to managers", () => {
      const managerOnlyKeys = REPORT_HUB_ITEMS.filter((item) => item.managerOnly).map((item) => item.key);
      expect(managerOnlyKeys).toEqual(["roles-summary", "cost-revenue"]);
    });

    it("gives every card a distinct, non-empty href", () => {
      const hrefs = REPORT_HUB_ITEMS.map((item) => item.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
      hrefs.forEach((href) => expect(href).toMatch(/^\/reports\//));
    });
  });
});
