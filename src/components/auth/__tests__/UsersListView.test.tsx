import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UsersListView } from "@/components/auth/UsersListView";
import { apiClient } from "@/lib/api/axiosInstance";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const USERS = [
  {
    id: "u1",
    username: "admin",
    email: "admin@hrsystem.com",
    firstName: "System",
    lastName: "Admin",
    roleName: "SystemAdmin",
    countryId: "c1",
    countryCode: "SG",
    countryName: "Singapore",
    isActive: true,
  },
  {
    id: "u2",
    username: "tester",
    email: "tester@d3-sg.com",
    firstName: "Tester1",
    lastName: "Sample",
    roleName: "ProjectAdmin",
    countryId: "c1",
    countryCode: "SG",
    countryName: "Singapore",
    isActive: true,
  },
];

function mockUsersResponse(items: unknown[] = USERS, totalCount = items.length) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/auth/users") {
      return Promise.resolve({
        data: { data: { items, page: 1, pageSize: 100, totalCount, hasMore: false } },
      });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("UsersListView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<UsersListView />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading users/i);
  });

  it("shows an error state with a retry action when loading fails", async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Unable to load users." } },
    });
    renderWithClient(<UsersListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load users/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows an empty state when there are no users", async () => {
    mockUsersResponse([], 0);
    renderWithClient(<UsersListView />);

    expect(await screen.findByText(/no users have been created yet/i)).toBeInTheDocument();
  });

  it("renders the table with role badges, country, and status", async () => {
    mockUsersResponse();
    renderWithClient(<UsersListView />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("System Admin")).toBeInTheDocument();
    expect(within(table).getByText("@admin")).toBeInTheDocument();
    expect(within(table).getByText("admin@hrsystem.com")).toBeInTheDocument();
    expect(within(table).getByText("SystemAdmin")).toBeInTheDocument();
    expect(within(table).getByText("ProjectAdmin")).toBeInTheDocument();
    expect(within(table).getAllByText("Active").length).toBe(2);
    expect(within(table).getAllByText("SG").length).toBeGreaterThan(0);
  });

  it("shows role count chips summarizing the loaded users", async () => {
    mockUsersResponse();
    renderWithClient(<UsersListView />);

    await screen.findByRole("table");
    const roleSummary = screen.getByLabelText(/user counts by role/i);
    expect(roleSummary).toHaveTextContent("SystemAdmin");
    expect(roleSummary).toHaveTextContent("ProjectAdmin");
  });

  it("links the Add User button to the Create User page", async () => {
    mockUsersResponse();
    renderWithClient(<UsersListView />);

    await screen.findByRole("table");
    expect(screen.getByRole("link", { name: /add user/i })).toHaveAttribute("href", "/admin/users/new");
  });

  it("debounces the search box and forwards the search term to the API", async () => {
    mockUsersResponse();
    const user = userEvent.setup();
    renderWithClient(<UsersListView />);

    await screen.findByRole("table");
    await user.type(screen.getByLabelText(/search users/i), "tester");

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/auth/users",
        expect.objectContaining({ params: expect.objectContaining({ search: "tester" }) })
      )
    );
  });
});
