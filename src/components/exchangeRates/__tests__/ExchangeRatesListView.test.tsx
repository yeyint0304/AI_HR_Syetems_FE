import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExchangeRatesListView } from "@/components/exchangeRates/ExchangeRatesListView";
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

// Real GUID-format ids (matching `docs/HR_System_BE.postman_collection.json`'s
// seeded data) — `lib/validators/shared.validators.ts#guidSchema` requires
// the 8-4-4-4-12 hex format, so plain slugs like "sgd-1" would (correctly)
// fail client-side validation.
const SGD_ID = "33333333-3333-3333-3333-333333333301";
const USD_ID = "33333333-3333-3333-3333-333333333302";
const RATE_ID = "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c";

const SGD = {
  id: SGD_ID,
  code: "SGD",
  name: "Singapore Dollar",
  symbol: "S$",
  isBaseCurrency: true,
  isActive: true,
};
const USD = {
  id: USD_ID,
  code: "USD",
  name: "US Dollar",
  symbol: "$",
  isBaseCurrency: false,
  isActive: true,
};
const CURRENCIES = [SGD, USD];

const RATE_SGD_USD = {
  id: RATE_ID,
  fromCurrency: { id: SGD_ID, code: "SGD", symbol: "S$" },
  toCurrency: { id: USD_ID, code: "USD", symbol: "$" },
  rate: 0.74,
  effectiveDate: "2025-01-01",
  isActive: true,
};

interface MockGetOptions {
  currencies?: unknown;
  exchangeRates?: unknown;
  currenciesError?: unknown;
  ratesError?: unknown;
}

function mockApiGet({ currencies, exchangeRates, currenciesError, ratesError }: MockGetOptions = {}) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/currencies") {
      return currenciesError
        ? Promise.reject(currenciesError)
        : Promise.resolve({ data: { data: currencies ?? CURRENCIES } });
    }
    if (url === "/exchange-rates") {
      return ratesError
        ? Promise.reject(ratesError)
        : Promise.resolve({ data: { data: exchangeRates ?? [RATE_SGD_USD] } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("ExchangeRatesListView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<ExchangeRatesListView />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading exchange rates/i);
  });

  it("shows an error state with a retry action when loading fails", async () => {
    mockApiGet({ currenciesError: { isAxiosError: true, response: { data: { message: "Unable to load currencies." } } } });
    renderWithClient(<ExchangeRatesListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load currencies/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows a message when no base currency is configured", async () => {
    mockApiGet({ currencies: [USD] });
    renderWithClient(<ExchangeRatesListView />);

    expect(await screen.findByText(/no base currency is configured/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add rate/i })).not.toBeInTheDocument();
  });

  it("renders the base currency card, other currency cards with the latest rate, and the rates table", async () => {
    mockApiGet();
    renderWithClient(<ExchangeRatesListView />);

    await screen.findByText("Base currency");
    // Appears once on the currency summary card and once in the rates table row.
    expect(screen.getAllByText(/1 SGD = 0\.74 USD/).length).toBe(2);
    expect(screen.getByRole("columnheader", { name: /from/i })).toBeInTheDocument();
    expect(screen.getAllByText("SGD").length).toBeGreaterThan(0);
    expect(screen.getAllByText("USD").length).toBeGreaterThan(0);
  });

  it("shows an empty rates message when there are no exchange rates yet", async () => {
    mockApiGet({ exchangeRates: [] });
    renderWithClient(<ExchangeRatesListView />);

    expect(await screen.findByText(/no exchange rates yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no rate set/i)).toBeInTheDocument();
  });

  it("creates a new exchange rate via the Add Rate modal", async () => {
    mockApiGet();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "rate-2" } } });
    const user = userEvent.setup();
    renderWithClient(<ExchangeRatesListView />);

    await screen.findByText("Base currency");
    await user.click(screen.getByRole("button", { name: /add rate/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Add exchange rate")).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText(/^rate$/i));
    await user.type(within(dialog).getByLabelText(/^rate$/i), "0.75");
    fireEvent.change(within(dialog).getByLabelText(/effective date/i), { target: { value: "2026-01-01" } });
    await user.click(within(dialog).getByRole("button", { name: /add rate/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/exchange-rates",
        expect.objectContaining({
          fromCurrencyId: SGD_ID,
          toCurrencyId: USD_ID,
          rate: 0.75,
          effectiveDate: "2026-01-01",
          isActive: true,
        })
      )
    );
  });

  it("updates an exchange rate via the Edit modal", async () => {
    mockApiGet();
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "rate-1" } } });
    const user = userEvent.setup();
    renderWithClient(<ExchangeRatesListView />);

    await screen.findByText("Base currency");
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Edit exchange rate")).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText(/^rate$/i));
    await user.type(within(dialog).getByLabelText(/^rate$/i), "0.8");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(
        `/exchange-rates/${RATE_ID}`,
        expect.objectContaining({ rate: 0.8, isActive: true })
      )
    );
  });

  it("deletes an exchange rate after confirming in the dialog", async () => {
    mockApiGet();
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<ExchangeRatesListView />);

    await screen.findByText("Base currency");
    await user.click(screen.getByRole("button", { name: /delete/i }));

    const confirmDialog = screen.getByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith(`/exchange-rates/${RATE_ID}`));
  });

  it("shows an inline error and keeps the confirm dialog open when deletion fails", async () => {
    mockApiGet();
    (apiClient.delete as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Unable to delete the exchange rate. Please try again." } },
    });
    const user = userEvent.setup();
    renderWithClient(<ExchangeRatesListView />);

    await screen.findByText("Base currency");
    await user.click(screen.getByRole("button", { name: /delete/i }));

    const confirmDialog = screen.getByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: /^delete$/i }));

    expect(await screen.findByText(/unable to delete the exchange rate/i)).toBeInTheDocument();
    // The dialog stays open so the user can retry or cancel.
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("paginates the rates table client-side when there are more exchange rates than fit on one page", async () => {
    const manyRates = Array.from({ length: 25 }, (_, index) => ({
      id: `rate-${index}`,
      fromCurrency: { id: SGD_ID, code: "SGD", symbol: "S$" },
      toCurrency: { id: USD_ID, code: "USD", symbol: "$" },
      rate: 100 + index,
      effectiveDate: "2025-01-01",
      isActive: true,
    }));
    mockApiGet({ exchangeRates: manyRates });
    const user = userEvent.setup();
    renderWithClient(<ExchangeRatesListView />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText(/1 SGD = 100 USD/)).toBeInTheDocument();
    expect(within(table).queryByText(/1 SGD = 120 USD/)).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /exchange rates pagination/i })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(within(table).getByText(/1 SGD = 120 USD/)).toBeInTheDocument();
    expect(within(table).queryByText(/1 SGD = 100 USD/)).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("does not offer an Add Rate action when there are no other currencies to rate against", async () => {
    mockApiGet({ currencies: [SGD] });
    renderWithClient(<ExchangeRatesListView />);

    expect(await screen.findByText(/no other active currencies are configured/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add rate/i })).not.toBeInTheDocument();
  });
});
