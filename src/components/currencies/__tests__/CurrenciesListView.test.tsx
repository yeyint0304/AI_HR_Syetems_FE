import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CurrenciesListView } from "@/components/currencies/CurrenciesListView";
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

const SGD_ID = "33333333-3333-3333-3333-333333333301";
const USD_ID = "33333333-3333-3333-3333-333333333302";

const SGD = { id: SGD_ID, code: "SGD", name: "Singapore Dollar", symbol: "S$", isBaseCurrency: true, isActive: true };
const USD = { id: USD_ID, code: "USD", name: "US Dollar", symbol: "$", isBaseCurrency: false, isActive: true };

function mockApiGet(currencies: unknown = [SGD, USD], error?: unknown) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/currencies") {
      return error ? Promise.reject(error) : Promise.resolve({ data: { data: currencies } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("CurrenciesListView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<CurrenciesListView />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading currencies/i);
  });

  it("shows an error state with a retry action when loading fails", async () => {
    mockApiGet([], {
      isAxiosError: true,
      response: { data: { message: "Unable to load currencies." } },
    });
    renderWithClient(<CurrenciesListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load currencies/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders the currency table with base currency badge and status, hiding Delete for the base currency", async () => {
    mockApiGet();
    renderWithClient(<CurrenciesListView />);

    await screen.findByText("SGD");
    expect(screen.getAllByText("Base Currency").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);

    const rows = screen.getAllByRole("row");
    const sgdRow = rows.find((row) => within(row).queryByText("SGD"));
    expect(sgdRow).toBeDefined();
    expect(within(sgdRow as HTMLElement).queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();

    const usdRow = rows.find((row) => within(row).queryByText("USD"));
    expect(within(usdRow as HTMLElement).getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("shows an empty message when there are no currencies", async () => {
    mockApiGet([]);
    renderWithClient(<CurrenciesListView />);

    expect(await screen.findByText(/no currencies yet/i)).toBeInTheDocument();
  });

  it("creates a new currency via the Add Currency modal", async () => {
    mockApiGet();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "new-id" } } });
    const user = userEvent.setup();
    renderWithClient(<CurrenciesListView />);

    await screen.findByText("SGD");
    await user.click(screen.getByRole("button", { name: /add currency/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Add currency" })).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/code/i), "eur");
    await user.type(within(dialog).getByLabelText(/^name$/i), "Euro");
    await user.type(within(dialog).getByLabelText(/symbol/i), "€");
    await user.click(within(dialog).getByRole("button", { name: /add currency/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/currencies",
        expect.objectContaining({ code: "EUR", name: "Euro", symbol: "€", isBaseCurrency: false })
      )
    );
  });

  it("updates a currency via the Edit modal", async () => {
    mockApiGet();
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: { id: USD_ID } } });
    const user = userEvent.setup();
    renderWithClient(<CurrenciesListView />);

    await screen.findByText("USD");
    const rows = screen.getAllByRole("row");
    const usdRow = rows.find((row) => within(row).queryByText("USD")) as HTMLElement;
    await user.click(within(usdRow).getByRole("button", { name: /edit/i }));

    const dialog = screen.getByRole("dialog");
    await user.clear(within(dialog).getByLabelText(/symbol/i));
    await user.type(within(dialog).getByLabelText(/symbol/i), "US$");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(
        `/currencies/${USD_ID}`,
        expect.objectContaining({ symbol: "US$", isActive: true })
      )
    );
  });

  it("deletes a non-base currency after confirming in the dialog", async () => {
    mockApiGet();
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<CurrenciesListView />);

    await screen.findByText("USD");
    const rows = screen.getAllByRole("row");
    const usdRow = rows.find((row) => within(row).queryByText("USD")) as HTMLElement;
    await user.click(within(usdRow).getByRole("button", { name: /delete/i }));

    const confirmDialog = screen.getByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith(`/currencies/${USD_ID}`));
  });

  it("paginates the table client-side when there are more currencies than fit on one page", async () => {
    const manyCurrencies = Array.from({ length: 25 }, (_, index) => ({
      id: `currency-${index}`,
      code: `C${String(index).padStart(2, "0")}`,
      name: `Currency ${index}`,
      symbol: "$",
      isBaseCurrency: false,
      isActive: true,
    }));
    mockApiGet(manyCurrencies);
    const user = userEvent.setup();
    renderWithClient(<CurrenciesListView />);

    await screen.findByText("C00");
    expect(screen.queryByText("C20")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /currencies pagination/i })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText("C20")).toBeInTheDocument();
    expect(screen.queryByText("C00")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("shows an inline error and keeps the confirm dialog open when deletion fails", async () => {
    mockApiGet();
    (apiClient.delete as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Unable to delete the currency. Please try again." } },
    });
    const user = userEvent.setup();
    renderWithClient(<CurrenciesListView />);

    await screen.findByText("USD");
    const rows = screen.getAllByRole("row");
    const usdRow = rows.find((row) => within(row).queryByText("USD")) as HTMLElement;
    await user.click(within(usdRow).getByRole("button", { name: /delete/i }));

    const confirmDialog = screen.getByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: /^delete$/i }));

    expect(await screen.findByText(/unable to delete the currency/i)).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
