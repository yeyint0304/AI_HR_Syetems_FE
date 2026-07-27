import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CountriesListView } from "@/components/countries/CountriesListView";
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

const SG_ID = "22222222-2222-2222-2222-222222222201";
const MY_ID = "22222222-2222-2222-2222-222222222203";

const SINGAPORE = { id: SG_ID, code: "SG", name: "Singapore" };
const MALAYSIA = { id: MY_ID, code: "MY", name: "Malaysia" };

const RATE_CARD_FOR_SINGAPORE = {
  id: "rate-card-1",
  country: { id: SG_ID, code: "SG", name: "Singapore" },
  resourceRoleType: { id: "role-1", name: "Senior Developer" },
  currency: { id: "cur-1", code: "SGD", symbol: "S$" },
  hourlyRate: 25,
  billingRate: 700,
  effectiveDate: "2025-01-01",
  isActive: true,
};

interface MockGetOptions {
  countries?: unknown;
  rateCards?: unknown;
  countriesError?: unknown;
}

function mockApiGet({ countries, rateCards, countriesError }: MockGetOptions = {}) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/countries") {
      return countriesError
        ? Promise.reject(countriesError)
        : Promise.resolve({ data: { data: countries ?? [SINGAPORE, MALAYSIA] } });
    }
    if (url === "/rate-cards") {
      return Promise.resolve({ data: { data: rateCards ?? [] } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("CountriesListView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<CountriesListView />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading countries/i);
  });

  it("shows an error state with a retry action when loading fails", async () => {
    mockApiGet({
      countriesError: { isAxiosError: true, response: { data: { message: "Unable to load countries." } } },
    });
    renderWithClient(<CountriesListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load countries/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders the country table with a static Active status and 'No rate cards' when unused", async () => {
    mockApiGet();
    renderWithClient(<CountriesListView />);

    await screen.findByText("Singapore");
    expect(screen.getAllByText("Active").length).toBe(2);
    expect(screen.getAllByText(/no rate cards/i).length).toBe(2);
  });

  it("shows the linked rate card count for a country in use", async () => {
    mockApiGet({ rateCards: [RATE_CARD_FOR_SINGAPORE] });
    renderWithClient(<CountriesListView />);

    expect(await screen.findByText(/1 rate card$/i)).toBeInTheDocument();
  });

  it("creates a new country via the Add Country modal", async () => {
    mockApiGet();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "new-id" } } });
    const user = userEvent.setup();
    renderWithClient(<CountriesListView />);

    await screen.findByText("Singapore");
    await user.click(screen.getByRole("button", { name: /add country/i }));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/code/i), "th");
    await user.type(within(dialog).getByLabelText(/^name$/i), "Thailand");
    await user.click(within(dialog).getByRole("button", { name: /add country/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/countries", { code: "TH", name: "Thailand" })
    );
  });

  it("updates a country via the Edit modal", async () => {
    mockApiGet();
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: { id: SG_ID } } });
    const user = userEvent.setup();
    renderWithClient(<CountriesListView />);

    await screen.findByText("Singapore");
    const rows = screen.getAllByRole("row");
    const sgRow = rows.find((row) => within(row).queryByText("Singapore")) as HTMLElement;
    await user.click(within(sgRow).getByRole("button", { name: /edit/i }));

    const dialog = screen.getByRole("dialog");
    await user.clear(within(dialog).getByLabelText(/^name$/i));
    await user.type(within(dialog).getByLabelText(/^name$/i), "Republic of Singapore");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(`/countries/${SG_ID}`, {
        name: "Republic of Singapore",
      })
    );
  });

  it("deletes a country with no linked rate cards after confirming in the dialog", async () => {
    mockApiGet();
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<CountriesListView />);

    await screen.findByText("Malaysia");
    const rows = screen.getAllByRole("row");
    const myRow = rows.find((row) => within(row).queryByText("Malaysia")) as HTMLElement;
    await user.click(within(myRow).getByRole("button", { name: /delete/i }));

    const confirmDialog = screen.getByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith(`/countries/${MY_ID}`));
  });

  it("blocks deletion with an explanatory single-button dialog when the country has linked rate cards", async () => {
    mockApiGet({ rateCards: [RATE_CARD_FOR_SINGAPORE] });
    const user = userEvent.setup();
    renderWithClient(<CountriesListView />);

    await screen.findByText("Singapore");
    const rows = screen.getAllByRole("row");
    const sgRow = rows.find((row) => within(row).queryByText("Singapore")) as HTMLElement;
    await user.click(within(sgRow).getByRole("button", { name: /delete/i }));

    expect(screen.getByText(/cannot be deleted because it has 1 linked rate card/i)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(apiClient.delete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^ok$/i }));
    expect(
      screen.queryByText(/cannot be deleted because it has 1 linked rate card/i)
    ).not.toBeInTheDocument();
  });
});
