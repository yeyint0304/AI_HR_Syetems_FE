/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/countries/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function base64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildToken(claims: Record<string, unknown>): string {
  return [base64Url(JSON.stringify({ alg: "none", typ: "JWT" })), base64Url(JSON.stringify(claims)), "sig"].join(
    "."
  );
}

const systemAdminToken = buildToken({
  sub: "user-1",
  email: "admin@hrsystem.com",
  role: "SystemAdmin",
});

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/countries", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validCreatePayload = { code: "MY", name: "Malaysia" };

describe("GET /api/countries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the country list for any authenticated user, unwrapping the backend's Data.Items envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Items: [
            {
              Id: "22222222-2222-2222-2222-222222222201",
              Code: "SG",
              Name: "Singapore",
              CreatedAt: "2026-06-11T10:14:31Z",
            },
          ],
          TotalCount: 1,
          Page: 1,
          PageSize: 100,
        },
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      { id: "22222222-2222-2222-2222-222222222201", code: "SG", name: "Singapore" },
    ]);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Country/GetAllCountries",
      expect.objectContaining({ params: { page: 1, pageSize: 100 } })
    );
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET();

    expect(response.status).toBe(502);
  });
});

describe("POST /api/countries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await POST(postRequest(validCreatePayload));

    expect(response.status).toBe(401);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage countries", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "sarah@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await POST(postRequest(validCreatePayload));

    expect(response.status).toBe(403);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await POST(postRequest({ ...validCreatePayload, code: "MYS" }));

    expect(response.status).toBe(400);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("creates the country, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Country created.",
        Data: {
          Id: "22222222-2222-2222-2222-222222222203",
          Code: "MY",
          Name: "Malaysia",
          CreatedAt: "2026-06-23T13:02:45Z",
        },
      },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "22222222-2222-2222-2222-222222222203", code: "MY" })
    );
    expect(backendApiClient.post).toHaveBeenCalledWith(
      "/Country/CreateCountry",
      { Code: "MY", Name: "Malaysia" },
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: "Country code already exists." } },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Country code already exists.");
  });
});
