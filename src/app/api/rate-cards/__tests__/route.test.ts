/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/timesheet-periods/__tests__/route.test.ts` for the same rationale.
 */
import { GET, POST } from "@/app/api/rate-cards/route";
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

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/rate-cards${query}`);
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/rate-cards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validCreatePayload = {
  countryId: "22222222-2222-2222-2222-222222222201",
  resourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
  currencyId: "33333333-3333-3333-3333-333333333301",
  hourlyRate: 25,
  billingRate: 75,
  effectiveDate: "2025-03-01",
  isActive: true,
};

describe("GET /api/rate-cards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not view rate cards", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "sarah@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await GET(getRequest());

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("400s on invalid query parameters", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await GET(getRequest("?countryId=not-a-guid"));

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the list, unwrapping the real backend's paginated Data.Items envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Items: [
            {
              Id: "18c16be1-9c69-454a-aa7c-5e6bd01df9bd",
              Country: { Id: "22222222-2222-2222-2222-222222222201", Code: "SG", Name: "Singapore" },
              ResourceRoleType: { Id: "44444444-4444-4444-4444-444444444401", Name: "Senior Developer" },
              Currency: { Id: "33333333-3333-3333-3333-333333333301", Code: "SGD", Symbol: "S$" },
              HourlyRate: 25,
              BillingRate: 75,
              EffectiveDate: "2025-03-01",
              IsActive: true,
            },
          ],
          TotalCount: 1,
          Page: 1,
          PageSize: 100,
        },
      },
    });

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({ id: "18c16be1-9c69-454a-aa7c-5e6bd01df9bd", hourlyRate: 25, billingRate: 75 }),
    ]);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/RateCard/GetAllRateCards",
      expect.objectContaining({
        params: { page: 1, pageSize: 100 },
        headers: { Authorization: `Bearer ${systemAdminToken}` },
      })
    );
  });

  it("forwards optional filters as query params", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Items: [] } },
    });

    await GET(getRequest("?countryId=22222222-2222-2222-2222-222222222201&isActive=true"));

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/RateCard/GetAllRateCards",
      expect.objectContaining({
        params: { page: 1, pageSize: 100, countryId: "22222222-2222-2222-2222-222222222201", isActive: true },
      })
    );
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(getRequest());

    expect(response.status).toBe(502);
  });
});

describe("POST /api/rate-cards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await POST(postRequest(validCreatePayload));

    expect(response.status).toBe(401);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage rate cards", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" })
    );

    const response = await POST(postRequest(validCreatePayload));

    expect(response.status).toBe(403);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await POST(postRequest({ ...validCreatePayload, hourlyRate: -1 }));

    expect(response.status).toBe(400);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("creates the rate card, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Rate card created.",
        Data: {
          Id: "5c5a0c0c-3663-4add-bdb9-b82bdc4e02cc",
          CountryId: "22222222-2222-2222-2222-222222222201",
          ResourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
          CurrencyId: "33333333-3333-3333-3333-333333333301",
          HourlyRate: 25,
          BillingRate: 75,
          EffectiveDate: "2025-03-01",
          IsActive: true,
          CreatedAt: "2026-06-22T08:43:41Z",
        },
      },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "5c5a0c0c-3663-4add-bdb9-b82bdc4e02cc", hourlyRate: 25, billingRate: 75 })
    );
    expect(backendApiClient.post).toHaveBeenCalledWith(
      "/RateCard/CreateRateCard",
      {
        CountryId: "22222222-2222-2222-2222-222222222201",
        ResourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
        CurrencyId: "33333333-3333-3333-3333-333333333301",
        HourlyRate: 25,
        BillingRate: 75,
        EffectiveDate: "2025-03-01",
        IsActive: true,
      },
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: "A rate card already exists for this date." } },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("A rate card already exists for this date.");
  });
});
