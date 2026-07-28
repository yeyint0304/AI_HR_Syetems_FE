import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimesheetReportView } from "@/components/reports/TimesheetReportView";
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
const OTHER_PROJECT = { id: "p2", code: "PRJ-B", name: "Project Beta" };

const REPORT_ITEM = {
  user: { id: "u1", fullName: "Jane Doe", employeeId: "E001" },
  project: PROJECT,
  entryDate: "2026-07-05",
  hours: 8,
  taskDescription: "Built the reports feature",
  isApproved: true,
};

interface MockOptions {
  projects?: unknown[];
  report?: unknown;
}

function mockApi({
  projects = [PROJECT, OTHER_PROJECT],
  report = { reportGeneratedAt: "2026-07-20T00:00:00Z", startDate: "2026-07-01", endDate: "2026-07-20", totalHours: 0, totalCount: 0, page: 1, pageSize: 100, items: [] },
}: MockOptions = {}) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/projects") return Promise.resolve({ data: { data: projects } });
    if (url === "/reports/timesheet") return Promise.resolve({ data: { data: report } });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("TimesheetReportView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { id: "u1", email: "user@hrsystem.com", role: "User" } });
  });

  it("prompts the user to apply filters before any report has been generated", () => {
    mockApi();
    renderWithClient(<TimesheetReportView />);

    expect(screen.getByText(/select a date range and click "apply filters"/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("does not render the User ID filter for a plain User", () => {
    mockApi();
    renderWithClient(<TimesheetReportView />);

    expect(screen.queryByLabelText(/user id/i)).not.toBeInTheDocument();
  });

  it("renders the User ID filter for a ProjectAdmin", () => {
    useAuthStore.setState({ user: { id: "pa1", email: "pa@hrsystem.com", role: "ProjectAdmin" } });
    mockApi();
    renderWithClient(<TimesheetReportView />);

    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
  });

  it("shows a loading state while the report is being generated", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/projects") return Promise.resolve({ data: { data: [] } });
      if (url === "/reports/timesheet") return new Promise(() => {}); // never resolves
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const user = userEvent.setup();
    renderWithClient(<TimesheetReportView />);

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/generating timesheet report/i);
  });

  it("renders the report table with entry details once the report resolves", async () => {
    mockApi({ report: { startDate: "2026-07-01", endDate: "2026-07-20", totalHours: 8, totalCount: 1, page: 1, pageSize: 100, items: [REPORT_ITEM] } });
    const user = userEvent.setup();
    renderWithClient(<TimesheetReportView />);

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await screen.findByRole("table");
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /project alpha/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Approved" })).toBeInTheDocument();
  });

  it("sends the applied date range to the API", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<TimesheetReportView />);

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/reports/timesheet",
        expect.objectContaining({ params: expect.objectContaining({ startDate: expect.any(String), endDate: expect.any(String) }) })
      )
    );
  });

  it("shows a validation error and does not call the API when Date From is after Date To", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<TimesheetReportView />);

    const dateFrom = screen.getByLabelText(/date from/i);
    const dateTo = screen.getByLabelText(/date to/i);
    await user.clear(dateFrom);
    await user.type(dateFrom, "2026-08-01");
    await user.clear(dateTo);
    await user.type(dateTo, "2026-07-01");

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(await screen.findByText(/date from must be on or before date to/i)).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalledWith("/reports/timesheet", expect.anything());
  });

  it("shows an error state with a retry action when the report request fails", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/projects") return Promise.resolve({ data: { data: [] } });
      if (url === "/reports/timesheet") {
        return Promise.reject({ isAxiosError: true, response: { data: { message: "Unable to generate the timesheet report." } } });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const user = userEvent.setup();
    renderWithClient(<TimesheetReportView />);

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to generate the timesheet report/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows an empty state when no entries match the applied filters", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<TimesheetReportView />);

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(await screen.findByText(/no timesheet entries match the selected filters/i)).toBeInTheDocument();
  });

  it("shows Export XLSX/CSV links only once a report has been applied, pointing at the export route", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<TimesheetReportView />);

    expect(screen.queryByRole("link", { name: /export xlsx/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    const xlsxLink = await screen.findByRole("link", { name: /export xlsx/i });
    expect(xlsxLink).toHaveAttribute("href", expect.stringContaining("/api/reports/timesheet/export"));
    expect(xlsxLink).toHaveAttribute("href", expect.stringContaining("format=xlsx"));
    expect(screen.getByRole("link", { name: /export csv/i })).toHaveAttribute("href", expect.stringContaining("format=csv"));
  });

  it("shows pagination controls and requests the next page", async () => {
    mockApi({
      report: { startDate: "2026-07-01", endDate: "2026-07-20", totalHours: 8, totalCount: 150, page: 1, pageSize: 100, items: [REPORT_ITEM] },
    });
    const user = userEvent.setup();
    renderWithClient(<TimesheetReportView />);

    await user.click(screen.getByRole("button", { name: /apply filters/i }));
    await screen.findByRole("table");

    expect(screen.getByRole("navigation", { name: /timesheet report pagination/i })).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    const nextButton = screen.getByRole("button", { name: /^next$/i });
    // `TablePagination` (`react-paginate`-backed) renders Previous/Next as
    // `<a role="button">` elements carrying `aria-disabled` rather than a
    // native `disabled` attribute — jest-dom's `toBeDisabled()` only
    // recognizes real form controls, so assert against `aria-disabled`.
    expect(screen.getByRole("button", { name: /^previous$/i })).toHaveAttribute("aria-disabled", "true");

    await user.click(nextButton);

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/reports/timesheet",
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })
      )
    );
  });

  it("resets the applied filters and returns to the prompt state", async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithClient(<TimesheetReportView />);

    await user.click(screen.getByRole("button", { name: /apply filters/i }));
    await screen.findByText(/no timesheet entries match the selected filters/i);

    await user.click(screen.getByRole("button", { name: /^reset$/i }));

    expect(screen.getByText(/select a date range and click "apply filters"/i)).toBeInTheDocument();
  });
});
