import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ResetUserPasswordForm } from "@/components/auth/ResetUserPasswordForm";
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

const VALID_NEW_PASSWORD = "NewPass1!";

describe("ResetUserPasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders only new/confirm password fields (no current-password field)", () => {
    renderWithClient(
      <ResetUserPasswordForm userId="u1" userLabel="Jane Doe" onSuccess={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirm new password$/i)).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("shows a validation error when submitted empty", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <ResetUserPasswordForm userId="u1" userLabel="Jane Doe" onSuccess={jest.fn()} onCancel={jest.fn()} />
    );

    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("flags a mismatched confirmation", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <ResetUserPasswordForm userId="u1" userLabel="Jane Doe" onSuccess={jest.fn()} onCancel={jest.fn()} />
    );

    await user.type(screen.getByLabelText(/^new password$/i), VALID_NEW_PASSWORD);
    await user.type(screen.getByLabelText(/^confirm new password$/i), "Different1!");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("submits the payload to the given user's reset-password endpoint and calls onSuccess", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { message: "Password reset successfully." },
    });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    renderWithClient(
      <ResetUserPasswordForm userId="u1" userLabel="Jane Doe" onSuccess={onSuccess} onCancel={jest.fn()} />
    );

    await user.type(screen.getByLabelText(/^new password$/i), VALID_NEW_PASSWORD);
    await user.type(screen.getByLabelText(/^confirm new password$/i), VALID_NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await screen.findByRole("button", { name: /reset password/i });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(apiClient.put).toHaveBeenCalledWith("/auth/users/u1/reset-password", {
      newPassword: VALID_NEW_PASSWORD,
      confirmNewPassword: VALID_NEW_PASSWORD,
    });
  });

  it("shows the backend error message when the request fails, without calling onSuccess", async () => {
    (apiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "User not found." } },
    });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    renderWithClient(
      <ResetUserPasswordForm userId="u1" userLabel="Jane Doe" onSuccess={onSuccess} onCancel={jest.fn()} />
    );

    await user.type(screen.getByLabelText(/^new password$/i), VALID_NEW_PASSWORD);
    await user.type(screen.getByLabelText(/^confirm new password$/i), VALID_NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/user not found/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    renderWithClient(
      <ResetUserPasswordForm userId="u1" userLabel="Jane Doe" onSuccess={jest.fn()} onCancel={onCancel} />
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
