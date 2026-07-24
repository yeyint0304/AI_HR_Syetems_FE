/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/timesheet-periods/__tests__/route.test.ts` for the same rationale.
 */
import { GET, POST } from "@/app/api/exchange-rates/route";
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
  return new Request("http://localhost/api/exchange-rates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validCreatePayload = {
  fromCurrencyId: "33333333-3333-3333-3333-333333333301",
  toCurrencyId: "33333333-3333-3333-3333-333333333302",
  rate: 1.25,
  effectiveDate: "2026-06-22",
  isActive: true,
};

describe("GET /api/exchange-rates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not view exchange rates", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "sarah@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await GET();

    expect(response.status).toBe(403);
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
              Id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
              FromCurrency: { Id: "33333333-3333-3333-3333-333333333301", Code: "SGD", Symbol: "S$" },
              ToCurrency: { Id: "33333333-3333-3333-3333-333333333302", Code: "USD", Symbol: "$" },
              Rate: 1.25,
              EffectiveDate: "2026-06-22",
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
      expect.objectContaining({ id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c", rate: 1.25 }),
    ]);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/ExchangeRate/GetAllExchangeRates",
      expect.objectContaining({
        params: { isActive: true, page: 1, pageSize: 100 },
        headers: { Authorization: `Bearer ${systemAdminToken}` },
      })
    );
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET();

    expect(response.status).toBe(502);
  });
});

describe("POST /api/exchange-rates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await POST(postRequest(validCreatePayload));

    expect(response.status).toBe(401);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage exchange rates", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" })
    );

    const response = await POST(postRequest(validCreatePayload));

    expect(response.status).toBe(403);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await POST(
      postRequest({ ...validCreatePayload, toCurrencyId: validCreatePayload.fromCurrencyId })
    );

    expect(response.status).toBe(400);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("creates the exchange rate, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Exchange rate created.",
        Data: {
          Id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
          FromCurrencyId: "33333333-3333-3333-3333-333333333301",
          ToCurrencyId: "33333333-3333-3333-3333-333333333302",
          Rate: 1.25,
          EffectiveDate: "2026-06-22",
          IsActive: true,
          CreatedAt: "2026-06-22T12:44:01Z",
        },
      },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c", rate: 1.25 })
    );
    expect(backendApiClient.post).toHaveBeenCalledWith(
      "/ExchangeRate/CreateExchangeRate",
      {
        FromCurrencyId: "33333333-3333-3333-3333-333333333301",
        ToCurrencyId: "33333333-3333-3333-3333-333333333302",
        Rate: 1.25,
        EffectiveDate: "2026-06-22",
        IsActive: true,
      },
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: "An exchange rate already exists for this date." } },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("An exchange rate already exists for this date.");
  });
});
