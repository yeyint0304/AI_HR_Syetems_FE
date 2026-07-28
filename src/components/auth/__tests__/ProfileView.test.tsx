import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProfileView } from "@/components/auth/ProfileView";
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

const COUNTRIES = [{ id: "22222222-2222-2222-2222-222222222201", code: "SG", name: "Singapore" }];

const user = {
  firstName: "Jane",
  lastName: "Doe",
  username: "jane.doe",
  email: "jane@example.com",
  role: "Employee",
  countryId: "22222222-2222-2222-2222-222222222201",
};

describe("ProfileView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/countries") return Promise.resolve({ data: { data: COUNTRIES } });
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
  });

  it("renders the read-only profile summary (name, username, email, role, country)", async () => {
    renderWithClient(<ProfileView user={user} />);

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane.doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Employee")).toBeInTheDocument();
    expect(await screen.findByText("Singapore (SG)")).toBeInTheDocument();
  });

  it("shows 'Not set' for country when the user has none", () => {
    renderWithClient(<ProfileView user={{ ...user, countryId: null }} />);
    expect(screen.getByText("Not set")).toBeInTheDocument();
  });

  it("does not show the edit modal until 'Edit profile' is clicked", () => {
    renderWithClient(<ProfileView user={user} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a pre-filled edit modal when 'Edit profile' is clicked", async () => {
    const uiUser = userEvent.setup();
    renderWithClient(<ProfileView user={user} />);

    await uiUser.click(screen.getByRole("button", { name: /edit profile/i }));

    const dialog = screen.getByRole("dialog", { name: /edit profile/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane");
    expect(screen.getByLabelText(/email address/i)).toHaveValue("jane@example.com");
  });

  it("closes the modal via Cancel without saving", async () => {
    const uiUser = userEvent.setup();
    renderWithClient(<ProfileView user={user} />);

    await uiUser.click(screen.getByRole("button", { name: /edit profile/i }));
    await uiUser.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("saves changes, closes the modal, and shows a success confirmation", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { user: { ...user, firstName: "Janet" } },
    });
    const uiUser = userEvent.setup();
    renderWithClient(<ProfileView user={user} />);

    await uiUser.click(screen.getByRole("button", { name: /edit profile/i }));
    const firstNameField = screen.getByLabelText(/first name/i);
    await uiUser.clear(firstNameField);
    await uiUser.type(firstNameField, "Janet");
    await uiUser.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent(/profile has been updated/i);
    expect(mockRefresh).toHaveBeenCalled();
  });
});
