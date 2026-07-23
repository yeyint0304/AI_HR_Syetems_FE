/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/projects/[id]/__tests__/route.test.ts` for the same rationale.
 */
import { DELETE, PUT } from "@/app/api/rate-cards/[id]/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { logger } from "@/lib/utils/logger";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { put: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

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

function putRequest(body: unknown): Request {
  return new Request("http://localhost/api/rate-cards/1", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const validUpdatePayload = { hourlyRate: 30, billingRate: 80, effectiveDate: "2025-04-01", isActive: true };

describe("PUT /api/rate-cards/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage rate cards", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "sarah@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await PUT(putRequest({ ...validUpdatePayload, hourlyRate: -1 }), routeParams("1"));

    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("updates the rate card, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Rate card updated.",
        Data: {
          Id: "18c16be1-9c69-454a-aa7c-5e6bd01df9bd",
          CountryId: "22222222-2222-2222-2222-222222222201",
          ResourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
          CurrencyId: "33333333-3333-3333-3333-333333333301",
          HourlyRate: 30,
          BillingRate: 80,
          EffectiveDate: "2025-04-01",
          IsActive: true,
          UpdatedAt: "2026-06-22T14:01:49Z",
        },
      },
    });

    const response = await PUT(
      putRequest(validUpdatePayload),
      routeParams("18c16be1-9c69-454a-aa7c-5e6bd01df9bd")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "18c16be1-9c69-454a-aa7c-5e6bd01df9bd", hourlyRate: 30, billingRate: 80 })
    );
    expect(backendApiClient.put).toHaveBeenCalledWith(
      "/RateCard/UpdateRateCard/18c16be1-9c69-454a-aa7c-5e6bd01df9bd",
      { HourlyRate: 30, BillingRate: 80, EffectiveDate: "2025-04-01", IsActive: true },
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
  });

  it("returns a generic 502 (not the raw backend envelope) when the updated rate card fails to map", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Unexpected: "shape" } },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ message: "Unable to update the rate card. Please try again." });
    expect(logger.error).toHaveBeenCalled();
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "Rate card not found.", Data: null },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Rate card not found.");
  });

  it("sanitizes a 5xx envelope-based logical failure instead of forwarding the raw backend message", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 500, IsSuccess: false, Message: "System.Data.SqlClient.SqlException", Data: null },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to update the rate card. Please try again.");
  });
});

describe("DELETE /api/rate-cards/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await DELETE(new Request("http://localhost/api/rate-cards/1"), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage rate cards", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "sarah@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await DELETE(new Request("http://localhost/api/rate-cards/1"), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("deletes the rate card, returning 204", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    const response = await DELETE(
      new Request("http://localhost/api/rate-cards/18c16be1-9c69-454a-aa7c-5e6bd01df9bd"),
      routeParams("18c16be1-9c69-454a-aa7c-5e6bd01df9bd")
    );

    expect(response.status).toBe(204);
    expect(backendApiClient.delete).toHaveBeenCalledWith(
      "/RateCard/DeleteRateCard/18c16be1-9c69-454a-aa7c-5e6bd01df9bd",
      { headers: { Authorization: `Bearer ${systemAdminToken}` } }
    );
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await DELETE(new Request("http://localhost/api/rate-cards/1"), routeParams("1"));

    expect(response.status).toBe(502);
  });
});
