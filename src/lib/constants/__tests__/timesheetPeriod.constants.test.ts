import {
  canManageTimesheetPeriods,
  TIMESHEET_PERIOD_MANAGER_ROLES,
} from "@/lib/constants/timesheetPeriod.constants";

describe("timesheetPeriod.constants", () => {
  describe("canManageTimesheetPeriods", () => {
    it("allows SystemAdmin", () => {
      expect(canManageTimesheetPeriods("SystemAdmin")).toBe(true);
    });

    it("allows ProjectAdmin", () => {
      expect(canManageTimesheetPeriods("ProjectAdmin")).toBe(true);
    });

    it("disallows a regular User", () => {
      expect(canManageTimesheetPeriods("User")).toBe(false);
    });

    it("disallows a Guest", () => {
      expect(canManageTimesheetPeriods("Guest")).toBe(false);
    });

    it("disallows null/undefined roles", () => {
      expect(canManageTimesheetPeriods(null)).toBe(false);
      expect(canManageTimesheetPeriods(undefined)).toBe(false);
    });
  });

  it("exposes exactly SystemAdmin and ProjectAdmin as manager roles", () => {
    expect(TIMESHEET_PERIOD_MANAGER_ROLES).toEqual(["SystemAdmin", "ProjectAdmin"]);
  });
});
