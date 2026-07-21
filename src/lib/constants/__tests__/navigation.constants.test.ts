import { getBreadcrumbLabel, NAV_SECTIONS } from "@/lib/constants/navigation.constants";

describe("navigation.constants", () => {
  describe("getBreadcrumbLabel", () => {
    it("resolves static routes", () => {
      expect(getBreadcrumbLabel("/home")).toBe("Dashboard");
      expect(getBreadcrumbLabel("/projects")).toBe("Projects");
      expect(getBreadcrumbLabel("/projects/new")).toBe("New project");
      expect(getBreadcrumbLabel("/timesheet-periods")).toBe("Timesheet Periods");
      expect(getBreadcrumbLabel("/timesheet-periods/new")).toBe("New timesheet period");
      expect(getBreadcrumbLabel("/timesheets")).toBe("My Timesheets");
      expect(getBreadcrumbLabel("/timesheets/history")).toBe("Timesheet History");
      expect(getBreadcrumbLabel("/reports")).toBe("Reports");
      expect(getBreadcrumbLabel("/reports/timesheet")).toBe("Timesheet Report");
      expect(getBreadcrumbLabel("/reports/roles-summary")).toBe("User Roles Summary");
      expect(getBreadcrumbLabel("/reports/cost-revenue")).toBe("Cost & Revenue Report");
    });

    it("resolves the dynamic project edit route", () => {
      expect(getBreadcrumbLabel("/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe("Edit project");
    });

    it("resolves the dynamic project assignments route", () => {
      expect(getBreadcrumbLabel("/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6/assignments")).toBe(
        "Project assignments"
      );
    });

    it("falls back to Dashboard for unknown routes", () => {
      expect(getBreadcrumbLabel("/something-unknown")).toBe("Dashboard");
    });
  });

  it("marks the Projects nav item as implemented", () => {
    const timesheetSection = NAV_SECTIONS.find((section) => section.label === "Timesheet");
    const projectsItem = timesheetSection?.items.find((item) => item.href === "/projects");
    expect(projectsItem?.implemented).toBe(true);
  });

  it("marks the Timesheet Periods nav item as implemented", () => {
    const timesheetSection = NAV_SECTIONS.find((section) => section.label === "Timesheet");
    const timesheetPeriodsItem = timesheetSection?.items.find(
      (item) => item.href === "/timesheet-periods"
    );
    expect(timesheetPeriodsItem?.implemented).toBe(true);
  });

  it("marks the My Timesheets nav item as implemented", () => {
    const timesheetSection = NAV_SECTIONS.find((section) => section.label === "Timesheet");
    const myTimesheetsItem = timesheetSection?.items.find((item) => item.href === "/timesheets");
    expect(myTimesheetsItem?.implemented).toBe(true);
  });

  it("marks the Timesheet History nav item as implemented", () => {
    const timesheetSection = NAV_SECTIONS.find((section) => section.label === "Timesheet");
    const historyItem = timesheetSection?.items.find((item) => item.href === "/timesheets/history");
    expect(historyItem?.implemented).toBe(true);
  });

  it("marks the Reports nav item as implemented", () => {
    const reportsSection = NAV_SECTIONS.find((section) => section.label === "Reports");
    const reportsItem = reportsSection?.items.find((item) => item.href === "/reports");
    expect(reportsItem?.implemented).toBe(true);
  });
});
