import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UpdateProfileForm } from "@/components/auth/UpdateProfileForm";
import { apiClient } from "@/lib/api/axiosInstance";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { post: jest.fn(), put: jest.fn() },
}));

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), refresh: mockRefresh }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const initialValues = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  countryId: null,
};

describe("UpdateProfileForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders fields pre-filled with the initial values", () => {
    renderWithClient(<UpdateProfileForm initialValues={initialValues} />);
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("Doe");
    expect(screen.getByLabelText(/email address/i)).toHaveValue("jane@example.com");
  });

  it("disables the submit button until the form is dirty", async () => {
    const user = userEvent.setup();
    renderWithClient(<UpdateProfileForm initialValues={initialValues} />);

    const submitButton = screen.getByRole("button", { name: /save changes/i });
    expect(submitButton).toBeDisabled();

    await user.clear(screen.getByLabelText(/first name/i));
    await user.type(screen.getByLabelText(/first name/i), "Janet");

    expect(submitButton).toBeEnabled();
  });

  it("shows a validation error for an invalid email", async () => {
    const user = userEvent.setup();
    renderWithClient(<UpdateProfileForm initialValues={initialValues} />);

    const emailField = screen.getByLabelText(/email address/i);
    await user.clear(emailField);
    await user.type(emailField, "not-an-email");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("submits updated values and shows a success message", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { user: { ...initialValues, id: "1", role: "User", firstName: "Janet" } },
    });
    const user = userEvent.setup();
    renderWithClient(<UpdateProfileForm initialValues={initialValues} />);

    await user.clear(screen.getByLabelText(/first name/i));
    await user.type(screen.getByLabelText(/first name/i), "Janet");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/profile has been updated/i);
    expect(apiClient.put).toHaveBeenCalledWith("/auth/profile", {
      firstName: "Janet",
      lastName: "Doe",
      email: "jane@example.com",
      countryId: null,
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows the backend error message when the update fails", async () => {
    (apiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Email is already in use." } },
    });
    const user = userEvent.setup();
    renderWithClient(<UpdateProfileForm initialValues={initialValues} />);

    await user.clear(screen.getByLabelText(/first name/i));
    await user.type(screen.getByLabelText(/first name/i), "Janet");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/email is already in use/i);
  });
});
