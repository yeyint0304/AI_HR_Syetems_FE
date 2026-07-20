import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MyTimesheetView } from "@/components/timesheets/MyTimesheetView";
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

interface MockOptions {
  periods?: unknown[];
  projects?: unknown[];
  entries?: unknown[];
}

function mockApi({ periods = [PERIOD], projects = [PROJECT], entries = [] }: MockOptions = {}) {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === "/timesheet-periods") return Promise.resolve({ data: { data: periods } });
    if (url === "/projects") return Promise.resolve({ data: { data: projects } });
    if (url === "/timesheet-entries") return Promise.resolve({ data: { data: entries } });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("MyTimesheetView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("disables editing and shows a notice when the selected period is locked", async () => {
    mockApi({ periods: [LOCKED_PERIOD], entries: [{ ...MONDAY_ENTRY, timesheetPeriodId: LOCKED_PERIOD_ID }] });
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    expect(await screen.findByText(/this timesheet period is locked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save all/i })).toBeDisabled();
    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    expect(mondayInput).toBeDisabled();
  });

  it("creates a new entry for a previously-empty cell on Save All", async () => {
    mockApi({ entries: [] });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { ...MONDAY_ENTRY, hours: 8 } } });
    const user = userEvent.setup();
    renderWithClient(<MyTimesheetView currentUserId={CURRENT_USER_ID} />);

    const mondayInput = await screen.findByLabelText(/Project Alpha hours on Jan 6/i);
    await user.type(mondayInput, "8");

    await user.click(screen.getByRole("button", { name: /show task notes for project alpha/i }));
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
});
