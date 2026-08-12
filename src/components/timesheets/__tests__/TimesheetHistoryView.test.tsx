import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimesheetHistoryView } from "@/components/timesheets/TimesheetHistoryView";
import { apiClient } from "@/lib/api/axiosInstance";
import { useAuthStore } from "@/stores/auth.store";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import { getTodayDateOnly } from "@/lib/utils/week";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const CURRENT_USER_ID = "3fa85f64-5717-4562-b3fc-2c963f66af01";
const OTHER_USER_ID = "3fa85f64-5717-4562-b3fc-2c963f66af11";
const PERIOD_ID = "3fa85f64-5717-4562-b3fc-2c963f66af02";
const LOCKED_PERIOD_ID = "3fa85f64-5717-4562-b3fc-2c963f66af03";
const PROJECT_ID = "3fa85f64-5717-4562-b3fc-2c963f66af04";
const OTHER_PROJECT_ID = "3fa85f64-5717-4562-b3fc-2c963f66af07";
const PENDING_ENTRY_ID = "3fa85f64-5717-4562-b3fc-2c963f66af05";
const APPROVED_ENTRY_ID = "3fa85f64-5717-4562-b3fc-2c963f66af06";
const LOCKED_ENTRY_ID = "3fa85f64-5717-4562-b3fc-2c963f66af08";

const PERIOD = {
  id: PERIOD_ID,
  periodStart: "2025-01-06",
  periodEnd: "2025-02-16",
  isLocked: false,
  lockedAt: null,
  lockedBy: null,
};

const LOCKED_PERIOD = { ...PERIOD, id: LOCKED_PERIOD_ID, isLocked: true, lockedAt: "2025-01-01T00:00:00Z" };

const PROJECT = {
  id: PROJECT_ID,
  code: "PRJ-ALPHA",
  name: "Project Alpha",
  description: "",
  clientName: "Acme Corp",
  clientEmail: "client@acme.com",
  startDate: "2025-01-01",
  endDate: "2025-12-31",
  maxDailyHours: 8,
  isActive: true,
};

const OTHER_PROJECT = { ...PROJECT, id: OTHER_PROJECT_ID, code: "PRJ-BETA", name: "Project Beta" };

const PENDING_ENTRY = {
  id: PENDING_ENTRY_ID,
  userId: CURRENT_USER_ID,
  projectId: PROJECT_ID,
  projectCode: "PRJ-ALPHA",
  projectName: "Project Alpha",
  timesheetPeriodId: PERIOD_ID,
  entryDate: "2025-01-06",
  hours: 6,
  taskDescription: "Existing work",
  isApproved: false,
};

const APPROVED_ENTRY = {
  id: APPROVED_ENTRY_ID,
  userId: CURRENT_USER_ID,
  projectId: PROJECT_ID,
  projectCode: "PRJ-ALPHA",
  projectName: "Project Alpha",
  timesheetPeriodId: PERIOD_ID,
  entryDate: "2025-01-07",
  hours: 5,
  taskDescription: "Approved work",
  isApproved: true,
};

const OTHER_USER_PENDING_ENTRY = {
  id: "3fa85f64-5717-4562-b3fc-2c963f66af12",
  userId: OTHER_USER_ID,
  userFirstName: "Alex",
  userLastName: "Kumar",
  projectId: PROJECT_ID,
  projectCode: "PRJ-ALPHA",
  projectName: "Project Alpha",
  timesheetPeriodId: PERIOD_ID,
  entryDate: "2025-01-09",
  hours: 4,
  taskDescription: "Someone else's work",
  isApproved: false,
};

const LOCKED_PERIOD_ENTRY = {
  id: LOCKED_ENTRY_ID,
  userId: CURRENT_USER_ID,
  projectId: OTHER_PROJECT_ID,
  projectCode: "PRJ-BETA",
  projectName: "Project Beta",
  timesheetPeriodId: LOCKED_PERIOD_ID,
  entryDate: "2025-01-08",
  hours: 3,
  taskDescription: "Work on a now-locked period",
  isApproved: false,
};

interface MockOptions {
  periods?: unknown[];
  projects?: unknown[];
  entries?: unknown[];
  /** Maps a projectId to its `ProjectAssignment[]` for `/projects/:id/assignments` (used by the ProjectAdmin project-scoping gate). */
  assignments?: Record<string, unknown[]>;
  /** `{ userId, roleName }[]` for `/timesheet-entries/user-roles` (the ProjectAdmin-only SystemAdmin-owner gate). Defaults to empty — only relevant when a ProjectAdmin is signed in. */
  userRoles?: unknown[];
  /**
   * Total entries across every page (`feature/timesheets-pagination`) — lets
   * pagination-focused tests simulate a history longer than the one page of
   * `entries` handed to this mock. Defaults to `entries.length` (a single,
   * complete page), matching every existing non-pagination-focused test.
   */
  totalCount?: number;
}

function mockApi({
  periods = [PERIOD],
  projects = [PROJECT, OTHER_PROJECT],
  entries = [],
  assignments = {},
  userRoles = [],
  totalCount = entries.length,
}: MockOptions = {}) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/timesheet-periods") return Promise.resolve({ data: { data: periods } });
    if (url === "/projects" || url === "/projects/my") return Promise.resolve({ data: { data: projects } });
    if (url === "/timesheet-entries") {
      return Promise.resolve({
        data: {
          data: entries,
          totalCount,
          page: 1,
          pageSize: 20,
          totalPages: Math.max(1, Math.ceil(totalCount / 20)),
        },
      });
    }
    // ProjectAdmin's dedicated summary endpoint (`GetProjectAdminTimesheetSummary`) —
    // `entries` is reused here so every existing entries-based assertion works
    // identically regardless of which role/endpoint powered the fetch.
    if (url === "/timesheet-entries/project-admin-summary") {
      return Promise.resolve({
        data: {
          data: {
            totalHours: 0,
            approvedHours: 0,
            pendingHours: 0,
            projectSummaries: [],
            entries,
            totalCount,
            page: 1,
            pageSize: 20,
            totalPages: Math.max(1, Math.ceil(totalCount / 20)),
          },
        },
      });
    }
    if (url === "/timesheet-entries/user-roles") return Promise.resolve({ data: { data: userRoles } });
    const assignmentsMatch = url.match(/^\/projects\/(.+)\/assignments$/);
    if (assignmentsMatch) {
      return Promise.resolve({ data: { data: assignments[assignmentsMatch[1]] ?? [] } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("TimesheetHistoryView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null });
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading timesheet history/i);
  });

  it("shows an error state with a retry action when loading fails", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/timesheet-periods") {
        return Promise.reject({
          isAxiosError: true,
          response: { data: { message: "Unable to load timesheet periods." } },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load timesheet periods/i);
    const retryButton = screen.getByRole("button", { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    const callCountBeforeRetry = (apiClient.get as jest.Mock).mock.calls.length;
    const user = userEvent.setup();
    await user.click(retryButton);
    await waitFor(() =>
      expect((apiClient.get as jest.Mock).mock.calls.length).toBeGreaterThan(callCountBeforeRetry)
    );
    expect(apiClient.get).toHaveBeenCalledWith("/timesheet-periods", expect.anything());
  });

  it("shows an entries error state with a retry action", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/timesheet-entries") {
        return Promise.reject({
          isAxiosError: true,
          response: { data: { message: "Unable to load entries." } },
        });
      }
      if (url === "/timesheet-periods") return Promise.resolve({ data: { data: [PERIOD] } });
      if (url === "/projects" || url === "/projects/my") return Promise.resolve({ data: { data: [PROJECT] } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    expect(await screen.findByText(/unable to load entries/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows an empty state when the user has no timesheet entries at all", async () => {
    mockApi({ entries: [] });
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    expect(await screen.findByText(/you have no timesheet entries yet/i)).toBeInTheDocument();
  });

  it("renders entries with summary totals and Approved/Pending badges", async () => {
    mockApi({ entries: [PENDING_ENTRY, APPROVED_ENTRY] });
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await screen.findByRole("table");

    expect(screen.getByText("11h")).toBeInTheDocument(); // total
    expect(screen.getByText("5h", { selector: "p" })).toBeInTheDocument(); // approved
    expect(screen.getByText("6h", { selector: "p" })).toBeInTheDocument(); // pending

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders a pending, unlocked entry as editable and an approved entry as Locked", async () => {
    mockApi({ entries: [PENDING_ENTRY, APPROVED_ENTRY] });
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await screen.findByRole("table");

    expect(screen.getAllByRole("button", { name: /^edit$/i })).toHaveLength(1);
    expect(screen.getByText(/^locked$/i)).toBeInTheDocument();
  });

  // `bugs/exchange-rate`: "if he updates it again then re-approval required
  // from PA" — unlike a historical approved entry (locked, tested above), an
  // approved entry dated *today* stays editable.
  it("still shows Edit for the owner's own approved entry when it is dated today", async () => {
    const todaysApprovedEntry = { ...APPROVED_ENTRY, entryDate: getTodayDateOnly() };
    mockApi({ entries: [todaysApprovedEntry] });
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await screen.findByRole("table");

    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.queryByText(/^locked$/i)).not.toBeInTheDocument();
  });

  it("edits and saves an already-approved entry dated today, surfacing a re-approval notice", async () => {
    const todaysApprovedEntry = { ...APPROVED_ENTRY, entryDate: getTodayDateOnly() };
    mockApi({ entries: [todaysApprovedEntry] });
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await user.click(await screen.findByRole("button", { name: /^edit$/i }));
    const hoursInput = screen.getByLabelText(/hours for project alpha/i);
    await user.clear(hoursInput);
    await user.type(hoursInput, "6");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(`/timesheet-entries/${APPROVED_ENTRY_ID}`, {
        hours: 6,
        taskDescription: "Approved work",
      })
    );
    expect(await screen.findByText(/requires re-approval/i)).toBeInTheDocument();
  });

  it("renders an entry whose timesheet period is locked as read-only, even if not yet approved", async () => {
    mockApi({ periods: [PERIOD, LOCKED_PERIOD], entries: [LOCKED_PERIOD_ENTRY] });
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await screen.findByRole("table");

    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/^locked$/i)).toBeInTheDocument();
  });

  it("edits and saves an editable entry via the Edit action", async () => {
    mockApi({ entries: [PENDING_ENTRY] });
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await user.click(await screen.findByRole("button", { name: /^edit$/i }));

    const hoursInput = screen.getByLabelText(/hours for project alpha/i);
    await user.clear(hoursInput);
    await user.type(hoursInput, "7.5");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(`/timesheet-entries/${PENDING_ENTRY_ID}`, {
        hours: 7.5,
        taskDescription: "Existing work",
      })
    );
    expect(await screen.findByText(/updated successfully/i)).toBeInTheDocument();
  });

  it("shows a field error and does not call the API when saving invalid hours", async () => {
    mockApi({ entries: [PENDING_ENTRY] });
    const user = userEvent.setup();
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await user.click(await screen.findByRole("button", { name: /^edit$/i }));
    const hoursInput = screen.getByLabelText(/hours for project alpha/i);
    await user.clear(hoursInput);
    await user.type(hoursInput, "0");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/hours must be at least/i);
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("cancels an in-progress edit without calling the API", async () => {
    mockApi({ entries: [PENDING_ENTRY] });
    const user = userEvent.setup();
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await user.click(await screen.findByRole("button", { name: /^edit$/i }));
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("filters visible entries by the Date From/Date To range", async () => {
    const earlyEntry = { ...PENDING_ENTRY, id: "3fa85f64-5717-4562-b3fc-2c963f66af09", entryDate: "2025-01-06" };
    const lateEntry = { ...APPROVED_ENTRY, id: "3fa85f64-5717-4562-b3fc-2c963f66af10", entryDate: "2025-02-01" };
    mockApi({ entries: [earlyEntry, lateEntry] });
    const user = userEvent.setup();
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await screen.findByRole("table");
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 entries
    expect(screen.getByText("06 Jan 2025")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/date from/i), "2025-01-15");
    await user.click(screen.getByRole("button", { name: /^filter$/i }));

    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2)); // header + 1 remaining entry
    expect(screen.queryByText("06 Jan 2025")).not.toBeInTheDocument();
    expect(screen.getByText("01 Feb 2025")).toBeInTheDocument();
  });

  // Regression: the "Project" filter's "All Projects" entry used to be
  // rendered as a `disabled` placeholder `<option>`, so once a user picked a
  // specific project there was no way to select "All Projects" again.
  it("allows re-selecting 'All Projects' after filtering by a specific project", async () => {
    mockApi({ entries: [PENDING_ENTRY] });
    const user = userEvent.setup();
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await screen.findByRole("table");
    const projectSelect = screen.getByLabelText(/^project$/i);

    await user.selectOptions(projectSelect, PROJECT_ID);
    expect(screen.getByRole("option", { name: /all projects/i })).not.toBeDisabled();

    await user.selectOptions(projectSelect, "All Projects");
    await user.click(screen.getByRole("button", { name: /^filter$/i }));

    expect(projectSelect).toHaveValue("");
  });

  it("shows an empty state when no entries match the applied filters", async () => {
    mockApi({ entries: [PENDING_ENTRY] }); // entryDate: 2025-01-06
    const user = userEvent.setup();
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await screen.findByRole("table");

    await user.type(screen.getByLabelText(/date from/i), "2025-06-01");
    await user.click(screen.getByRole("button", { name: /^filter$/i }));

    expect(await screen.findByText(/no entries match the selected filters/i)).toBeInTheDocument();
  });

  it("shows a validation error and does not filter when Date From is after Date To", async () => {
    mockApi({ entries: [PENDING_ENTRY] });
    const user = userEvent.setup();
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await screen.findByRole("table");

    await user.type(screen.getByLabelText(/date from/i), "2025-02-01");
    await user.type(screen.getByLabelText(/date to/i), "2025-01-01");
    await user.click(screen.getByRole("button", { name: /^filter$/i }));

    expect(await screen.findByText(/date from must be on or before date to/i)).toBeInTheDocument();
    // The (still-valid, unfiltered) entry list remains visible.
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("scopes the entries request to the given currentUserId", async () => {
    mockApi({ entries: [] });
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/timesheet-entries",
        expect.objectContaining({ params: expect.objectContaining({ userId: CURRENT_USER_ID }) })
      )
    );
  });

  describe("pagination (feature/timesheets-pagination)", () => {
    it("requests page 1 with the default page size on first load", async () => {
      mockApi({ entries: [PENDING_ENTRY] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await waitFor(() =>
        expect(apiClient.get).toHaveBeenCalledWith(
          "/timesheet-entries",
          expect.objectContaining({ params: expect.objectContaining({ page: 1, pageSize: 20 }) })
        )
      );
    });

    it("shows Previous/Next controls and requests page 2 after clicking Next", async () => {
      // 25 entries total, only one page's worth (`PENDING_ENTRY`) returned by
      // the mocked first-page response — `totalCount` alone is enough to make
      // `TablePagination` render Previous/Next (it derives `totalPages` from
      // the response, not from how many rows happen to be on this page).
      mockApi({ entries: [PENDING_ENTRY], totalCount: 25 });
      const user = userEvent.setup();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      const nextButton = await screen.findByRole("button", { name: /^next$/i });
      await user.click(nextButton);

      await waitFor(() =>
        expect(apiClient.get).toHaveBeenCalledWith(
          "/timesheet-entries",
          expect.objectContaining({ params: expect.objectContaining({ page: 2, pageSize: 20 }) })
        )
      );
    });

    it("resets back to page 1 when a new filter is applied", async () => {
      mockApi({ entries: [PENDING_ENTRY], totalCount: 25 });
      const user = userEvent.setup();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      const nextButton = await screen.findByRole("button", { name: /^next$/i });
      await user.click(nextButton);
      await waitFor(() =>
        expect(apiClient.get).toHaveBeenCalledWith(
          "/timesheet-entries",
          expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })
        )
      );

      await user.selectOptions(screen.getByLabelText(/^project$/i), PROJECT_ID);
      await user.click(screen.getByRole("button", { name: /^filter$/i }));

      await waitFor(() =>
        expect(apiClient.get).toHaveBeenCalledWith(
          "/timesheet-entries",
          expect.objectContaining({
            params: expect.objectContaining({ page: 1, projectId: PROJECT_ID }),
          })
        )
      );
    });
  });

  it("does not show a Generate Invoice link for a plain User", async () => {
    mockApi({ entries: [] });
    renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

    await screen.findByText(/you have no timesheet entries yet/i);
    expect(screen.queryByRole("link", { name: /generate invoice/i })).not.toBeInTheDocument();
  });

  describe("as a manager (SystemAdmin — unrestricted, not project-scoped)", () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: { id: CURRENT_USER_ID, email: "admin@hrsystem.com", role: USER_ROLES.SYSTEM_ADMIN },
      });
    });

    it("shows a Generate Invoice link routed to /invoices/generate", async () => {
      mockApi({ entries: [] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      const link = await screen.findByRole("link", { name: /generate invoice/i });
      expect(link).toHaveAttribute("href", "/invoices/generate");
    });

    // `bugs/timesheet-history`: "fix the create invoice that showing 400 ...
    // No approved timesheet entries found in the specified billing period" —
    // forwarding the applied filters lets `InvoiceGenerateForm` pre-fill the
    // exact project/range the manager just reviewed.
    it("forwards the applied Project/Date From/Date To filters as query params on the Generate Invoice link", async () => {
      mockApi({ entries: [] });
      const user = userEvent.setup();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByText(/you have no timesheet entries yet/i);

      await user.selectOptions(screen.getByLabelText(/^project$/i), PROJECT_ID);
      await user.type(screen.getByLabelText(/date from/i), "2025-01-01");
      await user.type(screen.getByLabelText(/date to/i), "2025-01-31");
      await user.click(screen.getByRole("button", { name: /^filter$/i }));

      const link = await screen.findByRole("link", { name: /generate invoice/i });
      expect(link).toHaveAttribute(
        "href",
        `/invoices/generate?projectId=${PROJECT_ID}&billingPeriodStart=2025-01-01&billingPeriodEnd=2025-01-31`
      );
    });

    it("omits the userId filter so it can review every user's entries", async () => {
      mockApi({ entries: [] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await waitFor(() =>
        expect(apiClient.get).toHaveBeenCalledWith(
          "/timesheet-entries",
          expect.objectContaining({ params: expect.objectContaining({ userId: undefined }) })
        )
      );
    });

    // API-integration requirement: a SystemAdmin keeps using the org-wide
    // `GetAllTimesheetEntries`, never the ProjectAdmin-only summary endpoint.
    it("never calls the project-admin-summary endpoint", async () => {
      mockApi({ entries: [] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByText(/you have no timesheet entries yet/i);

      expect(apiClient.get).not.toHaveBeenCalledWith(
        "/timesheet-entries/project-admin-summary",
        expect.anything()
      );
    });

    // A SystemAdmin's own Approve/Reject authority is otherwise unrestricted
    // (see `canReviewEntry`), so it never needs the user-role directory —
    // only a ProjectAdmin does, to know whether an entry's owner is a
    // SystemAdmin.
    it("never fetches the user-role directory for a SystemAdmin viewer", async () => {
      mockApi({ entries: [OTHER_USER_PENDING_ENTRY] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      expect(apiClient.get).not.toHaveBeenCalledWith("/timesheet-entries/user-roles");
    });

    it("shows a User column and Approve/Reject actions for another user's pending entry", async () => {
      mockApi({ entries: [PENDING_ENTRY, OTHER_USER_PENDING_ENTRY] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      const table = await screen.findByRole("table");

      expect(screen.getByRole("columnheader", { name: /^user$/i })).toBeInTheDocument();
      expect(screen.getByText("Alex Kumar")).toBeInTheDocument();

      const otherUsersRow = within(table).getByText("Alex Kumar").closest("tr");
      if (!otherUsersRow) throw new Error("Could not find Alex Kumar's row");
      // Someone else's pending entry: Approve/Reject only, no Edit (it isn't the manager's own entry).
      expect(within(otherUsersRow).getByRole("button", { name: /^approve$/i })).toBeInTheDocument();
      expect(within(otherUsersRow).getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
      expect(within(otherUsersRow).queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    });

    // Per the `feature/user-deactivate` request ("add a user-info column
    // (Name, Resource Role)") — the "User" column shows both the entry
    // owner's name and their Resource Role on that project, resolved from
    // `Project/GetProjectAssignments` (same source `ProjectAssignmentsView`
    // uses), since `TimesheetEntry` itself carries no role field.
    it("shows the entry owner's Resource Role alongside their name in the User column", async () => {
      mockApi({
        entries: [OTHER_USER_PENDING_ENTRY],
        assignments: {
          [PROJECT_ID]: [
            { id: "a1", userId: OTHER_USER_ID, resourceRoleTypeId: "r1", resourceRoleTypeName: "Developer" },
          ],
        },
      });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      const table = await screen.findByRole("table");
      const otherUsersRow = within(table).getByText("Alex Kumar").closest("tr");
      if (!otherUsersRow) throw new Error("Could not find Alex Kumar's row");

      expect(within(otherUsersRow).getByText("Developer")).toBeInTheDocument();
    });

    it("shows a placeholder in the User column when the owner's Resource Role can't be resolved", async () => {
      mockApi({ entries: [OTHER_USER_PENDING_ENTRY] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      const table = await screen.findByRole("table");
      const otherUsersRow = within(table).getByText("Alex Kumar").closest("tr");
      if (!otherUsersRow) throw new Error("Could not find Alex Kumar's row");

      expect(within(otherUsersRow).getByText("—")).toBeInTheDocument();
    });

    // `feature/user-deactivate`: "System Admin and Project Admin cannot
    // approve or reject their own timesheet" — a manager's own still-pending,
    // unlocked entry now shows only Edit; Approve/Reject never render for it,
    // regardless of role.
    it("shows Edit but never Approve/Reject for the manager's own pending entry", async () => {
      mockApi({ entries: [PENDING_ENTRY] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
    });

    it("still allows editing the manager's own entry via Edit", async () => {
      mockApi({ entries: [PENDING_ENTRY] });
      const user = userEvent.setup();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await user.click(await screen.findByRole("button", { name: /^edit$/i }));

      expect(await screen.findByRole("button", { name: /^save$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^cancel$/i })).toBeInTheDocument();
    });

    it("shows Locked (not Edit/Approve/Reject) for the manager's own already-approved entry", async () => {
      const ownApprovedEntry = { ...PENDING_ENTRY, isApproved: true };
      mockApi({ entries: [ownApprovedEntry] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      // Even though the manager owns this entry, an already-approved entry is
      // never actionable — ownership/role gates only apply while `editable`.
      expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
      expect(screen.getByText(/^locked$/i)).toBeInTheDocument();
    });

    it("shows Locked (not Edit/Approve/Reject) for the manager's own entry whose period is locked", async () => {
      const ownLockedPeriodEntry = { ...PENDING_ENTRY, timesheetPeriodId: LOCKED_PERIOD_ID };
      mockApi({ periods: [PERIOD, LOCKED_PERIOD], entries: [ownLockedPeriodEntry] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      // Same reasoning as the already-approved case: a locked period freezes
      // the row regardless of the manager also being the entry's owner.
      expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
      expect(screen.getByText(/^locked$/i)).toBeInTheDocument();
    });

    it("approves another user's pending entry after confirming the dialog", async () => {
      mockApi({ entries: [OTHER_USER_PENDING_ENTRY] });
      (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { message: "Timesheet entry approved successfully." } });
      const user = userEvent.setup();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await user.click(await screen.findByRole("button", { name: /^approve$/i }));

      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toHaveTextContent(/alex kumar/i);

      await user.click(within(dialog).getByRole("button", { name: /^approve$/i }));

      await waitFor(() =>
        expect(apiClient.put).toHaveBeenCalledWith(`/timesheet-entries/${OTHER_USER_PENDING_ENTRY.id}/approve`)
      );
      expect(await screen.findByText(/approved successfully/i)).toBeInTheDocument();
    });

    it("shows an error and keeps the entry pending when approval fails", async () => {
      mockApi({ entries: [OTHER_USER_PENDING_ENTRY] });
      (apiClient.put as jest.Mock).mockRejectedValueOnce({
        isAxiosError: true,
        response: { data: { message: "You do not have permission to approve timesheet entries." } },
      });
      const user = userEvent.setup();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await user.click(await screen.findByRole("button", { name: /^approve$/i }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: /^approve$/i }));

      expect(await screen.findByText(/you do not have permission to approve/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^approve$/i })).toBeInTheDocument();
    });

    it("shows Locked (not Approve/Reject) for another user's pending entry whose period is locked", async () => {
      const otherUsersLockedPeriodEntry = { ...OTHER_USER_PENDING_ENTRY, timesheetPeriodId: LOCKED_PERIOD_ID };
      mockApi({ periods: [PERIOD, LOCKED_PERIOD], entries: [otherUsersLockedPeriodEntry] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
      expect(screen.getByText(/^locked$/i)).toBeInTheDocument();
    });

    it("does not show an Approve action for another user's already-approved entry", async () => {
      const approvedOtherUserEntry = { ...OTHER_USER_PENDING_ENTRY, isApproved: true };
      mockApi({ entries: [approvedOtherUserEntry] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
      expect(screen.getByText(/^locked$/i)).toBeInTheDocument();
    });

    it("does not show a Reject action for another user's already-approved entry", async () => {
      const approvedOtherUserEntry = { ...OTHER_USER_PENDING_ENTRY, isApproved: true };
      mockApi({ entries: [approvedOtherUserEntry] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
      expect(screen.getByText(/^locked$/i)).toBeInTheDocument();
    });

    it("rejects another user's pending entry after confirming the dialog", async () => {
      mockApi({ entries: [OTHER_USER_PENDING_ENTRY] });
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });
      const user = userEvent.setup();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await user.click(await screen.findByRole("button", { name: /^reject$/i }));

      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toHaveTextContent(/alex kumar/i);

      await user.click(within(dialog).getByRole("button", { name: /^reject$/i }));

      await waitFor(() =>
        expect(apiClient.delete).toHaveBeenCalledWith(`/timesheet-entries/${OTHER_USER_PENDING_ENTRY.id}`)
      );
      expect(await screen.findByText(/timesheet entry rejected/i)).toBeInTheDocument();
    });

    it("shows an error and keeps the entry pending when rejection fails", async () => {
      mockApi({ entries: [OTHER_USER_PENDING_ENTRY] });
      (apiClient.delete as jest.Mock).mockRejectedValueOnce({
        isAxiosError: true,
        response: { data: { message: "You do not have permission to reject timesheet entries." } },
      });
      const user = userEvent.setup();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await user.click(await screen.findByRole("button", { name: /^reject$/i }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: /^reject$/i }));

      expect(await screen.findByText(/you do not have permission to reject/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
    });

    it("cancelling the reject dialog does not call the API", async () => {
      mockApi({ entries: [OTHER_USER_PENDING_ENTRY] });
      const user = userEvent.setup();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await user.click(await screen.findByRole("button", { name: /^reject$/i }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(apiClient.delete).not.toHaveBeenCalled();
    });
  });

  describe("as a project-scoped manager (ProjectAdmin — 'own project (assigned user)' gate)", () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: { id: CURRENT_USER_ID, email: "pm@hrsystem.com", role: USER_ROLES.PROJECT_ADMIN },
      });
    });

    it("shows a Generate Invoice link for a ProjectAdmin too", async () => {
      mockApi({ entries: [] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      const link = await screen.findByRole("link", { name: /generate invoice/i });
      expect(link).toHaveAttribute("href", "/invoices/generate");
    });

    // API-integration requirement: a ProjectAdmin's timesheet review is
    // backed by `GetProjectAdminTimesheetSummary`, not the org-wide
    // `GetAllTimesheetEntries` a SystemAdmin uses.
    it("fetches entries via the project-admin-summary endpoint, never GetAllTimesheetEntries", async () => {
      mockApi({ entries: [PENDING_ENTRY] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      expect(apiClient.get).toHaveBeenCalledWith(
        "/timesheet-entries/project-admin-summary",
        expect.objectContaining({ params: expect.objectContaining({ projectId: undefined }) })
      );
      expect(apiClient.get).not.toHaveBeenCalledWith("/timesheet-entries", expect.anything());
    });

    it("forwards the selected Project filter as projectId to the project-admin-summary endpoint", async () => {
      mockApi({ entries: [PENDING_ENTRY] });
      const user = userEvent.setup();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");
      await user.selectOptions(screen.getByLabelText(/^project$/i), PROJECT_ID);
      await user.click(screen.getByRole("button", { name: /^filter$/i }));

      await waitFor(() =>
        expect(apiClient.get).toHaveBeenCalledWith(
          "/timesheet-entries/project-admin-summary",
          expect.objectContaining({ params: expect.objectContaining({ projectId: PROJECT_ID }) })
        )
      );
    });

    it("shows Approve/Reject for another user's pending entry on a project the ProjectAdmin is assigned to", async () => {
      mockApi({
        entries: [OTHER_USER_PENDING_ENTRY], // projectId: PROJECT_ID
        assignments: { [PROJECT_ID]: [{ id: "a1", userId: CURRENT_USER_ID, resourceRoleTypeId: "r1" }] },
      });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      expect(await screen.findByRole("button", { name: /^approve$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
    });

    it("shows Locked (no Approve/Reject) for another user's pending entry on a project the ProjectAdmin is NOT assigned to", async () => {
      mockApi({
        entries: [OTHER_USER_PENDING_ENTRY], // projectId: PROJECT_ID
        assignments: { [PROJECT_ID]: [] }, // ProjectAdmin is not an assigned resource on this project
      });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
      expect(screen.getByText(/^locked$/i)).toBeInTheDocument();
    });

    it("still shows Edit (but not Approve/Reject) for the ProjectAdmin's own pending entry on an unassigned project", async () => {
      mockApi({
        entries: [PENDING_ENTRY], // owned by CURRENT_USER_ID, projectId: PROJECT_ID
        assignments: { [PROJECT_ID]: [] },
      });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      expect(await screen.findByRole("button", { name: /^edit$/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
    });

    it("approves another user's pending entry on an assigned project after confirming the dialog", async () => {
      mockApi({
        entries: [OTHER_USER_PENDING_ENTRY],
        assignments: { [PROJECT_ID]: [{ id: "a1", userId: CURRENT_USER_ID, resourceRoleTypeId: "r1" }] },
      });
      (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { message: "Timesheet entry approved successfully." } });
      const user = userEvent.setup();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await user.click(await screen.findByRole("button", { name: /^approve$/i }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: /^approve$/i }));

      await waitFor(() =>
        expect(apiClient.put).toHaveBeenCalledWith(`/timesheet-entries/${OTHER_USER_PENDING_ENTRY.id}/approve`)
      );
    });

    it("requests assignments only for the distinct projects present in the visible entries", async () => {
      mockApi({
        entries: [OTHER_USER_PENDING_ENTRY], // projectId: PROJECT_ID
        assignments: { [PROJECT_ID]: [{ id: "a1", userId: CURRENT_USER_ID, resourceRoleTypeId: "r1" }] },
      });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      await waitFor(() =>
        expect(apiClient.get).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/assignments`)
      );
      expect(apiClient.get).not.toHaveBeenCalledWith(`/projects/${OTHER_PROJECT_ID}/assignments`);
    });

    // `feature/user-deactivate`: "For System Admin, their timesheet can only
    // be approved by other System Admins" — a ProjectAdmin is blocked even on
    // a project they're assigned to.
    it("shows Locked (no Approve/Reject) for a SystemAdmin's pending entry, even on an assigned project", async () => {
      mockApi({
        entries: [OTHER_USER_PENDING_ENTRY], // owned by OTHER_USER_ID, projectId: PROJECT_ID
        assignments: { [PROJECT_ID]: [{ id: "a1", userId: CURRENT_USER_ID, resourceRoleTypeId: "r1" }] },
        userRoles: [{ userId: OTHER_USER_ID, roleName: USER_ROLES.SYSTEM_ADMIN }],
      });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
      expect(screen.getByText(/^locked$/i)).toBeInTheDocument();
    });

    it("still shows Approve/Reject for a ProjectAdmin-owned entry on an assigned project (not a SystemAdmin's)", async () => {
      mockApi({
        entries: [OTHER_USER_PENDING_ENTRY],
        assignments: { [PROJECT_ID]: [{ id: "a1", userId: CURRENT_USER_ID, resourceRoleTypeId: "r1" }] },
        userRoles: [{ userId: OTHER_USER_ID, roleName: USER_ROLES.PROJECT_ADMIN }],
      });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      expect(await screen.findByRole("button", { name: /^approve$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
    });

    it("fetches the user-role directory for a ProjectAdmin viewer", async () => {
      mockApi({ entries: [OTHER_USER_PENDING_ENTRY] });
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await screen.findByRole("table");

      await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/timesheet-entries/user-roles"));
    });
  });

  describe("Project filter scoping", () => {
    it("loads the Project filter's options from /projects/my for a ProjectAdmin", async () => {
      useAuthStore.setState({
        user: { id: CURRENT_USER_ID, email: "pa@hrsystem.com", role: USER_ROLES.PROJECT_ADMIN },
      });
      mockApi();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/projects/my"));
      expect(apiClient.get).not.toHaveBeenCalledWith("/projects");
    });

    it("loads the Project filter's options from /projects/my for a plain Employee", async () => {
      useAuthStore.setState({
        user: { id: CURRENT_USER_ID, email: "employee@hrsystem.com", role: USER_ROLES.EMPLOYEE },
      });
      mockApi();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/projects/my"));
      expect(apiClient.get).not.toHaveBeenCalledWith("/projects");
    });

    it("loads the Project filter's options from the org-wide /projects for a SystemAdmin", async () => {
      useAuthStore.setState({
        user: { id: CURRENT_USER_ID, email: "admin@hrsystem.com", role: USER_ROLES.SYSTEM_ADMIN },
      });
      mockApi();
      renderWithClient(<TimesheetHistoryView currentUserId={CURRENT_USER_ID} />);

      await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/projects"));
      expect(apiClient.get).not.toHaveBeenCalledWith("/projects/my");
    });
  });
});
