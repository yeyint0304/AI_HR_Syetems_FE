import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RateCardsListView } from "@/components/rateCards/RateCardsListView";
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

const COUNTRY_ID = "22222222-2222-2222-2222-222222222201";
const ROLE_ID = "44444444-4444-4444-4444-444444444401";
const CURRENCY_ID = "33333333-3333-3333-3333-333333333301";
const RATE_CARD_ID = "18c16be1-9c69-454a-aa7c-5e6bd01df9bd";

const COUNTRY = { id: COUNTRY_ID, code: "SG", name: "Singapore" };
const ROLE = { id: ROLE_ID, name: "Senior Developer" };
const CURRENCY = { id: CURRENCY_ID, code: "SGD", name: "Singapore Dollar", symbol: "S$", isBaseCurrency: true, isActive: true };

const RATE_CARD = {
  id: RATE_CARD_ID,
  country: { id: COUNTRY_ID, code: "SG", name: "Singapore" },
  resourceRoleType: { id: ROLE_ID, name: "Senior Developer" },
  currency: { id: CURRENCY_ID, code: "SGD", symbol: "S$" },
  hourlyRate: 25,
  billingRate: 75,
  effectiveDate: "2025-03-01",
  isActive: true,
};

interface MockGetOptions {
  countries?: unknown;
  resourceRoleTypes?: unknown;
  currencies?: unknown;
  rateCards?: unknown;
  rateCardsError?: unknown;
}

function mockApiGet({
  countries,
  resourceRoleTypes,
  currencies,
  rateCards,
  rateCardsError,
}: MockGetOptions = {}) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/countries") return Promise.resolve({ data: { data: countries ?? [COUNTRY] } });
    if (url === "/resource-role-types") return Promise.resolve({ data: { data: resourceRoleTypes ?? [ROLE] } });
    if (url === "/currencies") return Promise.resolve({ data: { data: currencies ?? [CURRENCY] } });
    if (url === "/rate-cards") {
      return rateCardsError
        ? Promise.reject(rateCardsError)
        : Promise.resolve({ data: { data: rateCards ?? [RATE_CARD] } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("RateCardsListView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<RateCardsListView />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading rate cards/i);
  });

  it("shows an error state with a retry action when loading fails", async () => {
    mockApiGet({
      rateCardsError: { isAxiosError: true, response: { data: { message: "Unable to load rate cards." } } },
    });
    renderWithClient(<RateCardsListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load rate cards/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders the country summary card and the rate cards table", async () => {
    mockApiGet();
    renderWithClient(<RateCardsListView />);

    const table = await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /^singapore sg/i })).toBeInTheDocument();
    expect(screen.getByText("1 role")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /country/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /daily rate/i })).toBeInTheDocument();
    expect(within(table).getByText("Senior Developer")).toBeInTheDocument();
  });

  it("shows an empty rate cards message when there are none yet", async () => {
    mockApiGet({ rateCards: [] });
    renderWithClient(<RateCardsListView />);

    expect(await screen.findByText(/no rate cards yet/i)).toBeInTheDocument();
  });

  it("filters the table when a country summary card is clicked", async () => {
    const OTHER_COUNTRY_ID = "22222222-2222-2222-2222-222222222202";
    const otherRateCard = {
      ...RATE_CARD,
      id: "5c5a0c0c-3663-4add-bdb9-b82bdc4e02cc",
      country: { id: OTHER_COUNTRY_ID, code: "IN", name: "India" },
    };
    mockApiGet({
      countries: [COUNTRY, { id: OTHER_COUNTRY_ID, code: "IN", name: "India" }],
      rateCards: [RATE_CARD, otherRateCard],
    });
    const user = userEvent.setup();
    renderWithClient(<RateCardsListView />);

    await screen.findByRole("table");
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 rate cards

    await user.click(screen.getByRole("button", { name: /^singapore sg/i }));

    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2)); // header + 1 filtered row
  });

  it("paginates the table client-side when there are more rate cards than fit on one page", async () => {
    const manyRateCards = Array.from({ length: 25 }, (_, index) => ({
      ...RATE_CARD,
      id: `rate-card-${index}`,
      resourceRoleType: { id: `role-${index}`, name: `Role ${index}` },
    }));
    mockApiGet({ rateCards: manyRateCards });
    const user = userEvent.setup();
    renderWithClient(<RateCardsListView />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Role 0")).toBeInTheDocument();
    expect(within(table).queryByText("Role 20")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /rate cards pagination/i })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(within(table).getByText("Role 20")).toBeInTheDocument();
    expect(within(table).queryByText("Role 0")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("excludes inactive/retired currencies from the Add Rate Card currency dropdown", async () => {
    // Regression guard: `GET /api/currencies` no longer filters `isActive`
    // server-side (it now also backs the Administration > Currencies CRUD
    // screen, which must show inactive currencies too), so any retired
    // currency returned by the shared endpoint must not be offered here as
    // an option for a new rate card.
    const inactiveCurrency = {
      id: "33333333-3333-3333-3333-333333333399",
      code: "MMK",
      name: "Myanmar Kyats",
      symbol: "K",
      isBaseCurrency: false,
      isActive: false,
    };
    mockApiGet({ currencies: [CURRENCY, inactiveCurrency] });
    const user = userEvent.setup();
    renderWithClient(<RateCardsListView />);

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: /add rate card/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("option", { name: /SGD/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: /Myanmar Kyats/i })).not.toBeInTheDocument();
  });

  it("creates a new rate card via the Add Rate Card modal", async () => {
    mockApiGet();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "new-id" } } });
    const user = userEvent.setup();
    renderWithClient(<RateCardsListView />);

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: /add rate card/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Add rate card" })).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText(/hourly rate/i));
    await user.type(within(dialog).getByLabelText(/hourly rate/i), "30");
    await user.clear(within(dialog).getByLabelText(/billing \(daily\) rate/i));
    await user.type(within(dialog).getByLabelText(/billing \(daily\) rate/i), "90");

    await user.click(within(dialog).getByRole("button", { name: /^add rate card$/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/rate-cards",
        expect.objectContaining({
          countryId: COUNTRY_ID,
          resourceRoleTypeId: ROLE_ID,
          currencyId: CURRENCY_ID,
          hourlyRate: 30,
          billingRate: 90,
          isActive: true,
        })
      )
    );
  });

  it("updates a rate card via the Edit modal", async () => {
    mockApiGet();
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: { id: RATE_CARD_ID } } });
    const user = userEvent.setup();
    renderWithClient(<RateCardsListView />);

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Edit rate card" })).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText(/hourly rate/i));
    await user.type(within(dialog).getByLabelText(/hourly rate/i), "40");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(
        `/rate-cards/${RATE_CARD_ID}`,
        expect.objectContaining({ hourlyRate: 40, isActive: true })
      )
    );
  });

  it("deletes a rate card after confirming in the dialog", async () => {
    mockApiGet();
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<RateCardsListView />);

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: /delete/i }));

    const confirmDialog = screen.getByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith(`/rate-cards/${RATE_CARD_ID}`));
  });

  it("shows an inline error and keeps the confirm dialog open when deletion fails", async () => {
    mockApiGet();
    (apiClient.delete as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Unable to delete the rate card. Please try again." } },
    });
    const user = userEvent.setup();
    renderWithClient(<RateCardsListView />);

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: /delete/i }));

    const confirmDialog = screen.getByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: /^delete$/i }));

    expect(await screen.findByText(/unable to delete the rate card/i)).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("does not offer an Add Rate Card action when there is no reference data configured", async () => {
    mockApiGet({ countries: [] });
    renderWithClient(<RateCardsListView />);

    expect(await screen.findByText(/set up at least one country/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add rate card/i })).not.toBeInTheDocument();
  });

  it("lets the user pick a specific country in the filter, then switch back to 'All Countries'", async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderWithClient(<RateCardsListView />);

    const countrySelect = await screen.findByLabelText(/filter by country/i);
    await user.selectOptions(countrySelect, "Singapore (SG)");
    expect(countrySelect).toHaveValue(COUNTRY_ID);

    await user.selectOptions(countrySelect, "All Countries");
    expect(countrySelect).toHaveValue("");
  });
});
