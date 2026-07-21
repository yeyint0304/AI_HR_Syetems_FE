import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvoiceDetailView } from "@/components/invoices/InvoiceDetailView";
import { apiClient } from "@/lib/api/axiosInstance";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const DRAFT_INVOICE = {
  id: "inv-1",
  invoiceNumber: "INV-0001",
  project: { id: "p1", code: "PRJ-ALPHA", name: "Project Alpha" },
  clientName: "Acme Corp",
  clientEmail: "billing@acme.com",
  billingPeriodStart: "2025-01-01",
  billingPeriodEnd: "2025-01-31",
  currency: { id: "c1", code: "SGD", symbol: "S$" },
  exchangeRate: 1,
  subTotal: 1000,
  taxAmount: 90,
  totalAmount: 1090,
  status: "Draft",
  issuedDate: "2025-02-01",
  dueDate: "2025-02-15",
  notes: "Thanks for your business.",
  lineItems: [
    {
      id: "li-1",
      user: { id: "u1", fullName: "Alex Kumar" },
      resourceRoleType: { id: "r1", name: "Senior Developer" },
      timesheetEntryId: "te-1",
      description: "Development work",
      hours: 40,
      unitRate: 25,
      amount: 1000,
    },
  ],
};

const SENT_INVOICE = { ...DRAFT_INVOICE, status: "Sent" };

function mockGet(invoice: unknown) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/invoices/inv-1") return Promise.resolve({ data: { data: invoice } });
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });
}

/** "INV-0001" appears twice once loaded (page heading + the invoice's own dark header), so wait on the heading specifically. */
function findHeading() {
  return screen.findByRole("heading", { name: "INV-0001" });
}

describe("InvoiceDetailView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<InvoiceDetailView invoiceId="inv-1" />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading invoice/i);
  });

  it("shows an error state with a retry action when loading fails", async () => {
    (apiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Invoice not found." } },
    });
    renderWithClient(<InvoiceDetailView invoiceId="inv-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/invoice not found/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders invoice header, line items, and totals once loaded", async () => {
    mockGet(DRAFT_INVOICE);
    renderWithClient(<InvoiceDetailView invoiceId="inv-1" />);

    await findHeading();
    expect(screen.getByText("Alex Kumar")).toBeInTheDocument();
    expect(screen.getByText("Senior Developer")).toBeInTheDocument();
    expect(screen.getAllByText("S$ 1,000.00").length).toBeGreaterThan(0);
    expect(screen.getByText("S$ 1,090.00")).toBeInTheDocument();
  });

  it("shows Edit/Send/Delete actions for a Draft invoice, and hides Mark as Paid", async () => {
    mockGet(DRAFT_INVOICE);
    renderWithClient(<InvoiceDetailView invoiceId="inv-1" />);

    await findHeading();
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send invoice/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark as paid/i })).not.toBeInTheDocument();
  });

  it("shows Mark as Paid for a Sent invoice, and hides Edit/Delete", async () => {
    mockGet(SENT_INVOICE);
    renderWithClient(<InvoiceDetailView invoiceId="inv-1" />);

    await findHeading();
    expect(screen.getByRole("button", { name: /mark as paid/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it("toggles the inline edit form for a Draft invoice", async () => {
    mockGet(DRAFT_INVOICE);
    const user = userEvent.setup();
    renderWithClient(<InvoiceDetailView invoiceId="inv-1" />);

    await findHeading();
    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("sends the invoice after confirming in the dialog", async () => {
    mockGet(DRAFT_INVOICE);
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "inv-1", status: "Sent" } } });
    const user = userEvent.setup();
    renderWithClient(<InvoiceDetailView invoiceId="inv-1" />);

    await findHeading();
    await user.click(screen.getByRole("button", { name: /send invoice/i }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/send this invoice to the client/i);
    await user.click(within(dialog).getByRole("button", { name: /^send invoice$/i }));

    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith("/invoices/inv-1/send"));
  });

  it("shows an action error when confirming a status transition fails", async () => {
    mockGet(DRAFT_INVOICE);
    (apiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Only Draft invoices can be sent." } },
    });
    const user = userEvent.setup();
    renderWithClient(<InvoiceDetailView invoiceId="inv-1" />);

    await findHeading();
    await user.click(screen.getByRole("button", { name: /send invoice/i }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^send invoice$/i }));

    expect(await screen.findByText(/only draft invoices can be sent/i)).toBeInTheDocument();
  });

  it("deletes the invoice after confirming, then navigates to /invoices", async () => {
    mockGet(DRAFT_INVOICE);
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({});
    const user = userEvent.setup();
    renderWithClient(<InvoiceDetailView invoiceId="inv-1" />);

    await findHeading();
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith("/invoices/inv-1"));
    expect(mockPush).toHaveBeenCalledWith("/invoices");
  });

  it("dismisses the confirm dialog on Cancel without calling the API", async () => {
    mockGet(DRAFT_INVOICE);
    const user = userEvent.setup();
    renderWithClient(<InvoiceDetailView invoiceId="inv-1" />);

    await findHeading();
    await user.click(screen.getByRole("button", { name: /send invoice/i }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("provides a PDF download link pointing at the Route Handler", async () => {
    mockGet(DRAFT_INVOICE);
    renderWithClient(<InvoiceDetailView invoiceId="inv-1" />);

    await findHeading();
    expect(screen.getByRole("link", { name: /download pdf/i })).toHaveAttribute(
      "href",
      "/api/invoices/inv-1/pdf"
    );
  });
});
