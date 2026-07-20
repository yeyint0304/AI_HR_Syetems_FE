import { apiClient } from "@/lib/api/axiosInstance";
import {
  createTimesheetEntryRequest,
  deleteTimesheetEntryRequest,
  getTimesheetEntryListRequest,
  getTimesheetEntryRequest,
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
});
