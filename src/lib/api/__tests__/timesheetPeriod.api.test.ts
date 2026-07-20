import { apiClient } from "@/lib/api/axiosInstance";
import {
  createTimesheetPeriodRequest,
  deleteTimesheetPeriodRequest,
  getTimesheetPeriodListRequest,
  getTimesheetPeriodRequest,
  lockTimesheetPeriodRequest,
  unlockTimesheetPeriodRequest,
} from "@/lib/api/timesheetPeriod.api";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const TIMESHEET_PERIOD = {
  id: "a516eb81-806c-489d-a2a8-be63e1e3e1d8",
  periodStart: "2025-01-01",
  periodEnd: "2025-02-16",
  isLocked: false,
  lockedAt: null,
  lockedBy: null,
  createdAt: "2026-06-22T01:19:18",
  updatedAt: null,
};

describe("timesheetPeriod.api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getTimesheetPeriodListRequest fetches and unwraps the period list", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [TIMESHEET_PERIOD] } });

    const result = await getTimesheetPeriodListRequest();

    expect(apiClient.get).toHaveBeenCalledWith("/timesheet-periods", { params: undefined });
    expect(result).toEqual([TIMESHEET_PERIOD]);
  });

  it("getTimesheetPeriodListRequest forwards filters as query params", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [] } });

    await getTimesheetPeriodListRequest({ isLocked: true, year: 2025, month: 1 });

    expect(apiClient.get).toHaveBeenCalledWith("/timesheet-periods", {
      params: { isLocked: true, year: 2025, month: 1 },
    });
  });

  it("getTimesheetPeriodRequest fetches a single period by id", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: TIMESHEET_PERIOD } });

    const result = await getTimesheetPeriodRequest("a516eb81-806c-489d-a2a8-be63e1e3e1d8");

    expect(apiClient.get).toHaveBeenCalledWith(
      "/timesheet-periods/a516eb81-806c-489d-a2a8-be63e1e3e1d8"
    );
    expect(result).toEqual(TIMESHEET_PERIOD);
  });

  it("createTimesheetPeriodRequest posts the payload and returns the created period", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: TIMESHEET_PERIOD } });

    const payload = { periodStart: "2025-01-01", periodEnd: "2025-02-16" };
    const result = await createTimesheetPeriodRequest(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/timesheet-periods", payload);
    expect(result).toEqual(TIMESHEET_PERIOD);
  });

  it("lockTimesheetPeriodRequest puts to the period's lock endpoint", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });

    await lockTimesheetPeriodRequest("1");

    expect(apiClient.put).toHaveBeenCalledWith("/timesheet-periods/1/lock");
  });

  it("unlockTimesheetPeriodRequest puts to the period's unlock endpoint", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });

    await unlockTimesheetPeriodRequest("1");

    expect(apiClient.put).toHaveBeenCalledWith("/timesheet-periods/1/unlock");
  });

  it("deleteTimesheetPeriodRequest deletes the period by id", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    await deleteTimesheetPeriodRequest("1");

    expect(apiClient.delete).toHaveBeenCalledWith("/timesheet-periods/1");
  });
});
