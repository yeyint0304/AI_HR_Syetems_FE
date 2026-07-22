import {
  canManageAnyTimesheetEntry,
  isProjectScopedTimesheetManager,
  TIMESHEET_ENTRY_MANAGER_ROLES,
} from "@/lib/constants/timesheetEntry.constants";

describe("canManageAnyTimesheetEntry", () => {
  it("allows SystemAdmin", () => {
    expect(canManageAnyTimesheetEntry("SystemAdmin")).toBe(true);
  });

  it("allows ProjectAdmin", () => {
    expect(canManageAnyTimesheetEntry("ProjectAdmin")).toBe(true);
  });

  it("disallows a plain User", () => {
    expect(canManageAnyTimesheetEntry("User")).toBe(false);
  });

  it("disallows Guest, null, and undefined", () => {
    expect(canManageAnyTimesheetEntry("Guest")).toBe(false);
    expect(canManageAnyTimesheetEntry(null)).toBe(false);
    expect(canManageAnyTimesheetEntry(undefined)).toBe(false);
  });

  it("exposes exactly SystemAdmin and ProjectAdmin as manager roles", () => {
    expect(TIMESHEET_ENTRY_MANAGER_ROLES).toEqual(["SystemAdmin", "ProjectAdmin"]);
  });
});

describe("isProjectScopedTimesheetManager", () => {
  it("returns true for ProjectAdmin", () => {
    expect(isProjectScopedTimesheetManager("ProjectAdmin")).toBe(true);
  });

  it("returns false for SystemAdmin (org-wide authority, not project-scoped)", () => {
    expect(isProjectScopedTimesheetManager("SystemAdmin")).toBe(false);
  });

  it("returns false for a plain User, Guest, null, and undefined", () => {
    expect(isProjectScopedTimesheetManager("User")).toBe(false);
    expect(isProjectScopedTimesheetManager("Guest")).toBe(false);
    expect(isProjectScopedTimesheetManager(null)).toBe(false);
    expect(isProjectScopedTimesheetManager(undefined)).toBe(false);
  });
});
