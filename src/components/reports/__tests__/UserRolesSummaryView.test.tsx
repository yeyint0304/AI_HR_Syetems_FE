import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserRolesSummaryView } from "@/components/reports/UserRolesSummaryView";
import { apiClient } from "@/lib/api/axiosInstance";

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
  summary?: unknown;
}

function mockApi({
  projects = [PROJECT],
  summary = { startDate: "2026-07-01", endDate: "2026-07-20", grandTotalHours: 0, summary: [] },
}: MockOptions = {}) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/projects") return Promise.resolve({ data: { data: projects } });
    if (url === "/reports/roles-summary") return Promise.resolve({ data: { data: summary } });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("UserRolesSummaryView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prompts the user to apply filters before generating the summary", () => {
    mockApi();
    renderWithClient(<UserRolesSummaryView />);

    expect(screen.getByText(/select a date range and click "apply"/i)).toBeInTheDocument();
  });

  it("shows a loading state while the summary is being generated", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/projects") return Promise.resolve({ data: { data: [] } });
      if (url === "/reports/roles-summary") return new Promise(() => {}); // never resolves
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const user = userEvent.setup();
    renderWithClient(<UserRolesSummaryView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/generating user roles summary/i);
  });

  it("renders the summary table and chart once the summary resolves", async () => {
    mockApi({
      summary: {
        startDate: "2026-07-01",
        endDate: "2026-07-20",
        grandTotalHours: 40,
        summary: [{ resourceRoleType: { id: "r1", name: "Developer" }, totalHours: 40, userCount: 2 }],
      },
    });
    const user = userEvent.setup();
    renderWithClient(<UserRolesSummaryView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    await screen.findByRole("table");
    expect(screen.getByRole("cell", { name: "Developer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /hours by role/i })).toBeInTheDocument();
  });

  it("shows an error state with retry when the request fails", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/projects") return Promise.resolve({ data: { data: [] } });
      if (url === "/reports/roles-summary") {
        return Promise.reject({
          isAxiosError: true,
          response: { data: { message: "You do not have permission to view the user roles summary." } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const user = userEvent.setup();
    renderWithClient(<UserRolesSummaryView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/do not have permission/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows an empty state when there is no timesheet data for the range", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<UserRolesSummaryView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(await screen.findByText(/no timesheet data for the selected filters/i)).toBeInTheDocument();
  });

  it("computes Avg Hrs/User and % of Total correctly, and renders the grand total row", async () => {
    mockApi({
      summary: {
        startDate: "2026-07-01",
        endDate: "2026-07-20",
        grandTotalHours: 100,
        summary: [
          { resourceRoleType: { id: "r1", name: "Developer" }, totalHours: 80, userCount: 4 },
          { resourceRoleType: { id: "r2", name: "QA" }, totalHours: 20, userCount: 2 },
        ],
      },
    });
    const user = userEvent.setup();
    renderWithClient(<UserRolesSummaryView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    await screen.findByRole("table");

    expect(screen.getByText("20.0h")).toBeInTheDocument(); // 80 / 4
    expect(screen.getByText("80%")).toBeInTheDocument(); // 80 / 100
    expect(screen.getByText("100h")).toBeInTheDocument(); // grand total
  });

  it("does not divide by zero when a role has no users", async () => {
    mockApi({
      summary: {
        startDate: "2026-07-01",
        endDate: "2026-07-20",
        grandTotalHours: 0,
        summary: [{ resourceRoleType: { id: "r1", name: "Developer" }, totalHours: 0, userCount: 0 }],
      },
    });
    const user = userEvent.setup();
    renderWithClient(<UserRolesSummaryView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));
    await screen.findByRole("table");

    expect(screen.getByText("0.0h")).toBeInTheDocument();
  });

  it("paginates the summary table client-side when there are more roles than fit on one page", async () => {
    mockApi({
      summary: {
        startDate: "2026-07-01",
        endDate: "2026-07-20",
        grandTotalHours: 1000,
        summary: Array.from({ length: 25 }, (_, index) => ({
          resourceRoleType: { id: `role-${index}`, name: `Role ${index}` },
          totalHours: 10,
          userCount: 1,
        })),
      },
    });
    const user = userEvent.setup();
    renderWithClient(<UserRolesSummaryView />);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Role 0")).toBeInTheDocument();
    expect(within(table).queryByText("Role 20")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /user roles summary pagination/i })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(within(table).getByText("Role 20")).toBeInTheDocument();
    expect(within(table).queryByText("Role 0")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("shows Export links only once a summary has been applied", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<UserRolesSummaryView />);

    expect(screen.queryByRole("link", { name: /export xlsx/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(await screen.findByRole("link", { name: /export xlsx/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/reports/roles-summary/export")
    );
  });

  it("shows a validation error and does not call the API for an inverted date range", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<UserRolesSummaryView />);

    const dateFrom = screen.getByLabelText(/date from/i);
    const dateTo = screen.getByLabelText(/date to/i);
    await user.clear(dateFrom);
    await user.type(dateFrom, "2026-08-01");
    await user.clear(dateTo);
    await user.type(dateTo, "2026-07-01");

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(await screen.findByText(/date from must be on or before date to/i)).toBeInTheDocument();
    await waitFor(() => expect(apiClient.get).not.toHaveBeenCalledWith("/reports/roles-summary", expect.anything()));
  });
});
