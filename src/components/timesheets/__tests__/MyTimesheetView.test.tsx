import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MyTimesheetView } from "@/components/timesheets/MyTimesheetView";
import { apiClient } from "@/lib/api/axiosInstance";
import { useAuthStore } from "@/stores/auth.store";
import { USER_ROLES } from "@/lib/constants/auth.constants";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// `MyTimesheetView` allows logging/editing hours for today and any past day,
// but *not* for future days (see `isCellLocked` — the `feature/currency`
// "disable only future dates" relaxation of the earlier `bugs/timesheet-history`
// "present day only" fix). Pinning `getTodayDateOnly()` to the Monday fixture
// date below keeps every existing test's "editable Monday cell" assumption
// intact regardless of the real wall-clock date the suite happens to run on,
// while still exercising the real `isCellLocked`/`isDateOnlyInRange` logic for
// every other date.
jest.mock("@/lib/utils/week", () => ({
  ...jest.requireActual("@/lib/utils/week"),
  getTodayDateOnly: () => "2025-01-06",
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// `createTimesheetEntrySchema` validates `projectId`/`timesheetPeriodId` as
// GUIDs (matching the backend contract), so fixture ids must be real
// UUID-shaped strings, not human-readable slugs — otherwise client-side
// validation would reject a "Save All" of an otherwise-valid entry.
const CURRENT_USER_ID = "3fa85f64-5717-4562-b3fc-2c963f66af01";
const PERIOD_ID = "3fa85f64-5717-4562-b3fc-2c963f66af02";
const LOCKED_PERIOD_ID = "3fa85f64-5717-4562-b3fc-2c963f66af03";
const PROJECT_ID = "3fa85f64-5717-4562-b3fc-2c963f66af04";
const MONDAY_ENTRY_ID = "3fa85f64-5717-4562-b3fc-2c963f66af05";
const APPROVED_ENTRY_ID = "3fa85f64-5717-4562-b3fc-2c963f66af06";
const TUESDAY_ENTRY_ID = "3fa85f64-5717-4562-b3fc-2c963f66af13";

// 2025-01-06 is a Monday, so the default-selected week aligns exactly with
// this period's start (see `resolveDefaultWeekStart` in MyTimesheetView).
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

const MONDAY_ENTRY = {
  id: MONDAY_ENTRY_ID,
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

// Still-pending, unlocked-period entry dated the day *after* today's mocked
// date (2025-01-06) — i.e. a future date — so it should render read-only per
// the "disable only future dates" rule (`isCellLocked`).
const TUESDAY_ENTRY = {
  id: TUESDAY_ENTRY_ID,
  userId: CURRENT_USER_ID,
  projectId: PROJECT_ID,
  projectCode: "PRJ-ALPHA",
  projectName: "Project Alpha",
  timesheetPeriodId: PERIOD_ID,
  entryDate: "2025-01-07",
  hours: 4,
  taskDescription: "Tomorrow's-view work",
  isApproved: false,
};

// A period that starts well before today's mocked date (2025-01-06), used to
// exercise a *past* week (reached via the "Previous week" control) where
// every day is an old date — per the `feature/currency` request, these
// remain fully editable rather than read-only.
const PAST_PERIOD_ID = "3fa85f64-5717-4562-b3fc-2c963f66af14";
const PAST_PERIOD = { ...PERIOD, id: PAST_PERIOD_ID, periodStart: "2024-12-01" };

const PAST_ENTRY_ID = "3fa85f64-5717-4562-b3fc-2c963f66af15";
const PAST_ENTRY = {
  id: PAST_ENTRY_ID,
  userId: CURRENT_USER_ID,
  projectId: PROJECT_ID,
  projectCode: "PRJ-ALPHA",
  projectName: "Project Alpha",
  timesheetPeriodId: PAST_PERIOD_ID,
  entryDate: "2025-01-03",
  hours: 3,
  taskDescription: "Old work",
  isApproved: false,
};

interface MockOptions {
  periods?: unknown[];
  projects?: unknown[];
  entries?: unknown[];
  /** Maps a projectId to its `ProjectAssignment[]` for `/projects/:id/assignments` (used by the assigned-projects scoping gate). Defaults to assigning the current user to every project in `projects`, matching the common case of a user logging time against their own assigned project. */
  assignments?: Record<string, unknown[]>;
}

function mockApi({
  periods = [PERIOD],
  projects = [PROJECT],
  entries = [],
  assignments,
}: MockOptions = {}) {
  const resolvedAssignments =
    assignments ??
    Object.fromEntries(
      (projects as { id: string }[]).map((project) => [
        project.id,
        [{ id: `assignment-${project.id}`, userId: CURRENT_USER_ID, resourceRoleTypeId: "role-1" }],
      ])
    );

  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/timesheet-periods") return Promise.resolve({ data: { data: periods } });
    if (url === "/projects") return Promise.resolve({ data: { data: projects } });
    if (url === "/timesheet-entries") return Promise.resolve({ data: { data: entries } });
    const assignmentsMatch = url.match(/^\/projects\/(.+)\/assignments$/);
    if (assignmentsMatch) {
      return Promise.resolve({ data: { data: resolvedAssignments[assignmentsMatch[1]] ?? [] } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("MyTimesheetView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // A plain `Employee` by default — matches every pre-existing test's
    // implicit assumption (assigned-projects scoping applies, and
    // `mockApi`'s default assignment fixture assigns the current user to
    // every mocked project).
    useAuthStore.setState({
      user: { id: CURRENT_USER_ID, email: "user@hrsystem.com", role: USER_ROLES.EMPLOYEE },
    });
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading your timesheet/i);
  });

  it("shows an error state with a retry action when loading fails", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/timesheet-periods") {
        return Promise.reject({ isAxiosError: true, response: { data: { message: "Unable to load timesheet periods." } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load timesheet periods/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows an empty state when there are no timesheet periods", async () => {
    mockApi({ periods: [] });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    expect(await screen.findByText(/no timesheet periods have been set up yet/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no active projects", async () => {
    mockApi({ projects: [{ ...PROJECT, isActive: false }] });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    expect(await screen.findByText(/no active projects available/i)).toBeInTheDocument();
  });

  it("renders the weekly grid with existing entries pre-filled", async () => {
    mockApi({ entries: [MONDAY_ENTRY] });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    expect(mondayInput).toHaveValue(6);
  });

  it("shows an info notice that today's and past dates' hours can be logged or edited, but not future dates", async () => {
    mockApi({ entries: [MONDAY_ENTRY] });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    expect(
      await screen.findByText(/you can log or edit hours for today.*and any earlier date/i)
    ).toBeInTheDocument();
  });

  it("renders a still-pending entry on a future date as read-only", async () => {
    mockApi({ entries: [TUESDAY_ENTRY] });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const tuesdayInput = await screen.findByLabelText(/Project Alpha hours on Jan 7/i);
    expect(tuesdayInput).toBeDisabled();
    expect(tuesdayInput).toHaveValue(4);
  });

  // `feature/currency`: "disable only future date[s]; enable [the] present
  // date and old dates" — a past day's cell (reached via "Previous week")
  // stays editable, unlike the historical "present day only" behavior.
  it("keeps a past date's entry editable and lets it be updated on Save All", async () => {
    mockApi({ periods: [PAST_PERIOD], entries: [PAST_ENTRY] });
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    await user.click(await screen.findByRole("button", { name: /previous week/i }));

    const fridayInput = await screen.findByLabelText(/Project Alpha hours on Jan 3/i);
    expect(fridayInput).not.toBeDisabled();
    expect(fridayInput).toHaveValue(3);

    await user.clear(fridayInput);
    await user.type(fridayInput, "5");
    await user.click(screen.getByRole("button", { name: /^save all$/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(`/timesheet-entries/${PAST_ENTRY_ID}`, {
        hours: 5,
        taskDescription: "Old work",
      })
    );
  });

  // A past day's previously-empty cell is likewise now loggable (not just
  // editable) — logging time retroactively is exactly what "enable... old
  // dates" asks for.
  it("creates a new entry for a past date's previously-empty cell on Save All", async () => {
    mockApi({ periods: [PAST_PERIOD], entries: [] });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { ...PAST_ENTRY, hours: 2 } } });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    await user.click(await screen.findByRole("button", { name: /previous week/i }));

    const fridayInput = await screen.findByLabelText(/Project Alpha hours on Jan 3/i);
    expect(fridayInput).not.toBeDisabled();
    await user.type(fridayInput, "2");

    const notesField = await screen.findByLabelText("Jan 3");
    await user.type(notesField, "Backfilled work");

    await user.click(screen.getByRole("button", { name: /^save all$/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/timesheet-entries", {
        projectId: PROJECT_ID,
        timesheetPeriodId: PAST_PERIOD_ID,
        entryDate: "2025-01-03",
        hours: 2,
        taskDescription: "Backfilled work",
      })
    );
  });

  it("does not create a new entry for a future, previously-empty cell on Save All", async () => {
    mockApi({ entries: [] });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const tuesdayInput = await screen.findByLabelText(/Project Alpha hours on Jan 7/i);
    expect(tuesdayInput).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /^save all$/i }));

    await waitFor(() => expect(screen.getByText(/nothing to save/i)).toBeInTheDocument());
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("renders an approved entry as read-only instead of an editable input", async () => {
    mockApi({ entries: [APPROVED_ENTRY] });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    await screen.findByRole("table");
    expect(screen.queryByLabelText(/Project Alpha hours on Jan 7/i)).not.toBeInTheDocument();
    // Row/daily/weekly totals also render "5h" elsewhere in the grid, so scope
    // the assertion to the approved-entry badge specifically (its `title`
    // attribute uniquely identifies it).
    expect(screen.getByTitle("Approved — locked")).toHaveTextContent("5h");
  });

  // `bugs/exchange-rate`: "if he updates it again then re-approval required
  // from PA" — an approved entry dated *today* stays editable (unlike a
  // historical approved entry, which the test above confirms is locked).
  it("keeps today's approved entry editable, with a re-approval hint, instead of locking it", async () => {
    const todaysApprovedEntry = { ...APPROVED_ENTRY, entryDate: "2025-01-06" };
    mockApi({ entries: [todaysApprovedEntry] });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    expect(mondayInput).not.toBeDisabled();
    expect(mondayInput).toHaveValue(5);
    expect(screen.getByText(/editing requires re-approval/i)).toBeInTheDocument();
  });

  it("updates today's already-approved entry on Save All and surfaces a re-approval notice", async () => {
    const todaysApprovedEntry = { ...APPROVED_ENTRY, entryDate: "2025-01-06" };
    mockApi({ entries: [todaysApprovedEntry] });
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    await user.clear(mondayInput);
    await user.type(mondayInput, "7");
    await user.click(screen.getByRole("button", { name: /^save all$/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(`/timesheet-entries/${APPROVED_ENTRY_ID}`, {
        hours: 7,
        taskDescription: "Approved work",
      })
    );
    expect(await screen.findByText(/now requires re-approval/i)).toBeInTheDocument();
  });

  // `bugs/exchange-rate`: "ProjectAdmin: PA should be able to [log] his own
  // assigned project's timesheet... total hours will be counted based on the
  // assigned projects".
  it("hides a project the current user is not assigned to, for a ProjectAdmin", async () => {
    useAuthStore.setState({
      user: { id: CURRENT_USER_ID, email: "pa@hrsystem.com", role: USER_ROLES.PROJECT_ADMIN },
    });
    mockApi({ entries: [], assignments: { [PROJECT_ID]: [] } });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    expect(
      await screen.findByText(/not assigned to any active projects/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  });

  it("shows an assigned project's grid for a ProjectAdmin scoped to their own assignments", async () => {
    useAuthStore.setState({
      user: { id: CURRENT_USER_ID, email: "pa@hrsystem.com", role: USER_ROLES.PROJECT_ADMIN },
    });
    mockApi({ entries: [MONDAY_ENTRY], assignments: { [PROJECT_ID]: [{ id: "a1", userId: CURRENT_USER_ID, resourceRoleTypeId: "r1" }] } });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    expect(await screen.findByText("Project Alpha")).toBeInTheDocument();
  });

  it("does not scope to assigned projects for a SystemAdmin, even without an assignment", async () => {
    useAuthStore.setState({
      user: { id: CURRENT_USER_ID, email: "admin@hrsystem.com", role: USER_ROLES.SYSTEM_ADMIN },
    });
    mockApi({ entries: [], assignments: { [PROJECT_ID]: [] } });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    expect(await screen.findByText("Project Alpha")).toBeInTheDocument();
  });

  it("disables editing and shows a notice when the selected period is locked", async () => {
    mockApi({ periods: [LOCKED_PERIOD], entries: [{ ...MONDAY_ENTRY, timesheetPeriodId: LOCKED_PERIOD_ID }] });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    expect(await screen.findByText(/this timesheet period is locked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save all/i })).toBeDisabled();
    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    expect(mondayInput).toBeDisabled();
  });

  it("automatically opens the task-notes panel once hours are entered", async () => {
    mockApi({ entries: [] });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    // Not expanded yet — the notes field for Monday isn't in the document.
    expect(screen.queryByLabelText("Jan 6")).not.toBeInTheDocument();

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    await user.type(mondayInput, "8");

    // Typing hours should reveal the description field without a manual click
    // on the info-icon toggle — see the `bugs/timesheet-history` feature
    // request ("when change the hour then open for description").
    expect(await screen.findByLabelText("Jan 6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hide task notes for project alpha/i })).toBeInTheDocument();
  });

  it("creates a new entry for a previously-empty cell on Save All", async () => {
    mockApi({ entries: [] });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { ...MONDAY_ENTRY, hours: 8 } } });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    await user.type(mondayInput, "8");

    // The task-notes panel now auto-opens as soon as hours are entered (see the
    // dedicated test above), so no manual click on the info-icon toggle is needed.
    const notesField = await screen.findByLabelText("Jan 6");
    await user.type(notesField, "New feature work");

    await user.click(screen.getByRole("button", { name: /^save all$/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/timesheet-entries", {
        projectId: PROJECT_ID,
        timesheetPeriodId: PERIOD_ID,
        entryDate: "2025-01-06",
        hours: 8,
        taskDescription: "New feature work",
      })
    );
  });

  // Regression test: the "Timesheet saved successfully" banner used to be
  // cleared on the very next render after a successful "Save All", because
  // each mutation's `onSuccess` invalidates the `timesheet-entries` query
  // (see `useCreateTimesheetEntry` etc.), and the resulting refetch — once it
  // actually reflects the newly-persisted entry, unlike the other tests'
  // static `mockApi` fixtures — changes `draftsSignature`, which used to
  // unconditionally clear `saveSuccess`/`saveError`. This mocks
  // `apiClient.get("/timesheet-entries")` to return the freshly-created entry
  // after the `POST` resolves, so the invalidation-triggered refetch behaves
  // like the real backend, and asserts the banner survives it.
  it("keeps the success banner visible after Save All's background entries refetch resolves", async () => {
    let currentEntries: unknown[] = [];
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/timesheet-periods") return Promise.resolve({ data: { data: [PERIOD] } });
      if (url === "/projects") return Promise.resolve({ data: { data: [PROJECT] } });
      if (url === "/timesheet-entries") return Promise.resolve({ data: { data: currentEntries } });
      const assignmentsMatch = url.match(/^\/projects\/(.+)\/assignments$/);
      if (assignmentsMatch) {
        return Promise.resolve({
          data: { data: [{ id: "assignment-1", userId: CURRENT_USER_ID, resourceRoleTypeId: "role-1" }] },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const savedEntry = { ...MONDAY_ENTRY, hours: 8, taskDescription: "New feature work" };
    (apiClient.post as jest.Mock).mockImplementation(() => {
      currentEntries = [savedEntry];
      return Promise.resolve({ data: { data: savedEntry } });
    });

    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    await user.type(mondayInput, "8");
    const notesField = await screen.findByLabelText("Jan 6");
    await user.type(notesField, "New feature work");
    await user.click(screen.getByRole("button", { name: /^save all$/i }));

    expect(await screen.findByText(/timesheet saved successfully/i)).toBeInTheDocument();

    // Wait for the invalidation-triggered background refetch of
    // `/timesheet-entries` (the second call — the first was the initial load)
    // to actually happen before asserting the banner is still there.
    await waitFor(() => {
      const entryFetches = (apiClient.get as jest.Mock).mock.calls.filter(([url]) => url === "/timesheet-entries");
      expect(entryFetches.length).toBeGreaterThanOrEqual(2);
    });

    expect(screen.getByText(/timesheet saved successfully/i)).toBeInTheDocument();
  });

  // Regression probe for `preserveSaveMessage`: the guard is a one-shot flag
  // set right before the save banner is shown, then consumed by *whatever*
  // drafts-resync happens next — it doesn't check that the resync was
  // actually caused by the save's own background refetch. If the user
  // switches to a different period while a slow "Save All" is still in
  // flight (nothing but the Save button itself is disabled during `isSaving`
  // — the period `<select>` is not), the resync triggered by *that* period
  // switch consumes the guard instead, and the stale "saved successfully"
  // banner then survives into the newly-selected period's view once the
  // save's mutation/invalidation eventually resolves.
  it("does not leak a stale success banner into a different period selected while Save All is still in flight", async () => {
    const PERIOD2_ID = "3fa85f64-5717-4562-b3fc-2c963f66af20";
    const PERIOD2 = { ...PERIOD, id: PERIOD2_ID };
    let resolvePost: (() => void) | null = null;

    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/timesheet-periods") return Promise.resolve({ data: { data: [PERIOD, PERIOD2] } });
      if (url === "/projects") return Promise.resolve({ data: { data: [PROJECT] } });
      if (url === "/timesheet-entries") return Promise.resolve({ data: { data: [] } });
      const assignmentsMatch = url.match(/^\/projects\/(.+)\/assignments$/);
      if (assignmentsMatch) {
        return Promise.resolve({
          data: { data: [{ id: "assignment-1", userId: CURRENT_USER_ID, resourceRoleTypeId: "role-1" }] },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    (apiClient.post as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = () => resolve({ data: { data: { ...MONDAY_ENTRY, hours: 8 } } });
        })
    );

    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    await user.type(mondayInput, "8");
    const notesField = await screen.findByLabelText("Jan 6");
    await user.type(notesField, "New feature work");
    await user.click(screen.getByRole("button", { name: /^save all$/i }));

    // Save is now in flight (POST unresolved). Switch to the other period
    // before it resolves — nothing prevents this today.
    const periodSelect = screen.getByLabelText(/timesheet period/i);
    await user.selectOptions(periodSelect, PERIOD2_ID);
    expect(screen.queryByText(/timesheet saved successfully/i)).not.toBeInTheDocument();

    // Now let the original save actually resolve.
    resolvePost?.();

    // Give the mutation's `onSuccess`/invalidation + refetch a chance to run.
    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));

    // The user is still looking at PERIOD2 — the success banner from the
    // save against PERIOD should not appear here.
    expect(screen.queryByText(/timesheet saved successfully/i)).not.toBeInTheDocument();
  });

  it("blocks Save All and shows a field error when hours are entered without a task description", async () => {
    mockApi({ entries: [] });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    await user.type(mondayInput, "8");
    await user.click(screen.getByRole("button", { name: /^save all$/i }));

    expect(await screen.findByText(/please correct the highlighted entries/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("updates an existing entry when its hours change on Save All", async () => {
    mockApi({ entries: [MONDAY_ENTRY] });
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    await user.clear(mondayInput);
    await user.type(mondayInput, "7");
    await user.click(screen.getByRole("button", { name: /^save all$/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(`/timesheet-entries/${MONDAY_ENTRY_ID}`, {
        hours: 7,
        taskDescription: "Existing work",
      })
    );
  });

  it("deletes an existing entry when its hours are cleared on Save All", async () => {
    mockApi({ entries: [MONDAY_ENTRY] });
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    await user.clear(mondayInput);
    await user.click(screen.getByRole("button", { name: /^save all$/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith(`/timesheet-entries/${MONDAY_ENTRY_ID}`));
  });

  // Edge case: `isCellLocked` no longer treats an approved *today* entry as
  // locked (see the re-approval tests above), so clearing its hours to empty
  // queues a "delete" operation exactly like any other cleared cell. The
  // backend's `DELETE /api/timesheet-entries/[id]` route still rejects
  // deleting an approved entry (409 "Approved timesheet entries cannot be
  // deleted."), so this should surface as a save failure rather than
  // silently succeeding or crashing.
  // `bugs/paginations`: "add pagination UI to all tables where pagination is
  // currently missing... My Timesheet" — the weekly grid's project rows are
  // paginated client-side once a user is assigned to more projects than fit
  // on one page, matching every other reference-data table's convention
  // (`components/ui/TablePagination.tsx`).
  it("paginates the weekly grid's project rows, keeping the daily total across every assigned project regardless of the visible page", async () => {
    const manyProjects = Array.from({ length: 21 }, (_, index) => ({
      ...PROJECT,
      id: `project-${index}`,
      code: `PRJ-${index}`,
      name: `Project ${index}`,
    }));
    const entries = manyProjects.map((project, index) => ({
      ...MONDAY_ENTRY,
      id: `entry-${index}`,
      projectId: project.id,
      hours: 1,
    }));
    mockApi({ projects: manyProjects, entries });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    await screen.findByText("Project 0");
    expect(screen.queryByText("Project 20")).not.toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /my timesheets projects pagination/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    // Monday's daily total reflects all 21 assigned projects (21h), not just
    // the 20 visible on this page.
    expect(screen.getAllByText("21h").length).toBeGreaterThan(0);

    const paginationNav = screen.getByRole("navigation", { name: /my timesheets projects pagination/i });
    await user.click(within(paginationNav).getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Project 20")).toBeInTheDocument();
    expect(screen.queryByText("Project 0")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("surfaces a failure (rather than silently succeeding) when clearing today's already-approved entry, since deleting an approved entry is still rejected server-side", async () => {
    const todaysApprovedEntry = { ...APPROVED_ENTRY, entryDate: "2025-01-06" };
    mockApi({ entries: [todaysApprovedEntry] });
    (apiClient.delete as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Approved timesheet entries cannot be deleted." } },
    });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    await user.clear(mondayInput);
    await user.click(screen.getByRole("button", { name: /^save all$/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith(`/timesheet-entries/${APPROVED_ENTRY_ID}`));
    expect(await screen.findByText(/entry failed to save/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be deleted/i)).toBeInTheDocument();
  });
});
