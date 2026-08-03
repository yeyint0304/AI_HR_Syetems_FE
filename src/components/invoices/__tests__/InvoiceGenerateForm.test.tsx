import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvoiceGenerateForm } from "@/components/invoices/InvoiceGenerateForm";
import { apiClient } from "@/lib/api/axiosInstance";
import { useAuthStore } from "@/stores/auth.store";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockPush = jest.fn();
const mockRefresh = jest.fn();
let mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => mockSearchParams,
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const PROJECT_ALPHA = { id: "p1", code: "PRJ-ALPHA", name: "Project Alpha" };
const CURRENCY_SGD = { id: "c1", code: "SGD", name: "Singapore Dollar", symbol: "S$", isBaseCurrency: true, isActive: true };
const CURRENCY_USD = { id: "c2", code: "USD", name: "US Dollar", symbol: "$", isBaseCurrency: false, isActive: true };
const CURRENCY_MMK_INACTIVE = {
  id: "c3",
  code: "MMK",
  name: "Myanmar Kyats",
  symbol: "K",
  isBaseCurrency: false,
  isActive: false,
};

function mockGetResponses(
  approvedEntries: unknown[] = [],
  currencies: unknown[] = [CURRENCY_SGD, CURRENCY_USD]
) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/projects" || url === "/projects/my") return Promise.resolve({ data: { data: [PROJECT_ALPHA] } });
    if (url === "/currencies") return Promise.resolve({ data: { data: currencies } });
    if (url === "/timesheet-entries") return Promise.resolve({ data: { data: approvedEntries } });
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("option", { name: "Project Alpha" });
  await user.selectOptions(screen.getByLabelText(/^project$/i), "p1");
  fireEvent.change(screen.getByLabelText(/billing period from/i), { target: { value: "2025-01-01" } });
  fireEvent.change(screen.getByLabelText(/billing period to/i), { target: { value: "2025-01-31" } });
  await user.type(screen.getByLabelText(/client name/i), "Acme Corp");
}

describe("InvoiceGenerateForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    useAuthStore.setState({ user: { id: "pa1", email: "pa@hrsystem.com", role: "ProjectAdmin" } });
  });

  it("renders all fields and pre-selects the base currency once loaded", async () => {
    mockGetResponses();
    renderWithClient(<InvoiceGenerateForm />);

    expect(screen.getByLabelText(/^project$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/billing period from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/billing period to/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/invoice currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/client name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/client email/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByLabelText(/invoice currency/i)).toHaveValue("c1"));
  });

  it("excludes inactive/retired currencies from the Invoice Currency dropdown", async () => {
    // Regression guard: `GET /api/currencies` no longer filters `isActive`
    // server-side (it now also backs the Administration > Currencies CRUD
    // screen, which must show inactive currencies too), so any retired
    // currency returned by the shared endpoint must not be offered here as
    // an option for a *new* invoice.
    mockGetResponses([], [CURRENCY_SGD, CURRENCY_USD, CURRENCY_MMK_INACTIVE]);
    renderWithClient(<InvoiceGenerateForm />);

    await screen.findByRole("option", { name: /US Dollar/i });

    expect(
      screen.queryByRole("option", { name: /Myanmar Kyats/i })
    ).not.toBeInTheDocument();
  });

  it("shows client-side validation errors when submitted empty", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<InvoiceGenerateForm />);

    await user.click(screen.getByRole("button", { name: /generate invoice/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.map((el) => el.textContent)).toContain("Select a project.");
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("rejects a billing period end before the start", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<InvoiceGenerateForm />);

    await fillRequiredFields(user);
    fireEvent.change(screen.getByLabelText(/billing period to/i), { target: { value: "2024-12-01" } });
    await user.click(screen.getByRole("button", { name: /generate invoice/i }));

    expect(
      await screen.findByText(/billing period end must be on or after the billing period start/i)
    ).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("rejects an invalid client email", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<InvoiceGenerateForm />);

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/client email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /generate invoice/i }));

    expect(await screen.findByText(/enter a valid client email address/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("submits the generate payload and redirects to the new invoice's detail page", async () => {
    mockGetResponses();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { data: { id: "inv-1", invoiceNumber: "INV-0001" } },
    });
    const user = userEvent.setup();
    renderWithClient(<InvoiceGenerateForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /generate invoice/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/invoices",
        expect.objectContaining({
          projectId: "p1",
          billingPeriodStart: "2025-01-01",
          billingPeriodEnd: "2025-01-31",
          clientName: "Acme Corp",
        })
      )
    );
    expect(mockPush).toHaveBeenCalledWith("/invoices/inv-1");
  });

  it("omits empty optional fields (sends undefined, not empty strings)", async () => {
    mockGetResponses();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { data: { id: "inv-1", invoiceNumber: "INV-0001" } },
    });
    const user = userEvent.setup();
    renderWithClient(<InvoiceGenerateForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /generate invoice/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [, payload] = (apiClient.post as jest.Mock).mock.calls[0];
    expect(payload.clientEmail).toBeUndefined();
    expect(payload.issuedDate).toBeUndefined();
    expect(payload.dueDate).toBeUndefined();
    expect(payload.notes).toBeUndefined();
  });

  it("shows the backend error message when generation fails", async () => {
    mockGetResponses();
    (apiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "The project has no approved timesheet entries for this period." } },
    });
    const user = userEvent.setup();
    renderWithClient(<InvoiceGenerateForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /generate invoice/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no approved timesheet entries/i);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates back to /invoices when Cancel is clicked", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<InvoiceGenerateForm />);

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(mockPush).toHaveBeenCalledWith("/invoices");
  });

  // `bugs/timesheet-history`: "fix the create invoice that showing 400 ...
  // No approved timesheet entries found in the specified billing period."
  it("pre-fills Project/Billing Period from the ?projectId=&billingPeriodStart=&billingPeriodEnd= query params", async () => {
    mockSearchParams = new URLSearchParams({
      projectId: "p1",
      billingPeriodStart: "2025-02-01",
      billingPeriodEnd: "2025-02-28",
    });
    mockGetResponses([{ id: "e1", entryDate: "2025-02-15", isApproved: true }]);
    renderWithClient(<InvoiceGenerateForm />);

    await waitFor(() => expect(screen.getByLabelText(/^project$/i)).toHaveValue("p1"));
    expect(screen.getByLabelText(/billing period from/i)).toHaveValue("2025-02-01");
    expect(screen.getByLabelText(/billing period to/i)).toHaveValue("2025-02-28");
  });

  it("warns when the selected project has no approved entries in the chosen billing period", async () => {
    mockGetResponses([]);
    const user = userEvent.setup();
    renderWithClient(<InvoiceGenerateForm />);

    await fillRequiredFields(user);

    expect(
      await screen.findByText(/no approved timesheet entries were found for this project/i)
    ).toBeInTheDocument();
  });

  it("does not warn when an approved entry falls inside the chosen billing period", async () => {
    mockGetResponses([{ id: "e1", entryDate: "2025-01-15", isApproved: true }]);
    const user = userEvent.setup();
    renderWithClient(<InvoiceGenerateForm />);

    await fillRequiredFields(user);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/timesheet-entries", expect.anything()));
    expect(screen.queryByText(/no approved timesheet entries were found for this project/i)).not.toBeInTheDocument();
  });

  it("loads the Project select's options from /projects/my for a ProjectAdmin", async () => {
    mockGetResponses();
    renderWithClient(<InvoiceGenerateForm />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/projects/my"));
    expect(apiClient.get).not.toHaveBeenCalledWith("/projects");
  });

  it("loads the Project select's options from the org-wide /projects for a SystemAdmin", async () => {
    useAuthStore.setState({ user: { id: "admin1", email: "admin@hrsystem.com", role: "SystemAdmin" } });
    mockGetResponses();
    renderWithClient(<InvoiceGenerateForm />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/projects"));
    expect(apiClient.get).not.toHaveBeenCalledWith("/projects/my");
  });
});
