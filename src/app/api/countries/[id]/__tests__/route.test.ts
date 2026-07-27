/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/projects/[id]/__tests__/route.test.ts` for the same rationale.
 */
import { DELETE, PUT } from "@/app/api/countries/[id]/route";
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
  return new Request("http://localhost/api/countries/1", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const validUpdatePayload = { name: "Union of Myanmar" };

describe("PUT /api/countries/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage countries", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "sarah@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await PUT(putRequest({ name: "" }), routeParams("1"));

    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("updates the country, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Country updated.",
        Data: {
          Id: "aa532dd2-1a51-4be0-b09b-be3d99ea15f3",
          Code: "MM",
          Name: "Union of Myanmar",
          UpdatedAt: "2026-06-23T13:05:37Z",
        },
      },
    });

    const response = await PUT(
      putRequest(validUpdatePayload),
      routeParams("aa532dd2-1a51-4be0-b09b-be3d99ea15f3")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "aa532dd2-1a51-4be0-b09b-be3d99ea15f3", name: "Union of Myanmar" })
    );
    expect(backendApiClient.put).toHaveBeenCalledWith(
      "/Country/UpdateCountry/aa532dd2-1a51-4be0-b09b-be3d99ea15f3",
      { Name: "Union of Myanmar" },
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
  });

  it("returns a generic 502 (not the raw backend envelope) when the updated country fails to map", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Unexpected: "shape" } },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ message: "Unable to update the country. Please try again." });
    expect(logger.error).toHaveBeenCalled();
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "Country not found.", Data: null },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Country not found.");
  });
});

describe("DELETE /api/countries/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await DELETE(new Request("http://localhost/api/countries/1"), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage countries", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "sarah@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await DELETE(new Request("http://localhost/api/countries/1"), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("deletes the country, returning 204", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    const response = await DELETE(
      new Request("http://localhost/api/countries/22222222-2222-2222-2222-222222222203"),
      routeParams("22222222-2222-2222-2222-222222222203")
    );

    expect(response.status).toBe(204);
    expect(backendApiClient.delete).toHaveBeenCalledWith(
      "/Country/DeleteCountry/22222222-2222-2222-2222-222222222203",
      { headers: { Authorization: `Bearer ${systemAdminToken}` } }
    );
  });

  it("forwards the backend's message when deletion is rejected (e.g. still referenced by rate cards)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: "Cannot delete a country in use by rate cards." } },
    });

    const response = await DELETE(new Request("http://localhost/api/countries/1"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Cannot delete a country in use by rate cards.");
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await DELETE(new Request("http://localhost/api/countries/1"), routeParams("1"));

    expect(response.status).toBe(502);
  });
});
