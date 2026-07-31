import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditUserForm } from "@/components/auth/EditUserForm";
import { apiClient } from "@/lib/api/axiosInstance";
import type { UserListItem } from "@/types/auth.types";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), put: jest.fn() },
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
  { id: "3fa85f64-5717-4562-b3fc-2c963f66afa7", name: "SystemAdmin" },
];
const COUNTRIES = [
  { id: "22222222-2222-2222-2222-222222222201", code: "SG", name: "Singapore" },
  { id: "22222222-2222-2222-2222-222222222202", code: "US", name: "United States" },
];

const USER: UserListItem = {
  id: "u1",
  username: "tester",
  email: "tester@d3-sg.com",
  firstName: "Tester1",
  lastName: "Sample",
  employeeId: "EMP004",
  roleName: "ProjectAdmin",
  countryId: "22222222-2222-2222-2222-222222222201",
  countryCode: "SG",
  countryName: "Singapore",
  isActive: true,
};

function mockReferenceData() {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/auth/roles") return Promise.resolve({ data: { data: ROLES } });
    if (url === "/countries") return Promise.resolve({ data: { data: COUNTRIES } });
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });
}

describe("EditUserForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("pre-fills every field from the given user, defaulting Role to 'keep current'", async () => {
    mockReferenceData();
    renderWithClient(<EditUserForm user={USER} onSuccess={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue("Tester1");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("Sample");
    expect(screen.getByLabelText(/^username$/i)).toHaveValue("tester");
    expect(screen.getByLabelText(/employee id/i)).toHaveValue("EMP004");
    expect(screen.getByLabelText(/email address/i)).toHaveValue("tester@d3-sg.com");
    expect(screen.getByLabelText(/^status$/i)).toHaveValue("true");
    expect(await screen.findByRole("option", { name: /keep current role \(ProjectAdmin\)/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^role$/i)).toHaveValue("");
  });

  it("retries loading countries via the 'Try again' action after a failed fetch", async () => {
    let countriesCallCount = 0;
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/auth/roles") return Promise.resolve({ data: { data: ROLES } });
      if (url === "/countries") {
        countriesCallCount += 1;
        if (countriesCallCount === 1) {
          return Promise.reject({
            isAxiosError: true,
            response: { data: { message: "Unable to load countries." } },
          });
        }
        return Promise.resolve({ data: { data: COUNTRIES } });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    const user = userEvent.setup();
    renderWithClient(<EditUserForm user={USER} onSuccess={jest.fn()} onCancel={jest.fn()} />);

    expect(await screen.findByText(/unable to load countries/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(countriesCallCount).toBe(2));
    expect(screen.queryByText(/unable to load countries/i)).not.toBeInTheDocument();
  });

  it("submits only the changed fields plus roleId: null when the role is left unchanged", async () => {
    mockReferenceData();
    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { data: { ...USER, username: "testeredited" } },
    });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    renderWithClient(<EditUserForm user={USER} onSuccess={onSuccess} onCancel={jest.fn()} />);

    await screen.findByRole("option", { name: /keep current role/i });
    const usernameInput = screen.getByLabelText(/^username$/i);
    await user.clear(usernameInput);
    await user.type(usernameInput, "testeredited");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(apiClient.put).toHaveBeenCalledWith(
      "/auth/users/u1",
      expect.objectContaining({
        username: "testeredited",
        email: "tester@d3-sg.com",
        firstName: "Tester1",
        lastName: "Sample",
        isActive: true,
        roleId: null,
      })
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("submits the selected roleId when a new role is chosen", async () => {
    mockReferenceData();
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: USER } });
    const user = userEvent.setup();
    renderWithClient(<EditUserForm user={USER} onSuccess={jest.fn()} onCancel={jest.fn()} />);

    await screen.findByRole("option", { name: "ProjectAdmin" });
    await user.selectOptions(screen.getByLabelText(/^role$/i), ROLE_ID);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(apiClient.put).toHaveBeenCalledWith(
      "/auth/users/u1",
      expect.objectContaining({ roleId: ROLE_ID })
    );
  });

  it("toggles the account status between Active and Inactive", async () => {
    mockReferenceData();
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: { ...USER, isActive: false } } });
    const user = userEvent.setup();
    renderWithClient(<EditUserForm user={USER} onSuccess={jest.fn()} onCancel={jest.fn()} />);

    await user.selectOptions(screen.getByLabelText(/^status$/i), "false");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(apiClient.put).toHaveBeenCalledWith(
      "/auth/users/u1",
      expect.objectContaining({ isActive: false })
    );
  });

  it("disables the Status field and always submits isActive: true when editing the signed-in user's own row", async () => {
    mockReferenceData();
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: USER } });
    const user = userEvent.setup();
    renderWithClient(<EditUserForm user={USER} isSelf onSuccess={jest.fn()} onCancel={jest.fn()} />);

    const statusField = screen.getByLabelText(/^status$/i);
    expect(statusField).toBeDisabled();
    expect(screen.getByText(/you cannot change your own account's status/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(apiClient.put).toHaveBeenCalledWith(
      "/auth/users/u1",
      expect.objectContaining({ isActive: true })
    );
  });

  it("leaves the Status field enabled when editing a different user", async () => {
    mockReferenceData();
    renderWithClient(<EditUserForm user={USER} isSelf={false} onSuccess={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByLabelText(/^status$/i)).not.toBeDisabled();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    mockReferenceData();
    const onCancel = jest.fn();
    const user = userEvent.setup();
    renderWithClient(<EditUserForm user={USER} onSuccess={jest.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows the backend error message when the update fails", async () => {
    mockReferenceData();
    (apiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Username is already taken." } },
    });
    const user = userEvent.setup();
    renderWithClient(<EditUserForm user={USER} onSuccess={jest.fn()} onCancel={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/username is already taken/i);
  });

  it("shows client-side validation errors when required fields are cleared", async () => {
    mockReferenceData();
    const user = userEvent.setup();
    renderWithClient(<EditUserForm user={USER} onSuccess={jest.fn()} onCancel={jest.fn()} />);

    const usernameInput = screen.getByLabelText(/^username$/i);
    await user.clear(usernameInput);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/username must be at least 3 characters/i)).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });
});
