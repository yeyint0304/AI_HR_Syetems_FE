import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ResourceRoleTypesListView } from "@/components/resourceRoleTypes/ResourceRoleTypesListView";
import { apiClient } from "@/lib/api/axiosInstance";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const SENIOR_DEV_ID = "44444444-4444-4444-4444-444444444401";
const JUNIOR_DEV_ID = "44444444-4444-4444-4444-444444444402";

const SENIOR_DEVELOPER = {
  id: SENIOR_DEV_ID,
  name: "Senior Developer",
  description: "Senior software engineer with 5+ years experience",
};
const JUNIOR_DEVELOPER = { id: JUNIOR_DEV_ID, name: "Junior Developer", description: null };

function mockApiGet(resourceRoleTypes: unknown = [SENIOR_DEVELOPER, JUNIOR_DEVELOPER], error?: unknown) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/resource-role-types") {
      return error ? Promise.reject(error) : Promise.resolve({ data: { data: resourceRoleTypes } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("ResourceRoleTypesListView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<ResourceRoleTypesListView />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading resource role types/i);
  });

  it("shows an error state with a retry action when loading fails", async () => {
    mockApiGet([], {
      isAxiosError: true,
      response: { data: { message: "Unable to load resource role types." } },
    });
    renderWithClient(<ResourceRoleTypesListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load resource role types/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders the resource role type table, falling back to an em dash for a missing description", async () => {
    mockApiGet();
    renderWithClient(<ResourceRoleTypesListView />);

    await screen.findByText("Senior Developer");
    expect(screen.getByText("Senior software engineer with 5+ years experience")).toBeInTheDocument();
    expect(screen.getByText("Junior Developer")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows an empty message when there are no resource role types", async () => {
    mockApiGet([]);
    renderWithClient(<ResourceRoleTypesListView />);

    expect(await screen.findByText(/no resource role types yet/i)).toBeInTheDocument();
  });

  it("paginates the table client-side when there are more resource role types than fit on one page", async () => {
    const manyRoleTypes = Array.from({ length: 25 }, (_, index) => ({
      id: `role-type-${index}`,
      name: `Role Type ${index}`,
      description: null,
    }));
    mockApiGet(manyRoleTypes);
    const user = userEvent.setup();
    renderWithClient(<ResourceRoleTypesListView />);

    await screen.findByText("Role Type 0");
    expect(screen.queryByText("Role Type 20")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /resource role types pagination/i })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText("Role Type 20")).toBeInTheDocument();
    expect(screen.queryByText("Role Type 0")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("creates a new resource role type via the Add Resource Role modal", async () => {
    mockApiGet();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "new-id" } } });
    const user = userEvent.setup();
    renderWithClient(<ResourceRoleTypesListView />);

    await screen.findByText("Senior Developer");
    await user.click(screen.getByRole("button", { name: /add resource role/i }));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/name/i), "QA Engineer");
    await user.type(within(dialog).getByLabelText(/description/i), "Quality assurance engineer");
    await user.click(within(dialog).getByRole("button", { name: /add resource role/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/resource-role-types", {
        name: "QA Engineer",
        description: "Quality assurance engineer",
      })
    );
  });

  it("updates a resource role type via the Edit modal", async () => {
    mockApiGet();
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: { id: SENIOR_DEV_ID } } });
    const user = userEvent.setup();
    renderWithClient(<ResourceRoleTypesListView />);

    await screen.findByText("Senior Developer");
    const rows = screen.getAllByRole("row");
    const seniorRow = rows.find((row) => within(row).queryByText("Senior Developer")) as HTMLElement;
    await user.click(within(seniorRow).getByRole("button", { name: /edit/i }));

    const dialog = screen.getByRole("dialog");
    await user.clear(within(dialog).getByLabelText(/name/i));
    await user.type(within(dialog).getByLabelText(/name/i), "Lead Developer");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(
        `/resource-role-types/${SENIOR_DEV_ID}`,
        expect.objectContaining({ name: "Lead Developer" })
      )
    );
  });

  it("deletes a resource role type after confirming in the dialog", async () => {
    mockApiGet();
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<ResourceRoleTypesListView />);

    await screen.findByText("Junior Developer");
    const rows = screen.getAllByRole("row");
    const juniorRow = rows.find((row) => within(row).queryByText("Junior Developer")) as HTMLElement;
    await user.click(within(juniorRow).getByRole("button", { name: /delete/i }));

    const confirmDialog = screen.getByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() =>
      expect(apiClient.delete).toHaveBeenCalledWith(`/resource-role-types/${JUNIOR_DEV_ID}`)
    );
  });

  it("shows an inline error and keeps the confirm dialog open when deletion fails", async () => {
    mockApiGet();
    (apiClient.delete as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Unable to delete the resource role type. Please try again." } },
    });
    const user = userEvent.setup();
    renderWithClient(<ResourceRoleTypesListView />);

    await screen.findByText("Junior Developer");
    const rows = screen.getAllByRole("row");
    const juniorRow = rows.find((row) => within(row).queryByText("Junior Developer")) as HTMLElement;
    await user.click(within(juniorRow).getByRole("button", { name: /delete/i }));

    const confirmDialog = screen.getByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: /^delete$/i }));

    expect(await screen.findByText(/unable to delete the resource role type/i)).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
