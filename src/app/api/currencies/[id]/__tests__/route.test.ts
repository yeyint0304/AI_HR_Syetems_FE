/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/projects/[id]/__tests__/route.test.ts` for the same rationale.
 */
import { DELETE, PUT } from "@/app/api/currencies/[id]/route";
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
  return new Request("http://localhost/api/currencies/1", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const validUpdatePayload = { name: "Singapore Dollar", symbol: "SGD", isActive: true };

describe("PUT /api/currencies/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage currencies", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "sarah@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await PUT(putRequest({ ...validUpdatePayload, name: "" }), routeParams("1"));

    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("updates the currency, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Currency updated.",
        Data: {
          Id: "33333333-3333-3333-3333-333333333301",
          Code: "SGD",
          Name: "Singapore Dollar",
          Symbol: "SGD",
          IsBaseCurrency: true,
          IsActive: true,
          UpdatedAt: "2026-06-23T13:24:01Z",
        },
      },
    });

    const response = await PUT(
      putRequest(validUpdatePayload),
      routeParams("33333333-3333-3333-3333-333333333301")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "33333333-3333-3333-3333-333333333301", symbol: "SGD" })
    );
    expect(backendApiClient.put).toHaveBeenCalledWith(
      "/Currency/UpdateCurrency/33333333-3333-3333-3333-333333333301",
      { Name: "Singapore Dollar", Symbol: "SGD", IsActive: true },
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
  });

  it("returns a generic 502 (not the raw backend envelope) when the updated currency fails to map", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Unexpected: "shape" } },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ message: "Unable to update the currency. Please try again." });
    expect(logger.error).toHaveBeenCalled();
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "Currency not found.", Data: null },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Currency not found.");
  });
});

describe("DELETE /api/currencies/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await DELETE(new Request("http://localhost/api/currencies/1"), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage currencies", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "sarah@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await DELETE(new Request("http://localhost/api/currencies/1"), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("deletes the currency, returning 204", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    const response = await DELETE(
      new Request("http://localhost/api/currencies/d49e27d3-d43c-4202-b58d-325c060d046d"),
      routeParams("d49e27d3-d43c-4202-b58d-325c060d046d")
    );

    expect(response.status).toBe(204);
    expect(backendApiClient.delete).toHaveBeenCalledWith(
      "/Currency/DeleteCurrency/d49e27d3-d43c-4202-b58d-325c060d046d",
      { headers: { Authorization: `Bearer ${systemAdminToken}` } }
    );
  });

  it("forwards the backend's message when deletion is rejected (e.g. still referenced)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: "Cannot delete a currency in use by exchange rates." } },
    });

    const response = await DELETE(new Request("http://localhost/api/currencies/1"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Cannot delete a currency in use by exchange rates.");
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await DELETE(new Request("http://localhost/api/currencies/1"), routeParams("1"));

    expect(response.status).toBe(502);
  });
});
