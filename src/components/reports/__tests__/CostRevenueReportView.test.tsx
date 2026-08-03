import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CostRevenueReportView } from "@/components/reports/CostRevenueReportView";
import { apiClient } from "@/lib/api/axiosInstance";
import { useAuthStore } from "@/stores/auth.store";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const PROJECT = { id: "p1", code: "PRJ-A", name: "Project Alpha" };

interface MockOptions {
  projects?: unknown[];
  report?: unknown;
}

function mockApi({
  projects = [{ id: "p1", code: "PRJ-A", name: "Project Alpha" }],
  report = { year: 2026, month: 7, projects: [] },
}: MockOptions = {}) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/projects" || url === "/projects/my") return Promise.resolve({ data: { data: projects } });
    if (url === "/reports/cost-revenue") return Promise.resolve({ data: { data: report } });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("CostRevenueReportView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { id: "pa1", email: "pa@hrsystem.com", role: "ProjectAdmin" } });
  });

  it("prompts the user to select a month before generating the report", () => {
    mockApi();
    renderWithClient(<CostRevenueReportView />);

    expect(screen.getByText(/select a month and click "apply"/i)).toBeInTheDocument();
  });

  it("shows a loading state, then KPI cards + breakdown table + chart on Apply", async () => {
    mockApi({
      report: {
        year: 2026,
        month: 7,
        currency: { id: "c1", code: "SGD", symbol: "$" },
        projects: [
          {
            project: PROJECT,
            totalHours: 100,
            totalCost: 5000,
            totalRevenue: 8000,
            margin: 0.375,
            breakdown: [
              { resourceRoleType: "Developer", hours: 100, costRate: 50, billingRate: 80, cost: 5000, revenue: 8000 },
            ],
          },
        ],
      },
    });
    const user = userEvent.setup();
    renderWithClient(<CostRevenueReportView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    await screen.findByRole("table");
    expect(screen.getByText("Total Hours")).toBeInTheDocument();
    expect(screen.getByText("Total Cost")).toBeInTheDocument();
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getAllByText("$ 5,000.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$ 8,000.00").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /cost vs revenue/i })).toBeInTheDocument();
  });

  it("shows a loading state while the report is being generated", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/projects" || url === "/projects/my") return Promise.resolve({ data: { data: [] } });
      if (url === "/reports/cost-revenue") return new Promise(() => {}); // never resolves
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const user = userEvent.setup();
    renderWithClient(<CostRevenueReportView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/generating cost & revenue report/i);
  });

  it("shows an error state with retry on request failure", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/projects" || url === "/projects/my") return Promise.resolve({ data: { data: [] } });
      if (url === "/reports/cost-revenue") {
        return Promise.reject({
          isAxiosError: true,
          response: { data: { message: "You do not have permission to view the cost & revenue report." } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const user = userEvent.setup();
    renderWithClient(<CostRevenueReportView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/do not have permission/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows an empty state when there is no cost/revenue data for the month", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<CostRevenueReportView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(await screen.findByText(/no cost\/revenue data for the selected month/i)).toBeInTheDocument();
  });

  it("renders monetary values without a currency symbol when none is returned", async () => {
    mockApi({
      report: {
        year: 2026,
        month: 7,
        projects: [
          { project: PROJECT, totalHours: 10, totalCost: 100, totalRevenue: 200, margin: 0.5, breakdown: [] },
        ],
      },
    });
    const user = userEvent.setup();
    renderWithClient(<CostRevenueReportView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    await screen.findByRole("table");

    expect(screen.getAllByText("100.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("200.00").length).toBeGreaterThan(0);
  });

  it("paginates the breakdown table client-side when there are more projects than fit on one page", async () => {
    mockApi({
      report: {
        year: 2026,
        month: 7,
        currency: { id: "c1", code: "SGD", symbol: "$" },
        projects: Array.from({ length: 25 }, (_, index) => ({
          project: { id: `p${index}`, code: `P${index}`, name: `Project ${index}` },
          totalHours: 10,
          totalCost: 100,
          totalRevenue: 200,
          margin: 0.5,
          breakdown: [],
        })),
      },
    });
    const user = userEvent.setup();
    renderWithClient(<CostRevenueReportView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    await screen.findByText("P0 Subtotal");
    expect(screen.queryByText("P20 Subtotal")).not.toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /cost and revenue breakdown pagination/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText("P20 Subtotal")).toBeInTheDocument();
    expect(screen.queryByText("P0 Subtotal")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("shows Export links only once a report has been applied", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<CostRevenueReportView />);

    expect(screen.queryByRole("link", { name: /export xlsx/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(await screen.findByRole("link", { name: /export xlsx/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/reports/cost-revenue/export")
    );
  });

  it("sends the year/month parsed from the native month input", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<CostRevenueReportView />);

    const monthInput = screen.getByLabelText(/^month$/i);
    await user.clear(monthInput);
    await user.type(monthInput, "2026-03");

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    await screen.findByText(/no cost\/revenue data for the selected month/i);
    expect(apiClient.get).toHaveBeenCalledWith(
      "/reports/cost-revenue",
      expect.objectContaining({ params: expect.objectContaining({ year: 2026, month: 3 }) })
    );
  });

  it("loads the Project filter's options from /projects/my for a ProjectAdmin before any report is generated", async () => {
    mockApi();
    renderWithClient(<CostRevenueReportView />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/projects/my"));
    expect(apiClient.get).not.toHaveBeenCalledWith("/projects");
  });

  it("loads the Project filter's options from the org-wide /projects for a SystemAdmin", async () => {
    useAuthStore.setState({ user: { id: "admin1", email: "admin@hrsystem.com", role: "SystemAdmin" } });
    mockApi();
    renderWithClient(<CostRevenueReportView />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/projects"));
    expect(apiClient.get).not.toHaveBeenCalledWith("/projects/my");
  });

  it("lets the user pick a specific project, then switch back to 'All Projects'", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<CostRevenueReportView />);

    await screen.findByRole("option", { name: "Project Alpha" });
    const projectSelect = screen.getByLabelText("Project");
    await user.selectOptions(projectSelect, "Project Alpha");
    expect(projectSelect).toHaveValue(PROJECT.id);

    await user.selectOptions(projectSelect, "All Projects");
    expect(projectSelect).toHaveValue("");
  });
});
