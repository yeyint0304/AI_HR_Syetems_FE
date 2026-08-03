import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import type { AuthUser } from "@/types/auth.types";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { post: jest.fn(), put: jest.fn() },
}));

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
let mockPathname = "/home";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
  usePathname: () => mockPathname,
}));

function renderSidebar(user: AuthUser | null, onNavigate?: () => void) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Sidebar user={user} onNavigate={onNavigate} />
    </QueryClientProvider>
  );
}

const projectAdminUser: AuthUser = {
  id: "1",
  email: "sarah@hrsystem.com",
  firstName: "Sarah",
  lastName: "Chen",
  role: "ProjectAdmin",
};

const systemAdminUser: AuthUser = {
  id: "2",
  email: "admin@hrsystem.com",
  firstName: "System",
  lastName: "Admin",
  role: "SystemAdmin",
};

const employeeUser: AuthUser = {
  id: "3",
  email: "employee@hrsystem.com",
  firstName: "Alex",
  lastName: "Kumar",
  role: "Employee",
};

describe("Sidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/home";
  });

  it("renders the brand header and the Dashboard link", () => {
    renderSidebar(projectAdminUser);

    expect(screen.getByText("HR System")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/home");
  });

  it("marks the active route with aria-current", () => {
    mockPathname = "/home";
    renderSidebar(projectAdminUser);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("aria-current", "page");
  });

  it("renders the implemented Currencies item (SystemAdmin) as a real navigation link", () => {
    renderSidebar(systemAdminUser);

    const currenciesLink = screen.getByRole("link", { name: /^currencies$/i });
    expect(currenciesLink).toHaveAttribute("href", "/admin/currencies");
    expect(screen.queryByRole("button", { name: /currencies/i })).not.toBeInTheDocument();
  });

  it("renders the implemented Countries item (SystemAdmin) as a real navigation link", () => {
    renderSidebar(systemAdminUser);

    const countriesLink = screen.getByRole("link", { name: /^countries$/i });
    expect(countriesLink).toHaveAttribute("href", "/admin/countries");
  });

  it("renders the implemented Resource Role Types item (SystemAdmin) as a real navigation link", () => {
    renderSidebar(systemAdminUser);

    const resourceRoleTypesLink = screen.getByRole("link", { name: /^resource role types$/i });
    expect(resourceRoleTypesLink).toHaveAttribute("href", "/admin/resource-role-types");
  });

  it("renders the implemented Roles item (SystemAdmin) as a real navigation link", () => {
    renderSidebar(systemAdminUser);

    const rolesLink = screen.getByRole("link", { name: /^roles$/i });
    expect(rolesLink).toHaveAttribute("href", "/admin/roles");
  });

  it("renders the implemented Users item (SystemAdmin) as a real navigation link to the User Management list", () => {
    renderSidebar(systemAdminUser);

    const usersLink = screen.getByRole("link", { name: /^users$/i });
    expect(usersLink).toHaveAttribute("href", "/admin/users");
  });

  it("renders the implemented Rate Cards item (SystemAdmin) as a real navigation link", () => {
    renderSidebar(systemAdminUser);

    const rateCardsLink = screen.getByRole("link", { name: /^rate cards$/i });
    expect(rateCardsLink).toHaveAttribute("href", "/admin/rate-cards");
  });

  it("renders the implemented Invoices item as a real navigation link", () => {
    renderSidebar(projectAdminUser);

    const invoicesLink = screen.getByRole("link", { name: /^invoices$/i });
    expect(invoicesLink).toHaveAttribute("href", "/invoices");
  });

  it("renders the implemented Reports item as a real navigation link", () => {
    renderSidebar(projectAdminUser);

    const reportsLink = screen.getByRole("link", { name: /^reports$/i });
    expect(reportsLink).toHaveAttribute("href", "/reports");
  });

  it("renders the implemented Projects item as a real navigation link", () => {
    renderSidebar(projectAdminUser);

    const projectsLink = screen.getByRole("link", { name: /^projects$/i });
    expect(projectsLink).toHaveAttribute("href", "/projects");
  });

  it("renders the implemented My Timesheets item as a real navigation link", () => {
    renderSidebar(projectAdminUser);

    const timesheetsLink = screen.getByRole("link", { name: /^my timesheets$/i });
    expect(timesheetsLink).toHaveAttribute("href", "/timesheets");
  });

  it("renders the implemented Timesheet History item as a real navigation link", () => {
    renderSidebar(projectAdminUser);

    const historyLink = screen.getByRole("link", { name: /^timesheet history$/i });
    expect(historyLink).toHaveAttribute("href", "/timesheets/history");
  });

  it("marks only Timesheet History (not My Timesheets) active on /timesheets/history", () => {
    mockPathname = "/timesheets/history";
    renderSidebar(projectAdminUser);

    expect(screen.getByRole("link", { name: /^timesheet history$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: /^my timesheets$/i })).not.toHaveAttribute("aria-current");
  });

  it("hides the Administration section for a non-SystemAdmin user", () => {
    renderSidebar(projectAdminUser);

    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
  });

  it("shows the Administration section for a SystemAdmin user", () => {
    renderSidebar(systemAdminUser);

    expect(screen.getByText("Administration")).toBeInTheDocument();
  });

  it("renders the signed-in user's full name, role, and a sign-out control", () => {
    renderSidebar(projectAdminUser);

    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("ProjectAdmin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("prefers the full name over the username and email in the footer card", () => {
    renderSidebar({ ...projectAdminUser, username: "sarah.chen" });

    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.queryByText("sarah.chen")).not.toBeInTheDocument();
  });

  it("falls back to the username in the footer card when no name is available", () => {
    renderSidebar({ id: "3", email: "sarah@hrsystem.com", username: "sarah.chen", role: "ProjectAdmin" });

    expect(screen.getByText("sarah.chen")).toBeInTheDocument();
  });

  it("invokes onNavigate when a real nav link is clicked", async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();
    renderSidebar(projectAdminUser, onNavigate);

    await user.click(screen.getByRole("link", { name: /dashboard/i }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  describe("Employee role visibility", () => {
    it("hides the entire Reports section for an Employee", () => {
      renderSidebar(employeeUser);

      expect(screen.queryByText("Reports")).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /^reports$/i })).not.toBeInTheDocument();
    });

    it("hides the entire Billing (Invoices) section for an Employee", () => {
      renderSidebar(employeeUser);

      expect(screen.queryByText("Billing")).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /^invoices$/i })).not.toBeInTheDocument();
    });

    it("hides only the Timesheet Periods item for an Employee, keeping the rest of the Timesheet section", () => {
      renderSidebar(employeeUser);

      expect(screen.queryByRole("link", { name: /^timesheet periods$/i })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: /^projects$/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /^my timesheets$/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /^timesheet history$/i })).toBeInTheDocument();
    });

    it("still shows Reports, Billing, and Timesheet Periods for a ProjectAdmin", () => {
      renderSidebar(projectAdminUser);

      expect(screen.getByRole("link", { name: /^reports$/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /^invoices$/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /^timesheet periods$/i })).toBeInTheDocument();
    });
  });
});
