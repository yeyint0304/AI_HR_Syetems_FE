import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginForm } from "@/components/auth/LoginForm";
import { apiClient } from "@/lib/api/axiosInstance";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { post: jest.fn(), put: jest.fn() },
}));

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("LoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the username/email and password fields", () => {
    renderWithClient(<LoginForm />);
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows client-side validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    renderWithClient(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/username or email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("submits credentials and redirects on success", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: "1", username: "jane", email: "jane@example.com", role: "User" } },
    });
    const user = userEvent.setup();
    renderWithClient(<LoginForm />);

    await user.type(screen.getByLabelText(/username or email/i), "jane");
    await user.type(screen.getByLabelText(/^password$/i), "Password1!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      usernameOrEmail: "jane",
      password: "Password1!",
    }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("shows the backend error message when login fails", async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Invalid username/email or password." } },
    });
    const user = userEvent.setup();
    renderWithClient(<LoginForm />);

    await user.type(screen.getByLabelText(/username or email/i), "jane");
    await user.type(screen.getByLabelText(/^password$/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid username\/email or password/i
    );
  });
});
