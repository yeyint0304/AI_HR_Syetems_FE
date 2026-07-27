import { getBreadcrumbLabel, getBreadcrumbTrail, NAV_SECTIONS } from "@/lib/constants/navigation.constants";

describe("navigation.constants", () => {
  describe("getBreadcrumbTrail", () => {
    it("returns a single Dashboard crumb, with an href, on the dashboard route", () => {
      expect(getBreadcrumbTrail("/home")).toEqual([{ label: "Dashboard", href: "/home" }]);
    });

    it("includes the parent list page as an intermediate, linked crumb for a nested static route", () => {
      expect(getBreadcrumbTrail("/projects/new")).toEqual([
        { label: "Dashboard", href: "/home" },
        { label: "Projects", href: "/projects" },
        { label: "New project" },
      ]);
    });

    it("builds the full trail for other nested static routes", () => {
      expect(getBreadcrumbTrail("/timesheet-periods/new")).toEqual([
        { label: "Dashboard", href: "/home" },
        { label: "Timesheet Periods", href: "/timesheet-periods" },
        { label: "New timesheet period" },
      ]);
      expect(getBreadcrumbTrail("/invoices/generate")).toEqual([
        { label: "Dashboard", href: "/home" },
        { label: "Invoices", href: "/invoices" },
        { label: "Generate Invoice" },
      ]);
      expect(getBreadcrumbTrail("/profile/change-password")).toEqual([
        { label: "Dashboard", href: "/home" },
        { label: "Profile", href: "/profile" },
        { label: "Change password" },
      ]);
      expect(getBreadcrumbTrail("/admin/users/new")).toEqual([
        { label: "Dashboard", href: "/home" },
        { label: "Users", href: "/admin/users" },
        { label: "Create user" },
      ]);
    });

    it("does not add an intermediate crumb for a top-level route", () => {
      expect(getBreadcrumbTrail("/admin/countries")).toEqual([
        { label: "Dashboard", href: "/home" },
        { label: "Countries" },
      ]);
    });

    it("builds the full trail for the dynamic project edit/assignments routes", () => {
      const projectId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
      expect(getBreadcrumbTrail(`/projects/${projectId}`)).toEqual([
        { label: "Dashboard", href: "/home" },
        { label: "Projects", href: "/projects" },
        { label: "Edit project" },
      ]);
      expect(getBreadcrumbTrail(`/projects/${projectId}/assignments`)).toEqual([
        { label: "Dashboard", href: "/home" },
        { label: "Projects", href: "/projects" },
        { label: "Project assignments" },
      ]);
    });

    it("builds the full trail for the dynamic invoice detail route", () => {
      const invoiceId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
      expect(getBreadcrumbTrail(`/invoices/${invoiceId}`)).toEqual([
        { label: "Dashboard", href: "/home" },
        { label: "Invoices", href: "/invoices" },
        { label: "Invoice detail" },
      ]);
    });

    it("falls back to just Dashboard for unknown routes", () => {
      expect(getBreadcrumbTrail("/something-unknown")).toEqual([{ label: "Dashboard", href: "/home" }]);
    });
  });

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
      expect(getBreadcrumbLabel("/invoices")).toBe("Invoices");
      expect(getBreadcrumbLabel("/invoices/generate")).toBe("Generate Invoice");
      expect(getBreadcrumbLabel("/admin/exchange-rates")).toBe("Exchange Rates");
      expect(getBreadcrumbLabel("/admin/users")).toBe("Users");
      expect(getBreadcrumbLabel("/admin/rate-cards")).toBe("Rate Cards");
      expect(getBreadcrumbLabel("/admin/currencies")).toBe("Currencies");
      expect(getBreadcrumbLabel("/admin/countries")).toBe("Countries");
      expect(getBreadcrumbLabel("/admin/resource-role-types")).toBe("Resource Role Types");
      expect(getBreadcrumbLabel("/admin/roles")).toBe("Roles");
    });

    it("resolves the dynamic project edit route", () => {
      expect(getBreadcrumbLabel("/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe("Edit project");
    });

    it("resolves the dynamic project assignments route", () => {
      expect(getBreadcrumbLabel("/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6/assignments")).toBe(
        "Project assignments"
      );
    });

    it("resolves the dynamic invoice detail route", () => {
      expect(getBreadcrumbLabel("/invoices/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe("Invoice detail");
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

  it("marks the Invoices nav item as implemented, with no section-level role restriction", () => {
    const billingSection = NAV_SECTIONS.find((section) => section.label === "Billing");
    const invoicesItem = billingSection?.items.find((item) => item.href === "/invoices");
    expect(invoicesItem?.implemented).toBe(true);
    expect(billingSection?.requiredRole).toBeUndefined();
  });

  it("marks the Users nav item as implemented, linking to the User Management list, restricted to SystemAdmin", () => {
    const adminSection = NAV_SECTIONS.find((section) => section.label === "Administration");
    const usersItem = adminSection?.items.find((item) => item.label === "Users");
    expect(usersItem?.implemented).toBe(true);
    expect(usersItem?.href).toBe("/admin/users");
    expect(adminSection?.requiredRole).toBe("SystemAdmin");
  });

  it("marks the Exchange Rates nav item as implemented, restricted to SystemAdmin", () => {
    const adminSection = NAV_SECTIONS.find((section) => section.label === "Administration");
    const exchangeRatesItem = adminSection?.items.find((item) => item.label === "Exchange Rates");
    expect(exchangeRatesItem?.implemented).toBe(true);
    expect(exchangeRatesItem?.href).toBe("/admin/exchange-rates");
    expect(adminSection?.requiredRole).toBe("SystemAdmin");
  });

  it("marks the Rate Cards nav item as implemented, restricted to SystemAdmin", () => {
    const adminSection = NAV_SECTIONS.find((section) => section.label === "Administration");
    const rateCardsItem = adminSection?.items.find((item) => item.label === "Rate Cards");
    expect(rateCardsItem?.implemented).toBe(true);
    expect(rateCardsItem?.href).toBe("/admin/rate-cards");
    expect(adminSection?.requiredRole).toBe("SystemAdmin");
  });

  it("marks the Currencies nav item as implemented, restricted to SystemAdmin", () => {
    const adminSection = NAV_SECTIONS.find((section) => section.label === "Administration");
    const currenciesItem = adminSection?.items.find((item) => item.label === "Currencies");
    expect(currenciesItem?.implemented).toBe(true);
    expect(currenciesItem?.href).toBe("/admin/currencies");
    expect(adminSection?.requiredRole).toBe("SystemAdmin");
  });

  it("marks the Countries nav item as implemented, restricted to SystemAdmin", () => {
    const adminSection = NAV_SECTIONS.find((section) => section.label === "Administration");
    const countriesItem = adminSection?.items.find((item) => item.label === "Countries");
    expect(countriesItem?.implemented).toBe(true);
    expect(countriesItem?.href).toBe("/admin/countries");
    expect(adminSection?.requiredRole).toBe("SystemAdmin");
  });

  it("marks the Resource Role Types nav item as implemented, restricted to SystemAdmin", () => {
    const adminSection = NAV_SECTIONS.find((section) => section.label === "Administration");
    const resourceRoleTypesItem = adminSection?.items.find(
      (item) => item.label === "Resource Role Types"
    );
    expect(resourceRoleTypesItem?.implemented).toBe(true);
    expect(resourceRoleTypesItem?.href).toBe("/admin/resource-role-types");
    expect(adminSection?.requiredRole).toBe("SystemAdmin");
  });

  it("marks the Roles nav item as implemented, restricted to SystemAdmin", () => {
    const adminSection = NAV_SECTIONS.find((section) => section.label === "Administration");
    const rolesItem = adminSection?.items.find((item) => item.label === "Roles");
    expect(rolesItem?.implemented).toBe(true);
    expect(rolesItem?.href).toBe("/admin/roles");
    expect(adminSection?.requiredRole).toBe("SystemAdmin");
  });
});
