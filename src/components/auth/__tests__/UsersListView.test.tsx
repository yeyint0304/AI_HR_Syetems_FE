import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UsersListView } from "@/components/auth/UsersListView";
import { apiClient } from "@/lib/api/axiosInstance";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), put: jest.fn() },
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
    if (url === "/auth/roles") {
      return Promise.resolve({ data: { data: [{ id: "role-1", name: "ProjectAdmin" }] } });
    }
    if (url === "/countries") {
      return Promise.resolve({ data: { data: [] } });
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

  it("paginates the table client-side once there are more users than fit on one page", async () => {
    const manyUsers = Array.from({ length: 25 }, (_, index) => ({
      ...USERS[0],
      id: `u${index}`,
      username: `user${index}`,
      email: `user${index}@hrsystem.com`,
    }));
    mockUsersResponse(manyUsers, manyUsers.length);
    renderWithClient(<UsersListView />);

    const table = await screen.findByRole("table");
    expect(within(table).getAllByText(/@user/).length).toBeLessThan(manyUsers.length);
    const pagination = screen.getByLabelText(/users pagination/i);
    expect(pagination).toHaveTextContent("Page 1 of 2");
  });

  it("opens a pre-filled Edit modal for the selected row and submits the update", async () => {
    // `countryId` must be a well-formed GUID here (unlike the shorthand "c1"
    // used by the other fixtures in this file) — `EditUserForm` pre-fills it
    // straight into `updateUserSchema`'s `countryId` field, which enforces
    // the same GUID format `guidSchema` requires everywhere else in the app.
    mockUsersResponse([
      { ...USERS[0], countryId: "22222222-2222-2222-2222-222222222201" },
      { ...USERS[1], countryId: "22222222-2222-2222-2222-222222222201" },
    ]);
    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        data: {
          id: "u2",
          username: "testeredited",
          email: "tester@d3-sg.com",
          firstName: "Tester1",
          lastName: "Sample",
          roleName: "ProjectAdmin",
          isActive: true,
        },
      },
    });
    const user = userEvent.setup();
    renderWithClient(<UsersListView />);

    const table = await screen.findByRole("table");
    const row = within(table).getByText("@tester").closest("tr");
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole("button", { name: /edit/i }));

    const usernameInput = await screen.findByLabelText(/^username$/i);
    expect(usernameInput).toHaveValue("tester");

    await user.clear(usernameInput);
    await user.type(usernameInput, "testeredited");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(
        "/auth/users/u2",
        expect.objectContaining({ username: "testeredited" })
      )
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("opens the Reset password modal for the selected row, submits it, and shows a success confirmation", async () => {
    mockUsersResponse();
    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { message: "Password reset successfully." },
    });
    const user = userEvent.setup();
    renderWithClient(<UsersListView />);

    const table = await screen.findByRole("table");
    const row = within(table).getByText("@tester").closest("tr");
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole("button", { name: /reset password/i }));

    const dialog = await screen.findByRole("dialog", { name: /reset password/i });
    expect(within(dialog).getByText("Tester1 Sample")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^new password$/i), "NewPass1!");
    await user.type(screen.getByLabelText(/^confirm new password$/i), "NewPass1!");
    await user.click(within(dialog).getByRole("button", { name: /^reset password$/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/auth/users/u2/reset-password", {
        newPassword: "NewPass1!",
        confirmNewPassword: "NewPass1!",
      })
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByRole("status")).toHaveTextContent(
      /tester's password has been reset successfully/i
    );
  });

  it("closes the Reset password modal via Cancel without submitting", async () => {
    mockUsersResponse();
    const user = userEvent.setup();
    renderWithClient(<UsersListView />);

    const table = await screen.findByRole("table");
    const row = within(table).getByText("@tester").closest("tr");
    await user.click(within(row as HTMLElement).getByRole("button", { name: /reset password/i }));

    await screen.findByRole("dialog", { name: /reset password/i });
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });
});
