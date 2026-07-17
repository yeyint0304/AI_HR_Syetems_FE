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

function mockGetResponses() {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/projects/1") return Promise.resolve({ data: { data: PROJECT } });
    if (url === "/projects/1/assignments") return Promise.resolve({ data: { data: [ASSIGNMENT] } });
    if (url === "/resource-role-types") return Promise.resolve({ data: { data: ROLE_TYPES } });
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });
}

const VALID_USER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

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
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    expect(await screen.findByText(/no users are currently assigned/i)).toBeInTheDocument();
  });

  it("assigns a user via the Add User form", async () => {
    mockGetResponses();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { data: { id: "a2", userId: VALID_USER_ID, resourceRoleTypeId: ROLE_TYPE_ID_JUNIOR } },
    });
    const user = userEvent.setup();
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    await screen.findByText("Alex Kumar");
    await user.type(screen.getByLabelText(/user id/i), VALID_USER_ID);
    await user.selectOptions(screen.getByLabelText(/resource role/i), ROLE_TYPE_ID_JUNIOR);
    await user.click(screen.getByRole("button", { name: /add user/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/projects/1/assignments", {
        userId: VALID_USER_ID,
        resourceRoleTypeId: ROLE_TYPE_ID_JUNIOR,
      })
    );
  });

  it("shows a validation error for an invalid User ID", async () => {
    mockGetResponses();
    const user = userEvent.setup();
    renderWithClient(<ProjectAssignmentsView projectId="1" />);

    await screen.findByText("Alex Kumar");
    await user.type(screen.getByLabelText(/user id/i), "not-a-guid");
    await user.click(screen.getByRole("button", { name: /add user/i }));

    expect(await screen.findByText(/enter a valid user id/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
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
