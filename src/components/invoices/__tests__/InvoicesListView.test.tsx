import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvoicesListView } from "@/components/invoices/InvoicesListView";
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

const PROJECT_ALPHA = { id: "p1", code: "PRJ-ALPHA", name: "Project Alpha" };

const INVOICE_DRAFT = {
  id: "inv-1",
  invoiceNumber: "INV-0001",
  project: PROJECT_ALPHA,
  clientName: "Acme Corp",
  billingPeriodStart: "2025-01-01",
  billingPeriodEnd: "2025-01-31",
  currency: { code: "SGD", symbol: "S$" },
  totalAmount: 1000,
  status: "Draft",
  issuedDate: null,
  dueDate: "2025-02-15",
};

const INVOICE_SENT = {
  id: "inv-2",
  invoiceNumber: "INV-0002",
  project: PROJECT_ALPHA,
  clientName: "TechStart Inc",
  billingPeriodStart: "2025-02-01",
  billingPeriodEnd: "2025-02-28",
  currency: { code: "SGD", symbol: "S$" },
  totalAmount: 2500.5,
  status: "Sent",
  issuedDate: "2025-03-01",
  dueDate: "2025-03-15",
};

function mockGetResponses({
  invoices = [INVOICE_DRAFT, INVOICE_SENT],
  totalCount = invoices.length,
}: { invoices?: unknown[]; totalCount?: number } = {}) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/projects" || url === "/projects/my") return Promise.resolve({ data: { data: [PROJECT_ALPHA] } });
    if (url === "/invoices") {
      return Promise.resolve({
        data: { data: { items: invoices, totalCount, page: 1, pageSize: 20 } },
      });
    }
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });
}

describe("InvoicesListView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { id: "pa1", email: "pa@hrsystem.com", role: "ProjectAdmin" } });
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<InvoicesListView />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading invoices/i);
  });

  it("renders the invoice table once loaded, including status badges and formatted amounts", async () => {
    mockGetResponses();
    renderWithClient(<InvoicesListView />);

    expect(await screen.findByText("INV-0001")).toBeInTheDocument();
    expect(screen.getByText("INV-0002")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("S$ 1,000.00")).toBeInTheDocument();
    expect(screen.getByText("S$ 2,500.50")).toBeInTheDocument();
  });

  it("shows an empty state when there are no invoices at all", async () => {
    mockGetResponses({ invoices: [], totalCount: 0 });
    renderWithClient(<InvoicesListView />);

    expect(await screen.findByText(/no invoices yet/i)).toBeInTheDocument();
  });

  it("shows a filtered-empty message when filters exclude all rows", async () => {
    mockGetResponses({ invoices: [], totalCount: 5 });
    renderWithClient(<InvoicesListView />);

    expect(await screen.findByText(/no invoices match the selected filters/i)).toBeInTheDocument();
  });

  it("shows an error state with a retry action when loading fails", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/projects" || url === "/projects/my") return Promise.resolve({ data: { data: [PROJECT_ALPHA] } });
      if (url === "/invoices") {
        return Promise.reject({
          isAxiosError: true,
          response: { data: { message: "Unable to load invoices." } },
        });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    renderWithClient(<InvoicesListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load invoices/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders a status count chip list and a link to generate a new invoice", async () => {
    mockGetResponses();
    renderWithClient(<InvoicesListView />);

    await screen.findByText("INV-0001");
    const chipList = screen.getByRole("list", { name: /invoice counts by status/i });
    const chips = within(chipList)
      .getAllByRole("listitem")
      .map((item) => item.textContent?.replace(/\s+/g, " ").trim());
    expect(chips).toContain("Draft · 1");
    expect(screen.getByRole("link", { name: /generate invoice/i })).toHaveAttribute(
      "href",
      "/invoices/generate"
    );
  });

  it("provides a View link and a PDF download link per row", async () => {
    mockGetResponses();
    renderWithClient(<InvoicesListView />);

    await screen.findByText("INV-0001");
    const rows = screen.getAllByRole("row");
    const draftRow = rows.find((row) => within(row).queryByText("INV-0001"));
    expect(draftRow).toBeDefined();
    expect(within(draftRow as HTMLElement).getByRole("link", { name: /view/i })).toHaveAttribute(
      "href",
      "/invoices/inv-1"
    );
    expect(within(draftRow as HTMLElement).getByRole("link", { name: /pdf/i })).toHaveAttribute(
      "href",
      "/api/invoices/inv-1/pdf"
    );
  });

  it("validates that Date From is not after Date To before applying filters", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<InvoicesListView />);

    await screen.findByText("INV-0001");
    await user.type(screen.getByLabelText(/date from/i), "2025-05-01");
    await user.type(screen.getByLabelText(/date to/i), "2025-01-01");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(await screen.findByText(/date from must be on or before date to/i)).toBeInTheDocument();
  });

  it("re-fetches invoices scoped to the selected status filter", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<InvoicesListView />);

    await screen.findByText("INV-0001");
    (apiClient.get as jest.Mock).mockClear();
    mockGetResponses({ invoices: [INVOICE_DRAFT], totalCount: 1 });

    await user.selectOptions(screen.getByLabelText(/^status$/i), "Draft");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/invoices",
        expect.objectContaining({ params: expect.objectContaining({ status: "Draft" }) })
      )
    );
  });

  it("resets the filters back to defaults", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<InvoicesListView />);

    await screen.findByText("INV-0001");
    await user.type(screen.getByLabelText(/date from/i), "2025-05-01");
    await user.click(screen.getByRole("button", { name: /^reset$/i }));

    expect(screen.getByLabelText(/date from/i)).toHaveValue("");
  });

  // `bugs/paginations`: "add pagination UI to all tables where pagination is
  // currently missing... Invoice" — the invoice table's rows are paginated
  // server-side, but the Previous/Next/page-number controls render through
  // the same shared, `react-paginate`-backed `components/ui/TablePagination.tsx`
  // every other list view in this app uses.
  it("shows pagination controls and requests the next page when there are more invoices than fit on one page", async () => {
    mockGetResponses({ totalCount: 25 });
    const user = userEvent.setup();
    renderWithClient(<InvoicesListView />);

    await screen.findByText("INV-0001");
    expect(screen.getByRole("navigation", { name: /invoices pagination/i })).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/invoices",
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })
      )
    );
  });

  it("loads the Project filter's options from /projects/my for a ProjectAdmin", async () => {
    mockGetResponses();
    renderWithClient(<InvoicesListView />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/projects/my"));
    expect(apiClient.get).not.toHaveBeenCalledWith("/projects");
  });

  it("loads the Project filter's options from the org-wide /projects for a SystemAdmin", async () => {
    useAuthStore.setState({ user: { id: "admin1", email: "admin@hrsystem.com", role: "SystemAdmin" } });
    mockGetResponses();
    renderWithClient(<InvoicesListView />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/projects"));
    expect(apiClient.get).not.toHaveBeenCalledWith("/projects/my");
  });

  it("lets the user pick a specific project, then switch back to 'All Projects'", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<InvoicesListView />);

    await screen.findByRole("option", { name: "Project Alpha" });
    const projectSelect = screen.getByLabelText("Project");
    await user.selectOptions(projectSelect, "Project Alpha");
    expect(projectSelect).toHaveValue(PROJECT_ALPHA.id);

    await user.selectOptions(projectSelect, "All Projects");
    expect(projectSelect).toHaveValue("");
  });

  it("lets the user pick a specific status, then switch back to 'All Statuses'", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<InvoicesListView />);

    const statusSelect = screen.getByLabelText("Status");
    await user.selectOptions(statusSelect, "Draft");
    expect(statusSelect).toHaveValue("Draft");

    await user.selectOptions(statusSelect, "All Statuses");
    expect(statusSelect).toHaveValue("");
  });
});
