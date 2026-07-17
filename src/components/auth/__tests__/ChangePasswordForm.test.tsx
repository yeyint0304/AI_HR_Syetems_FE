import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
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

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders current, new, and confirm password fields", () => {
    renderWithClient(<ChangePasswordForm />);
    expect(screen.getByLabelText(/^current password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirm new password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });

  it("shows client-side validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    renderWithClient(<ChangePasswordForm />);

    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByText(/current password is required/i)).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("flags weak new passwords and mismatched confirmation", async () => {
    const user = userEvent.setup();
    renderWithClient(<ChangePasswordForm />);

    await user.type(screen.getByLabelText(/^current password$/i), "OldPass1!");
    await user.type(screen.getByLabelText(/^new password$/i), "weak");
    await user.type(screen.getByLabelText(/^confirm new password$/i), "different");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("submits the payload and shows a success message, resetting the form", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { message: "Your password has been updated successfully." },
    });
    const user = userEvent.setup();
    renderWithClient(<ChangePasswordForm />);

    await user.type(screen.getByLabelText(/^current password$/i), "OldPass1!");
    await user.type(screen.getByLabelText(/^new password$/i), VALID_NEW_PASSWORD);
    await user.type(screen.getByLabelText(/^confirm new password$/i), VALID_NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/updated successfully/i);
    expect(apiClient.put).toHaveBeenCalledWith("/auth/change-password", {
      currentPassword: "OldPass1!",
      newPassword: VALID_NEW_PASSWORD,
      confirmNewPassword: VALID_NEW_PASSWORD,
    });
    expect(screen.getByLabelText(/^current password$/i)).toHaveValue("");
  });

  it("shows the backend error message when the request fails", async () => {
    (apiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Current password is incorrect." } },
    });
    const user = userEvent.setup();
    renderWithClient(<ChangePasswordForm />);

    await user.type(screen.getByLabelText(/^current password$/i), "WrongPass1!");
    await user.type(screen.getByLabelText(/^new password$/i), VALID_NEW_PASSWORD);
    await user.type(screen.getByLabelText(/^confirm new password$/i), VALID_NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/current password is incorrect/i);
  });
});
