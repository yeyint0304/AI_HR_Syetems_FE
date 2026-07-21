import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateUserForm } from "@/components/auth/CreateUserForm";
import { apiClient } from "@/lib/api/axiosInstance";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const ROLE_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const ROLES = [
  { id: ROLE_ID, name: "ProjectAdmin" },
  { id: "3fa85f64-5717-4562-b3fc-2c963f66afa7", name: "Employee" },
];

function mockRolesResponse() {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/auth/roles") return Promise.resolve({ data: { data: ROLES } });
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), "New");
  await user.type(screen.getByLabelText(/last name/i), "User");
  await user.type(screen.getByLabelText(/^username$/i), "newuser");
  await user.type(screen.getByLabelText(/email address/i), "newuser@example.com");
  await user.type(screen.getByLabelText(/^temporary password$/i), "Password1!");
  await user.selectOptions(await screen.findByLabelText(/^role$/i), ROLE_ID);
}

describe("CreateUserForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all required fields, including a Role select populated from the roles endpoint", async () => {
    mockRolesResponse();
    renderWithClient(<CreateUserForm />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^temporary password$/i)).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "ProjectAdmin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create user/i })).toBeInTheDocument();
  });

  it("shows client-side validation errors when submitted empty", async () => {
    mockRolesResponse();
    const user = userEvent.setup();
    renderWithClient(<CreateUserForm />);

    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("requires a role to be selected", async () => {
    mockRolesResponse();
    const user = userEvent.setup();
    renderWithClient(<CreateUserForm />);

    await screen.findByRole("option", { name: "ProjectAdmin" });
    await user.type(screen.getByLabelText(/first name/i), "New");
    await user.type(screen.getByLabelText(/last name/i), "User");
    await user.type(screen.getByLabelText(/^username$/i), "newuser");
    await user.type(screen.getByLabelText(/email address/i), "newuser@example.com");
    await user.type(screen.getByLabelText(/^temporary password$/i), "Password1!");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/select a role/i);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("submits the payload, shows a success message, and resets the form", async () => {
    mockRolesResponse();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "42" } } });
    const user = userEvent.setup();
    renderWithClient(<CreateUserForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/user created successfully/i);
    expect(apiClient.post).toHaveBeenCalledWith("/auth/users", {
      firstName: "New",
      lastName: "User",
      username: "newuser",
      email: "newuser@example.com",
      password: "Password1!",
      employeeId: undefined,
      countryId: null,
      roleId: ROLE_ID,
    });
    expect(screen.getByLabelText(/first name/i)).toHaveValue("");
  });

  it("shows the backend error message when creation fails (e.g. duplicate username)", async () => {
    mockRolesResponse();
    (apiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Username is already taken." } },
    });
    const user = userEvent.setup();
    renderWithClient(<CreateUserForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/username is already taken/i);
  });

  it("shows an error and disables the Role select when the roles request fails", async () => {
    (apiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Unable to load roles." } },
    });
    renderWithClient(<CreateUserForm />);

    expect(await screen.findByText(/unable to load roles/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^role$/i)).toBeDisabled();
  });
});
