/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/currencies/route";
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

/** Builds an unsigned JWT carrying the given claims (payload-decoding only — see `lib/utils/jwt.ts`). */
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
  return new Request("http://localhost/api/currencies", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validCreatePayload = {
  code: "MMK",
  name: "Myanmar Kyats",
  symbol: "MMK",
  isBaseCurrency: false,
  isActive: true,
};

describe("GET /api/currencies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the currency list for any authenticated user, unwrapping the backend's Data.Items envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Items: [
            {
              Id: "33333333-3333-3333-3333-333333333301",
              Code: "SGD",
              Name: "Singapore Dollar",
              Symbol: "S$",
              IsBaseCurrency: true,
              IsActive: true,
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
      {
        id: "33333333-3333-3333-3333-333333333301",
        code: "SGD",
        name: "Singapore Dollar",
        symbol: "S$",
        isBaseCurrency: true,
        isActive: true,
      },
    ]);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Currency/GetAllCurrencies",
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

describe("POST /api/currencies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await POST(postRequest(validCreatePayload));

    expect(response.status).toBe(401);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage currencies", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "sarah@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await POST(postRequest(validCreatePayload));

    expect(response.status).toBe(403);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await POST(postRequest({ ...validCreatePayload, code: "not-a-code" }));

    expect(response.status).toBe(400);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("creates the currency, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Currency created.",
        Data: {
          Id: "c21c601f-af98-4c87-a7b7-f2015e80ffd3",
          Code: "MMK",
          Name: "Myanmar Kyats",
          Symbol: "MMK",
          IsBaseCurrency: false,
          IsActive: true,
          CreatedAt: "2026-06-23T13:20:30Z",
        },
      },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "c21c601f-af98-4c87-a7b7-f2015e80ffd3", code: "MMK" })
    );
    expect(backendApiClient.post).toHaveBeenCalledWith(
      "/Currency/CreateCurrency",
      { Code: "MMK", Name: "Myanmar Kyats", Symbol: "MMK", IsBaseCurrency: false, IsActive: true },
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: "Currency code already exists." } },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Currency code already exists.");
  });
});
