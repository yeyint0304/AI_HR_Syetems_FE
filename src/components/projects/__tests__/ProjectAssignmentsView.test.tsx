import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectAssignmentsView } from "@/components/projects/ProjectAssignmentsView";
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

const PROJECT = {
  id: "1",
  code: "PRJ-BETA",
  name: "Project Beta - Mobile App",
  clientName: "TechStart Inc",
  clientEmail: "client@techstart.com",
  startDate: "2025-03-01",
  endDate: "2025-09-30",
  maxDailyHours: 8,
  isActive: true,
};

const ROLE_TYPE_ID_SENIOR = "3fa85f64-5717-4562-b3fc-2c963f66af01";
const ROLE_TYPE_ID_JUNIOR = "3fa85f64-5717-4562-b3fc-2c963f66af02";

const ASSIGNMENT = {
  id: "a1",
  userId: "u1",
  userName: "Alex Kumar",
  userEmail: "alex@hrsystem.com",
  resourceRoleTypeId: ROLE_TYPE_ID_SENIOR,
  resourceRoleTypeName: "Senior Developer",
};

const ROLE_TYPES = [
  { id: ROLE_TYPE_ID_SENIOR, name: "Senior Developer" },
  { id: ROLE_TYPE_ID_JUNIOR, name: "Junior Developer" },
];

const UNASSIGNED_USER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const UNASSIGNED_USERS = [
  {
    id: UNASSIGNED_USER_ID,
    username: "jsmith",
    email: "jsmith@hrsystem.com",
    firstName: "Jamie",
    lastName: "Smith",
  },
];

function unassignedUsersPage(items: unknown[]) {
  return { items, page: 1, pageSize: 20, totalCount: items.length, hasMore: false };
}

function mockGetResponses(unassignedUsers: unknown[] = UNASSIGNED_USERS) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/projects/1") return Promise.resolve({ data: { data: PROJECT } });
    if (url === "/projects/1/assignments") return Promise.resolve({ data: { data: [ASSIGNMENT] } });
    if (url === "/resource-role-types") return Promise.resolve({ data: { data: ROLE_TYPES } });
    if (url === "/auth/unassigned-users") {
      return Promise.resolve({ data: { data: unassignedUsersPage(unassignedUsers) } });
    }
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });
}

function getUserCombobox() {
  return screen.getByRole("combobox", { name: /^user$/i });
}

/** Opens the "User" combobox and returns its listbox. */
async function openUserCombobox(user: ReturnType<typeof userEvent.setup>) {
  await user.click(getUserCombobox());
  return screen.getByRole("listbox", { name: /^user$/i });
}

describe("ProjectAssignmentsView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the assigned users list once loaded", async () => {
    mockGetResponses();
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    expect(await screen.findByText("Alex Kumar")).toBeInTheDocument();
    const assignedUsersSection = screen.getByRole("region", { name: /assigned users/i });
    expect(within(assignedUsersSection).getByText("Senior Developer")).toBeInTheDocument();
    expect(await screen.findByText("Project Beta - Mobile App")).toBeInTheDocument();
  });

  it("shows an empty state when no users are assigned", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/projects/1") return Promise.resolve({ data: { data: PROJECT } });
      if (url === "/projects/1/assignments") return Promise.resolve({ data: { data: [] } });
      if (url === "/resource-role-types") return Promise.resolve({ data: { data: ROLE_TYPES } });
      if (url === "/auth/unassigned-users") {
        return Promise.resolve({ data: { data: unassignedUsersPage(UNASSIGNED_USERS) } });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    expect(await screen.findByText(/no users are currently assigned/i)).toBeInTheDocument();
  });

  it("populates the User combobox from the unassigned-users endpoint and assigns a user via the Add User form", async () => {
    mockGetResponses();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { data: { id: "a2", userId: UNASSIGNED_USER_ID, resourceRoleTypeId: ROLE_TYPE_ID_JUNIOR } },
    });
    const user = userEvent.setup();
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    await screen.findByText("Alex Kumar");
    const listbox = await openUserCombobox(user);
    await user.click(within(listbox).getByRole("option", { name: /jamie smith/i }));

    await user.selectOptions(screen.getByLabelText(/resource role/i), ROLE_TYPE_ID_JUNIOR);
    await user.click(screen.getByRole("button", { name: /add user/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/projects/1/assignments", {
        userId: UNASSIGNED_USER_ID,
        resourceRoleTypeId: ROLE_TYPE_ID_JUNIOR,
      })
    );
  });

  it("filters the User combobox as the caller types (debounced)", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    await screen.findByText("Alex Kumar");
    await openUserCombobox(user);
    await user.type(getUserCombobox(), "jamie");

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/auth/unassigned-users",
        expect.objectContaining({ params: expect.objectContaining({ search: "jamie" }) })
      )
    );
  });

  it("refetches the unassigned-users list after a successful assignment, so the newly-assigned user drops out of the dropdown", async () => {
    mockGetResponses();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { data: { id: "a2", userId: UNASSIGNED_USER_ID, resourceRoleTypeId: ROLE_TYPE_ID_JUNIOR } },
    });
    const user = userEvent.setup();
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    await screen.findByText("Alex Kumar");
    const listbox = await openUserCombobox(user);
    await user.click(within(listbox).getByRole("option", { name: /jamie smith/i }));
    const unassignedUsersCallsBefore = (apiClient.get as jest.Mock).mock.calls.filter(
      ([url]) => url === "/auth/unassigned-users"
    ).length;

    await user.selectOptions(screen.getByLabelText(/resource role/i), ROLE_TYPE_ID_JUNIOR);
    await user.click(screen.getByRole("button", { name: /add user/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    await waitFor(() => {
      const unassignedUsersCallsAfter = (apiClient.get as jest.Mock).mock.calls.filter(
        ([url]) => url === "/auth/unassigned-users"
      ).length;
      expect(unassignedUsersCallsAfter).toBeGreaterThan(unassignedUsersCallsBefore);
    });
  });

  it("shows a validation error when no user is selected", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    await screen.findByText("Alex Kumar");
    await openUserCombobox(user);
    await user.selectOptions(screen.getByLabelText(/resource role/i), ROLE_TYPE_ID_JUNIOR);
    await user.click(screen.getByRole("button", { name: /add user/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/select a user/i);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("shows an empty state and disables the form when there are no unassigned users", async () => {
    mockGetResponses([]);
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    await screen.findByText("Alex Kumar");
    expect(
      await screen.findByText(/no unassigned users available right now/i)
    ).toBeInTheDocument();
    expect(getUserCombobox()).toBeDisabled();
    expect(screen.getByRole("button", { name: /add user/i })).toBeDisabled();
  });

  it("shows a load error with a retry action inside the User combobox when the unassigned-users request fails, without disabling the form", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/projects/1") return Promise.resolve({ data: { data: PROJECT } });
      if (url === "/projects/1/assignments") return Promise.resolve({ data: { data: [ASSIGNMENT] } });
      if (url === "/resource-role-types") return Promise.resolve({ data: { data: ROLE_TYPES } });
      if (url === "/auth/unassigned-users") {
        return Promise.reject({
          isAxiosError: true,
          response: { status: 500, data: { message: "Server error" } },
        });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    const user = userEvent.setup();
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    await screen.findByText("Alex Kumar");
    const combobox = getUserCombobox();
    expect(combobox).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /add user/i })).not.toBeDisabled();
    expect(screen.queryByText(/no unassigned users available right now/i)).not.toBeInTheDocument();

    const listbox = await openUserCombobox(user);
    expect(await within(listbox).findByRole("alert")).toHaveTextContent(/server error/i);

    const unassignedUsersCallsBefore = (apiClient.get as jest.Mock).mock.calls.filter(
      ([url]) => url === "/auth/unassigned-users"
    ).length;
    await user.click(within(listbox).getByRole("button", { name: /try again/i }));

    await waitFor(() => {
      const unassignedUsersCallsAfter = (apiClient.get as jest.Mock).mock.calls.filter(
        ([url]) => url === "/auth/unassigned-users"
      ).length;
      expect(unassignedUsersCallsAfter).toBeGreaterThan(unassignedUsersCallsBefore);
    });
  });

  it("removes an assignment after confirming in the dialog", async () => {
    mockGetResponses();
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    await screen.findByText("Alex Kumar");
    await user.click(screen.getByRole("button", { name: /remove/i }));

    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^remove$/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith("/projects/1/assignments/a1"));
  });
});
