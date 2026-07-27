import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RolesListView } from "@/components/roles/RolesListView";
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

const ROLES = [
  {
    id: "11111111-1111-1111-1111-111111111101",
    name: "SystemAdmin",
    description: "Full system access including configuration and user management",
  },
  {
    id: "11111111-1111-1111-1111-111111111102",
    name: "ProjectAdmin",
    description: "Manages projects, assignments, timesheets, reports and invoices",
  },
  {
    id: "11111111-1111-1111-1111-111111111103",
    name: "Employee",
    description: null,
  },
];

function mockApiGet(roles: unknown = ROLES, error?: unknown) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/auth/roles") {
      return error ? Promise.reject(error) : Promise.resolve({ data: { data: roles } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("RolesListView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<RolesListView />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading roles/i);
  });

  it("shows an error state with a retry action when loading fails", async () => {
    mockApiGet([], { isAxiosError: true, response: { data: { message: "Unable to load roles." } } });
    renderWithClient(<RolesListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load roles/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders every role with its description and no add/edit/delete actions", async () => {
    mockApiGet();
    renderWithClient(<RolesListView />);

    await screen.findByText("SystemAdmin");
    expect(screen.getByText("ProjectAdmin")).toBeInTheDocument();
    expect(screen.getByText("Employee")).toBeInTheDocument();
    expect(
      screen.getByText("Full system access including configuration and user management")
    ).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("shows an empty message when there are no roles", async () => {
    mockApiGet([]);
    renderWithClient(<RolesListView />);

    expect(await screen.findByText(/no roles found/i)).toBeInTheDocument();
  });

  it("paginates the table client-side when there are more roles than fit on one page", async () => {
    const manyRoles = Array.from({ length: 25 }, (_, index) => ({
      id: `role-${index}`,
      name: `Role ${index}`,
      description: null,
    }));
    mockApiGet(manyRoles);
    const user = userEvent.setup();
    renderWithClient(<RolesListView />);

    await screen.findByText("Role 0");
    expect(screen.queryByText("Role 20")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /roles pagination/i })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText("Role 20")).toBeInTheDocument();
    expect(screen.queryByText("Role 0")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });
});
