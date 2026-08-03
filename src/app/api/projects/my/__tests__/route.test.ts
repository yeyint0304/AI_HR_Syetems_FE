/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/timesheet-entries/__tests__/route.test.ts` for the same rationale.
 */
import { GET } from "@/app/api/projects/my/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const successEnvelope = {
  StatusCode: 200,
  IsSuccess: true,
  Message: "Success",
  Data: [
    {
      Id: "17342891-4f2f-433b-a814-03f64b4f0df3",
      Code: "D3SG001",
      Name: "Straight Through Processing Enhancement Phase 1",
      Description: "to streamline the manual process",
      ClientName: "Tokio Marine",
      ClientEmail: "tokiomarine-life.sg",
      StartDate: "2026-03-08",
      EndDate: "2026-06-08",
      MaxDailyHours: null,
      IsActive: true,
    },
  ],
};

describe("GET /api/projects/my", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("calls Project/GetMyProjectList with the caller's bearer token", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("token-123");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: successEnvelope });

    await GET();

    expect(backendApiClient.get).toHaveBeenCalledWith("/Project/GetMyProjectList", {
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("returns the mapped, scoped project list", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("token-123");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: successEnvelope });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({ id: "17342891-4f2f-433b-a814-03f64b4f0df3", code: "D3SG001" }),
    ]);
  });

  it("returns a normalized error when the backend call fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("token-123");
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET();

    expect(response.status).toBe(502);
  });
});
