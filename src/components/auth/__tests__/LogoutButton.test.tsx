import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogoutButton } from "@/components/auth/LogoutButton";
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

describe("LogoutButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a sign out button", () => {
    renderWithClient(<LogoutButton />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("calls the logout endpoint and redirects to /login on click", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });
    const user = userEvent.setup();
    renderWithClient(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(apiClient.post).toHaveBeenCalledWith("/auth/logout");
    await screen.findByRole("button", { name: /sign out/i });
    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("still redirects to /login even if the logout request fails", async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error("network error"));
    const user = userEvent.setup();
    renderWithClient(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("disables the button and shows a busy state while the request is pending", async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    (apiClient.post as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const user = userEvent.setup();
    renderWithClient(<LogoutButton />);

    const button = screen.getByRole("button", { name: /sign out/i });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    resolveRequest({ data: { success: true } });
  });
});
