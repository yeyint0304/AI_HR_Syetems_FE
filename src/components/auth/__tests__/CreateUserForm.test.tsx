import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateUserForm } from "@/components/auth/CreateUserForm";
import { apiClient } from "@/lib/api/axiosInstance";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { post: jest.fn(), put: jest.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const VALID_ROLE_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), "New");
  await user.type(screen.getByLabelText(/last name/i), "User");
  await user.type(screen.getByLabelText(/^username$/i), "newuser");
  await user.type(screen.getByLabelText(/email address/i), "newuser@example.com");
  await user.type(screen.getByLabelText(/^temporary password$/i), "Password1!");
  await user.type(screen.getByLabelText(/role id/i), VALID_ROLE_ID);
}

describe("CreateUserForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all required fields", () => {
    renderWithClient(<CreateUserForm />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^temporary password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role id/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create user/i })).toBeInTheDocument();
  });

  it("shows client-side validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    renderWithClient(<CreateUserForm />);

    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("validates the role id must be a GUID", async () => {
    const user = userEvent.setup();
    renderWithClient(<CreateUserForm />);

    await fillRequiredFields(user);
    await user.clear(screen.getByLabelText(/role id/i));
    await user.type(screen.getByLabelText(/role id/i), "not-a-guid");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(await screen.findByText(/select a valid role id/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("submits the payload, shows a success message, and resets the form", async () => {
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
      roleId: VALID_ROLE_ID,
    });
    expect(screen.getByLabelText(/first name/i)).toHaveValue("");
  });

  it("shows the backend error message when creation fails (e.g. duplicate username)", async () => {
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
});
