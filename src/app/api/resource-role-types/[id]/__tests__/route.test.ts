/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/projects/[id]/__tests__/route.test.ts` for the same rationale.
 */
import { DELETE, PUT } from "@/app/api/resource-role-types/[id]/route";
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
  return new Request("http://localhost/api/resource-role-types/1", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const validUpdatePayload = {
  name: "Senior Software Engineer",
  description: "Senior full-stack software engineer role",
};

describe("PUT /api/resource-role-types/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage resource role types", async () => {
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

  it("updates the resource role type, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Resource role type updated.",
        Data: {
          Id: "33f724ff-c089-4691-8fe1-5d3ecc41ba1b",
          Name: "Senior Software Engineer",
          Description: "Senior full-stack software engineer role",
          UpdatedAt: "2026-06-23T13:30:01Z",
        },
      },
    });

    const response = await PUT(
      putRequest(validUpdatePayload),
      routeParams("33f724ff-c089-4691-8fe1-5d3ecc41ba1b")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({
        id: "33f724ff-c089-4691-8fe1-5d3ecc41ba1b",
        name: "Senior Software Engineer",
      })
    );
    expect(backendApiClient.put).toHaveBeenCalledWith(
      "/ResourceRoleType/UpdateResourceRoleType/33f724ff-c089-4691-8fe1-5d3ecc41ba1b",
      { Name: "Senior Software Engineer", Description: "Senior full-stack software engineer role" },
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
  });

  it("returns a generic 502 (not the raw backend envelope) when the updated resource role type fails to map", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Unexpected: "shape" } },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ message: "Unable to update the resource role type. Please try again." });
    expect(logger.error).toHaveBeenCalled();
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "Resource role type not found.", Data: null },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Resource role type not found.");
  });
});

describe("DELETE /api/resource-role-types/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await DELETE(
      new Request("http://localhost/api/resource-role-types/1"),
      routeParams("1")
    );

    expect(response.status).toBe(401);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage resource role types", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "sarah@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await DELETE(
      new Request("http://localhost/api/resource-role-types/1"),
      routeParams("1")
    );

    expect(response.status).toBe(403);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("deletes the resource role type, returning 204", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    const response = await DELETE(
      new Request("http://localhost/api/resource-role-types/44444444-4444-4444-4444-444444444407"),
      routeParams("44444444-4444-4444-4444-444444444407")
    );

    expect(response.status).toBe(204);
    expect(backendApiClient.delete).toHaveBeenCalledWith(
      "/ResourceRoleType/DeleteResourceRoleType/44444444-4444-4444-4444-444444444407",
      { headers: { Authorization: `Bearer ${systemAdminToken}` } }
    );
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await DELETE(
      new Request("http://localhost/api/resource-role-types/1"),
      routeParams("1")
    );

    expect(response.status).toBe(502);
  });
});
