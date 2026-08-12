/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts`.
 */
import { GET } from "@/app/api/auth/unassigned-users/route";
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
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Builds an unsigned JWT carrying the given claims (payload-decoding only — see `lib/utils/jwt.ts`). */
function buildToken(claims: Record<string, unknown>): string {
  return [
    base64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    base64Url(JSON.stringify(claims)),
    "sig",
  ].join(".");
}

const projectAdminToken = buildToken({
  sub: "user-1",
  email: "admin@hrsystem.com",
  role: "ProjectAdmin",
});

const systemAdminToken = buildToken({
  sub: "user-3",
  email: "sysadmin@hrsystem.com",
  role: "SystemAdmin",
});

function buildRequest(query = ""): Request {
  return new Request(`http://localhost/api/auth/unassigned-users${query}`);
}

describe("GET /api/auth/unassigned-users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(buildRequest());

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage projects", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" })
    );

    const response = await GET(buildRequest());

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("400s on an invalid pageSize", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);

    const response = await GET(buildRequest("?pageSize=not-a-number"));

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("requests page 1 with the default page size when no query params are given, unwrapping a bare-array Data envelope as a single, complete page", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: [
          {
            UserId: "00000000-0000-0000-0000-000000000001",
            Username: "admin",
            Email: "admin@hrsystem.com",
            FirstName: "System",
            LastName: "Admin",
            EmployeeId: "EMP-0001",
          },
        ],
      },
    });

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      items: [
        {
          id: "00000000-0000-0000-0000-000000000001",
          username: "admin",
          email: "admin@hrsystem.com",
          firstName: "System",
          lastName: "Admin",
          employeeId: "EMP-0001",
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      hasMore: false,
    });
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Auth/SearchUsers",
      expect.objectContaining({
        params: { page: 1, pageSize: 20, isAllRole: false },
        headers: { Authorization: `Bearer ${projectAdminToken}` },
      })
    );
  });

  it("requests isAllRole=false for a SystemAdmin caller too", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: [] },
    });

    await GET(buildRequest());

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Auth/SearchUsers",
      expect.objectContaining({ params: { page: 1, pageSize: 20, isAllRole: false } })
    );
  });

  it("forwards page/pageSize/search and returns hasMore when the backend paginates Data as { TotalCount, PageNo, PageSize, Items }", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          TotalCount: 45,
          PageNo: 2,
          PageSize: 20,
          Items: [
            {
              UserId: "a3eb4839-7ae3-4987-9df5-0368e57c3543",
              Username: "aln",
              Email: "aln@hrsystem.com",
              FirstName: "Aung",
              LastName: "Lin",
              EmployeeId: "EMP-0002",
            },
          ],
        },
      },
    });

    const response = await GET(buildRequest("?search=aung&page=2&pageSize=20"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      items: [
        {
          id: "a3eb4839-7ae3-4987-9df5-0368e57c3543",
          username: "aln",
          email: "aln@hrsystem.com",
          firstName: "Aung",
          lastName: "Lin",
          employeeId: "EMP-0002",
        },
      ],
      page: 2,
      pageSize: 20,
      totalCount: 45,
      hasMore: true,
    });
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Auth/SearchUsers",
      expect.objectContaining({ params: { page: 2, pageSize: 20, isAllRole: false, userName: "aung" } })
    );
  });

  it("forwards an email-shaped search term as `email` rather than `userName`", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: [] },
    });

    await GET(buildRequest("?search=jamie%40hrsystem.com"));

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Auth/SearchUsers",
      expect.objectContaining({
        params: { page: 1, pageSize: 20, isAllRole: false, email: "jamie@hrsystem.com" },
      })
    );
  });

  it("applies a defensive case-insensitive search filter, in case the backend ignores the `search` param", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Data: {
          TotalCount: 2,
          PageNo: 1,
          PageSize: 20,
          Items: [
            {
              UserId: "u1",
              Username: "jsmith",
              Email: "jsmith@hrsystem.com",
              FirstName: "Jamie",
              LastName: "Smith",
            },
            {
              UserId: "u2",
              Username: "adoe",
              Email: "adoe@hrsystem.com",
              FirstName: "Alex",
              LastName: "Doe",
            },
          ],
        },
      },
    });

    const response = await GET(buildRequest("?search=jamie"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].username).toBe("jsmith");
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(buildRequest());

    expect(response.status).toBe(502);
  });

  it("treats a 404 from the backend as an empty page rather than an error", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404, data: { message: "Not Found" } },
    });

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ items: [], page: 1, pageSize: 20, totalCount: 0, hasMore: false });
  });
});
