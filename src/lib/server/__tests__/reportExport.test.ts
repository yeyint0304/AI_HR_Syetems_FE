/**
 * @jest-environment node
 *
 * `fetchReportExport` is imported (indirectly, via each `/export` Route
 * Handler) into Node-runtime Route Handlers, not jsdom — same rationale as
 * `app/api/timesheet-entries/__tests__/route.test.ts`.
 */
import { fetchReportExport } from "@/lib/server/reportExport";
import { backendApiClient } from "@/lib/server/backendApiClient";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn() },
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe("fetchReportExport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseOptions = {
    backendPath: "/Report/ExportTimesheetReport",
    params: { startDate: "2026-07-01", endDate: "2026-07-20" },
    accessToken: "token-123",
    format: "xlsx" as const,
    filename: "timesheet-report_2026-07-01_to_2026-07-20.xlsx",
    fallbackMessage: "Unable to export the timesheet report. Please try again.",
  };

  it("streams back the binary body with the correct Content-Type/Content-Disposition", async () => {
    const bytes = new TextEncoder().encode("fake-xlsx-bytes").buffer;
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: bytes });

    const response = await fetchReportExport(baseOptions);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      `attachment; filename="${baseOptions.filename}"`
    );
    expect(backendApiClient.get).toHaveBeenCalledWith(baseOptions.backendPath, {
      params: baseOptions.params,
      headers: { Authorization: `Bearer ${baseOptions.accessToken}` },
      responseType: "arraybuffer",
    });
  });

  it("uses the csv Content-Type when format is csv", async () => {
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: new ArrayBuffer(0) });

    const response = await fetchReportExport({ ...baseOptions, format: "csv", filename: "report.csv" });

    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
  });

  it("escapes double quotes in the filename", async () => {
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: new ArrayBuffer(0) });

    const response = await fetchReportExport({ ...baseOptions, filename: 'weird"name.xlsx' });

    expect(response.headers.get("Content-Disposition")).toBe(`attachment; filename="weird'name.xlsx"`);
  });

  it("forwards the backend's decoded JSON message for a 4xx failure", async () => {
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: Buffer.from(JSON.stringify({ Message: "startDate must be on or before endDate." }), "utf-8"),
      },
    });

    const response = await fetchReportExport(baseOptions);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("startDate must be on or before endDate.");
  });

  it("hides the raw backend message and returns a 502 fallback for a 5xx failure", async () => {
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 500,
        data: Buffer.from(JSON.stringify({ Message: "System.Exception: stack trace leak" }), "utf-8"),
      },
    });

    const response = await fetchReportExport(baseOptions);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe(baseOptions.fallbackMessage);
    expect(body.message).not.toMatch(/System.Exception/);
  });

  it("falls back to the generic message when the error body is not JSON", async () => {
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 400, data: Buffer.from("not json", "utf-8") },
    });

    const response = await fetchReportExport(baseOptions);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe(baseOptions.fallbackMessage);
  });

  it("returns a generic 500 when the error is not an axios error at all", async () => {
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce(new Error("boom"));

    const response = await fetchReportExport(baseOptions);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe(baseOptions.fallbackMessage);
  });
});
