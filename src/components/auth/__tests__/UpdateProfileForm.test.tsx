import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UpdateProfileForm } from "@/components/auth/UpdateProfileForm";
import { apiClient } from "@/lib/api/axiosInstance";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
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

const COUNTRIES = [
  { id: "22222222-2222-2222-2222-222222222201", code: "SG", name: "Singapore" },
  { id: "22222222-2222-2222-2222-222222222202", code: "US", name: "United States" },
];

describe("UpdateProfileForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/countries") return Promise.resolve({ data: { data: COUNTRIES } });
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
  });

  it("renders fields pre-filled with the initial values", () => {
    renderWithClient(<UpdateProfileForm initialValues={initialValues} />);
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("Doe");
    expect(screen.getByLabelText(/email address/i)).toHaveValue("jane@example.com");
  });

  it("renders a searchable Country combobox populated from the countries endpoint (GET /countries)", async () => {
    const user = userEvent.setup();
    renderWithClient(<UpdateProfileForm initialValues={initialValues} />);

    const countryField = await screen.findByLabelText(/^country$/i);
    expect(countryField).toHaveAttribute("role", "combobox");
    await user.click(countryField);

    expect(await screen.findByRole("option", { name: "Singapore (SG)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "United States (US)" })).toBeInTheDocument();
  });

  it("shows an error and disables the Country select when the countries request fails", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) =>
      url === "/countries"
        ? Promise.reject({
            isAxiosError: true,
            response: { data: { message: "Unable to load countries." } },
          })
        : Promise.reject(new Error(`Unhandled GET ${url}`))
    );
    renderWithClient(<UpdateProfileForm initialValues={initialValues} />);

    expect(await screen.findByText(/unable to load countries/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^country$/i)).toBeDisabled();
  });

  it("retries loading countries via the 'Try again' action after a failed fetch", async () => {
    let countriesCallCount = 0;
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url !== "/countries") return Promise.reject(new Error(`Unhandled GET ${url}`));
      countriesCallCount += 1;
      if (countriesCallCount === 1) {
        return Promise.reject({
          isAxiosError: true,
          response: { data: { message: "Unable to load countries." } },
        });
      }
      return Promise.resolve({ data: { data: COUNTRIES } });
    });
    const user = userEvent.setup();
    renderWithClient(<UpdateProfileForm initialValues={initialValues} />);

    expect(await screen.findByText(/unable to load countries/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(countriesCallCount).toBe(2));
    expect(screen.queryByText(/unable to load countries/i)).not.toBeInTheDocument();
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

  it("submits updated values and calls onSuccess with the backend's updated user", async () => {
    const updatedUser = { ...initialValues, id: "1", role: "User", firstName: "Janet" };
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { user: updatedUser } });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    renderWithClient(<UpdateProfileForm initialValues={initialValues} onSuccess={onSuccess} />);

    await user.clear(screen.getByLabelText(/first name/i));
    await user.type(screen.getByLabelText(/first name/i), "Janet");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(updatedUser);
    expect(apiClient.put).toHaveBeenCalledWith("/auth/profile", {
      firstName: "Janet",
      lastName: "Doe",
      email: "jane@example.com",
      countryId: null,
    });
    // No server refresh — the returned user is written straight into the
    // auth store instead (`hooks/useAuth.ts#useUpdateProfile`).
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("shows the backend error message when the update fails, without calling onSuccess", async () => {
    (apiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Email is already in use." } },
    });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    renderWithClient(<UpdateProfileForm initialValues={initialValues} onSuccess={onSuccess} />);

    await user.clear(screen.getByLabelText(/first name/i));
    await user.type(screen.getByLabelText(/first name/i), "Janet");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/email is already in use/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("omits the Cancel button when onCancel is not provided", () => {
    renderWithClient(<UpdateProfileForm initialValues={initialValues} />);
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("renders a Cancel button and calls onCancel when clicked", async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    renderWithClient(<UpdateProfileForm initialValues={initialValues} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
