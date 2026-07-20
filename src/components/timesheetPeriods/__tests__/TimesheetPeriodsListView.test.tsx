import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimesheetPeriodsListView } from "@/components/timesheetPeriods/TimesheetPeriodsListView";
import { apiClient } from "@/lib/api/axiosInstance";
import { useAuthStore } from "@/stores/auth.store";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const UNLOCKED_PERIOD = {
  id: "a516eb81-806c-489d-a2a8-be63e1e3e1d8",
  periodStart: "2025-01-01",
  periodEnd: "2025-02-16",
  isLocked: false,
  lockedAt: null,
  lockedBy: null,
};

const LOCKED_PERIOD = {
  id: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
  periodStart: "2025-02-17",
  periodEnd: "2025-03-31",
  isLocked: true,
  lockedAt: "2026-06-22T01:26:23.930Z",
  lockedBy: "admin@hrsystem.com",
};

/**
 * Waits for the loaded table to appear. `findByText("Locked")`/`"Unlocked"`
 * would ambiguously match the always-rendered filter tab buttons (which
 * share the same label text as the status badges), so every test scopes its
 * assertions to the table body instead.
 */
async function findLoadedTableBody() {
  const table = await screen.findByRole("table");
  return within(table);
}

describe("TimesheetPeriodsListView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null });
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    renderWithClient(<TimesheetPeriodsListView />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading timesheet periods/i);
  });

  it("renders the period table once loaded", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { data: [UNLOCKED_PERIOD, LOCKED_PERIOD] },
    });
    renderWithClient(<TimesheetPeriodsListView />);

    const table = await findLoadedTableBody();
    expect(table.getByText("Unlocked")).toBeInTheDocument();
    expect(table.getByText("Locked")).toBeInTheDocument();
  });

  it("shows an empty state when there are no periods", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [] } });
    renderWithClient(<TimesheetPeriodsListView />);

    expect(await screen.findByText(/no timesheet periods yet/i)).toBeInTheDocument();
  });

  it("shows an error state with a retry action when loading fails", async () => {
    (apiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Unable to load timesheet periods." } },
    });
    renderWithClient(<TimesheetPeriodsListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load timesheet periods/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("hides the Actions column and New Period link for a non-manager role", async () => {
    useAuthStore.setState({ user: { id: "1", email: "user@hrsystem.com", role: "User" } });
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [UNLOCKED_PERIOD] } });
    renderWithClient(<TimesheetPeriodsListView />);

    const table = await findLoadedTableBody();
    expect(screen.queryByRole("link", { name: /new period/i })).not.toBeInTheDocument();
    expect(table.queryByRole("button", { name: /^lock$/i })).not.toBeInTheDocument();
  });

  it("shows the Actions column and New Period link for a ProjectAdmin", async () => {
    useAuthStore.setState({ user: { id: "1", email: "sarah@hrsystem.com", role: "ProjectAdmin" } });
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [UNLOCKED_PERIOD] } });
    renderWithClient(<TimesheetPeriodsListView />);

    const table = await findLoadedTableBody();
    expect(screen.getByRole("link", { name: /new period/i })).toBeInTheDocument();
    expect(table.getByRole("button", { name: /^lock$/i })).toBeInTheDocument();
  });

  it("locks an unlocked period after confirming in the dialog", async () => {
    useAuthStore.setState({ user: { id: "1", email: "sarah@hrsystem.com", role: "ProjectAdmin" } });
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [UNLOCKED_PERIOD] } });
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<TimesheetPeriodsListView />);

    const table = await findLoadedTableBody();
    await user.click(table.getByRole("button", { name: /^lock$/i }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /^lock$/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(`/timesheet-periods/${UNLOCKED_PERIOD.id}/lock`)
    );
  });

  it("unlocks a locked period after confirming in the dialog", async () => {
    useAuthStore.setState({ user: { id: "1", email: "sarah@hrsystem.com", role: "ProjectAdmin" } });
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [LOCKED_PERIOD] } });
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<TimesheetPeriodsListView />);

    const table = await findLoadedTableBody();
    await user.click(table.getByRole("button", { name: /^unlock$/i }));

    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^unlock$/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(`/timesheet-periods/${LOCKED_PERIOD.id}/unlock`)
    );
  });

  it("deletes a period after confirming in the dialog", async () => {
    useAuthStore.setState({ user: { id: "1", email: "sarah@hrsystem.com", role: "ProjectAdmin" } });
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [UNLOCKED_PERIOD] } });
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<TimesheetPeriodsListView />);

    const table = await findLoadedTableBody();
    await user.click(table.getByRole("button", { name: /delete/i }));

    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() =>
      expect(apiClient.delete).toHaveBeenCalledWith(`/timesheet-periods/${UNLOCKED_PERIOD.id}`)
    );
  });

  it("filters by lock status using the filter buttons", async () => {
    useAuthStore.setState({ user: { id: "1", email: "sarah@hrsystem.com", role: "ProjectAdmin" } });
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [UNLOCKED_PERIOD] } });
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [LOCKED_PERIOD] } });
    const user = userEvent.setup();
    renderWithClient(<TimesheetPeriodsListView />);

    await findLoadedTableBody();
    await user.click(screen.getByRole("button", { name: "Locked" }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenLastCalledWith("/timesheet-periods", {
        params: { isLocked: true },
      })
    );
  });
});
