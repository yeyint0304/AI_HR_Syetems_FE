import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvoiceEditForm } from "@/components/invoices/InvoiceEditForm";
import { apiClient } from "@/lib/api/axiosInstance";
import type { InvoiceDetail } from "@/types/invoice.types";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const CURRENCY_SGD = { id: "c1", code: "SGD", name: "Singapore Dollar", symbol: "S$", isBaseCurrency: true, isActive: true };
const CURRENCY_USD = { id: "c2", code: "USD", name: "US Dollar", symbol: "$", isBaseCurrency: false, isActive: true };

const DRAFT_INVOICE: InvoiceDetail = {
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
  lineItems: [],
};

function mockGetCurrencies() {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/currencies") return Promise.resolve({ data: { data: [CURRENCY_SGD, CURRENCY_USD] } });
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });
}

describe("InvoiceEditForm", () => {
  const onCancel = jest.fn();
  const onSaved = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("pre-fills the form with the invoice's current values", async () => {
    mockGetCurrencies();
    renderWithClient(<InvoiceEditForm invoice={DRAFT_INVOICE} onCancel={onCancel} onSaved={onSaved} />);

    expect(screen.getByLabelText(/client name/i)).toHaveValue("Acme Corp");
    expect(screen.getByLabelText(/client email/i)).toHaveValue("billing@acme.com");
    expect(screen.getByLabelText(/issued date/i)).toHaveValue("2025-02-01");
    expect(screen.getByLabelText(/due date/i)).toHaveValue("2025-02-15");
    expect(screen.getByLabelText(/notes/i)).toHaveValue("Thanks for your business.");
    await waitFor(() => expect(screen.getByLabelText(/invoice currency/i)).toHaveValue("c1"));
  });

  it("rejects an invalid client email on submit", async () => {
    mockGetCurrencies();
    const user = userEvent.setup();
    renderWithClient(<InvoiceEditForm invoice={DRAFT_INVOICE} onCancel={onCancel} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText(/client email/i));
    await user.type(screen.getByLabelText(/client email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/enter a valid client email address/i)).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("submits only the updated fields via PUT and calls onSaved", async () => {
    mockGetCurrencies();
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "inv-1" } } });
    const user = userEvent.setup();
    renderWithClient(<InvoiceEditForm invoice={DRAFT_INVOICE} onCancel={onCancel} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText(/client name/i));
    await user.type(screen.getByLabelText(/client name/i), "Acme Corp Pte Ltd");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(
        "/invoices/inv-1",
        expect.objectContaining({ clientName: "Acme Corp Pte Ltd" })
      )
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("shows the backend error message when the update fails", async () => {
    mockGetCurrencies();
    (apiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Only Draft invoices can be updated." } },
    });
    const user = userEvent.setup();
    renderWithClient(<InvoiceEditForm invoice={DRAFT_INVOICE} onCancel={onCancel} onSaved={onSaved} />);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/only draft invoices can be updated/i);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("calls onCancel when Cancel is clicked, without calling the API", async () => {
    mockGetCurrencies();
    const user = userEvent.setup();
    renderWithClient(<InvoiceEditForm invoice={DRAFT_INVOICE} onCancel={onCancel} onSaved={onSaved} />);

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(onCancel).toHaveBeenCalled();
    expect(apiClient.put).not.toHaveBeenCalled();
  });
});
