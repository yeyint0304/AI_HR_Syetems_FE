import { apiClient } from "@/lib/api/axiosInstance";
import {
  approveTimesheetEntryRequest,
  createTimesheetEntryRequest,
  deleteTimesheetEntryRequest,
  getProjectAdminTimesheetSummaryRequest,
  getTimesheetEntryListRequest,
  getTimesheetEntryPageRequest,
  getTimesheetEntryRequest,
  rejectTimesheetEntryRequest,
  updateTimesheetEntryRequest,
} from "@/lib/api/timesheetEntry.api";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const TIMESHEET_ENTRY = {
  id: "b365fa4d-6a30-4c5b-ae33-6161d9f81328",
  userId: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
  projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
  timesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
  entryDate: "2025-03-01",
  hours: 10,
  taskDescription: "Worked on feature implementation",
  isApproved: false,
};

describe("timesheetEntry.api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getTimesheetEntryListRequest fetches and unwraps the entry list", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [TIMESHEET_ENTRY] } });

    const result = await getTimesheetEntryListRequest();

    expect(apiClient.get).toHaveBeenCalledWith("/timesheet-entries", { params: undefined });
    expect(result).toEqual([TIMESHEET_ENTRY]);
  });

  it("getTimesheetEntryListRequest forwards filters as query params", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [] } });

    await getTimesheetEntryListRequest({ userId: "user-1", timesheetPeriodId: "period-1" });

    expect(apiClient.get).toHaveBeenCalledWith("/timesheet-entries", {
      params: { userId: "user-1", timesheetPeriodId: "period-1" },
    });
  });

  // `feature/timesheets-pagination`
  it("getTimesheetEntryPageRequest fetches a page and normalizes the pagination metadata", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { data: [TIMESHEET_ENTRY], totalCount: 7, page: 1, pageSize: 20, totalPages: 1 },
    });

    const result = await getTimesheetEntryPageRequest({ userId: "user-1", page: 1, pageSize: 20 });

    expect(apiClient.get).toHaveBeenCalledWith("/timesheet-entries", {
      params: { userId: "user-1", page: 1, pageSize: 20 },
    });
    expect(result).toEqual({
      items: [TIMESHEET_ENTRY],
      totalCount: 7,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });

  it("getTimesheetEntryRequest fetches a single entry by id", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: TIMESHEET_ENTRY } });

    const result = await getTimesheetEntryRequest(TIMESHEET_ENTRY.id);

    expect(apiClient.get).toHaveBeenCalledWith(`/timesheet-entries/${TIMESHEET_ENTRY.id}`);
    expect(result).toEqual(TIMESHEET_ENTRY);
  });

  it("createTimesheetEntryRequest posts the payload and returns the created entry", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: TIMESHEET_ENTRY } });

    const payload = {
      projectId: TIMESHEET_ENTRY.projectId,
      timesheetPeriodId: TIMESHEET_ENTRY.timesheetPeriodId,
      entryDate: TIMESHEET_ENTRY.entryDate,
      hours: TIMESHEET_ENTRY.hours,
      taskDescription: TIMESHEET_ENTRY.taskDescription,
    };
    const result = await createTimesheetEntryRequest(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/timesheet-entries", payload);
    expect(result).toEqual(TIMESHEET_ENTRY);
  });

  it("updateTimesheetEntryRequest puts the payload to the entry's endpoint", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });

    await updateTimesheetEntryRequest("1", { hours: 6, taskDescription: "Updated task description" });

    expect(apiClient.put).toHaveBeenCalledWith("/timesheet-entries/1", {
      hours: 6,
      taskDescription: "Updated task description",
    });
  });

  it("deleteTimesheetEntryRequest deletes the entry by id", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    await deleteTimesheetEntryRequest("1");

    expect(apiClient.delete).toHaveBeenCalledWith("/timesheet-entries/1");
  });

  it("approveTimesheetEntryRequest puts to the entry's approve endpoint", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });

    await approveTimesheetEntryRequest("1");

    expect(apiClient.put).toHaveBeenCalledWith("/timesheet-entries/1/approve");
  });

  it("rejectTimesheetEntryRequest deletes the entry by id (no dedicated reject endpoint)", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    await rejectTimesheetEntryRequest("1");

    expect(apiClient.delete).toHaveBeenCalledWith("/timesheet-entries/1");
  });

  it("getProjectAdminTimesheetSummaryRequest fetches and unwraps the summary", async () => {
    const summary = {
      totalHours: 40,
      approvedHours: 20,
      pendingHours: 20,
      projectSummaries: [],
      entries: [],
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: summary } });

    const result = await getProjectAdminTimesheetSummaryRequest({ projectId: "project-1" });

    expect(apiClient.get).toHaveBeenCalledWith("/timesheet-entries/project-admin-summary", {
      params: { projectId: "project-1" },
    });
    expect(result).toEqual(summary);
  });

  it("getProjectAdminTimesheetSummaryRequest forwards no params when filters are omitted", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { data: { totalHours: 0, approvedHours: 0, pendingHours: 0, projectSummaries: [], entries: [] } },
    });

    await getProjectAdminTimesheetSummaryRequest();

    expect(apiClient.get).toHaveBeenCalledWith("/timesheet-entries/project-admin-summary", {
      params: undefined,
    });
  });
});
