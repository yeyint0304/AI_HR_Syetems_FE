/**
 * @jest-environment node
 */
import { GET } from "@/app/api/reports/cost-revenue/route";
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

function base64Url(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildToken(claims: Record<string, unknown>): string {
  return [base64Url(JSON.stringify({ alg: "none", typ: "JWT" })), base64Url(JSON.stringify(claims)), "sig"].join(".");
}

const userToken = buildToken({ sub: "u1", email: "user@hrsystem.com", role: "User" });
const systemAdminToken = buildToken({ sub: "sa1", email: "sa@hrsystem.com", role: "SystemAdmin" });

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/reports/cost-revenue${query}`);
}

const successEnvelope = {
  StatusCode: 200,
  IsSuccess: true,
  Message: "Success",
  Data: { Year: 2026, Month: 7, Projects: [] },
};

describe("GET /api/reports/cost-revenue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(getRequest("?year=2026&month=7"));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s for a plain User", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(getRequest("?year=2026&month=7"));

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("400s on a missing year/month, even for an authorized role", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await GET(getRequest());

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("400s on an out-of-range month", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await GET(getRequest("?year=2026&month=13"));

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("allows a SystemAdmin and returns the mapped report", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: successEnvelope });

    const response = await GET(getRequest("?year=2026&month=7"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(expect.objectContaining({ year: 2026, month: 7 }));
  });

  it("hides the backend's raw message for a 5xx logical failure at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 500, IsSuccess: false, Message: "System.Exception internal detail", Data: null },
    });

    const response = await GET(getRequest("?year=2026&month=7"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to generate the cost & revenue report.");
  });

  it("returns a 502 fallback when the backend call itself throws", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(getRequest("?year=2026&month=7"));

    expect(response.status).toBe(502);
  });
});
