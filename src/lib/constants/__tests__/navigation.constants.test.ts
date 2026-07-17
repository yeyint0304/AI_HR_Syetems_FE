import { getBreadcrumbLabel, NAV_SECTIONS } from "@/lib/constants/navigation.constants";

describe("navigation.constants", () => {
  describe("getBreadcrumbLabel", () => {
    it("resolves static routes", () => {
      expect(getBreadcrumbLabel("/home")).toBe("Dashboard");
      expect(getBreadcrumbLabel("/projects")).toBe("Projects");
      expect(getBreadcrumbLabel("/projects/new")).toBe("New project");
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
});
