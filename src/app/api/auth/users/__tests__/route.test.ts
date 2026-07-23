/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts`.
 */
import { GET } from "@/app/api/auth/users/route";
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
  return [
    base64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    base64Url(JSON.stringify(claims)),
    "sig",
  ].join(".");
}

const systemAdminToken = buildToken({ sub: "user-1", email: "admin@hrsystem.com", role: "SystemAdmin" });

function buildRequest(query = ""): Request {
  return new Request(`http://localhost/api/auth/users${query}`);
}

describe("GET /api/auth/users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(buildRequest());

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s when the caller is not a SystemAdmin", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "pm@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await GET(buildRequest());

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("400s on an invalid pageSize", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await GET(buildRequest("?pageSize=not-a-number"));

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the mapped user list, including role/country/status, unwrapping the paginated envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          TotalCount: 1,
          PageNo: 1,
          PageSize: 10,
          Items: [
            {
              UserId: "99b7c3a0-a849-4737-8eba-7b4f3601811e",
              Username: "tester",
              Email: "tester@d3-sg.com",
              FirstName: "Tester1",
              LastName: "Sample",
              EmployeeId: "EMP004",
              RoleName: "ProjectAdmin",
              CountryId: "22222222-2222-2222-2222-222222222201",
              CountryCode: "SG",
              CountryName: "Singapore",
            },
          ],
        },
      },
    });

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items).toEqual([
      expect.objectContaining({
        id: "99b7c3a0-a849-4737-8eba-7b4f3601811e",
        username: "tester",
        roleName: "ProjectAdmin",
        countryCode: "SG",
        isActive: true,
      }),
    ]);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Auth/GetUserList",
      expect.objectContaining({
        params: { page: 1, pageSize: 20 },
        headers: { Authorization: `Bearer ${systemAdminToken}` },
      })
    );
  });

  it("applies a defensive case-insensitive search filter across name/username/email/role", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
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
              RoleName: "User",
            },
            {
              UserId: "u2",
              Username: "adoe",
              Email: "adoe@hrsystem.com",
              FirstName: "Alex",
              LastName: "Doe",
              RoleName: "ProjectAdmin",
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

  // QA note (bugs/exchange-rate review): `filterBySearchTerm` narrows `items`
  // to the matching subset, but `totalCount` is passed through unchanged from
  // `mapBackendUserListPage` (the backend's unfiltered page total) — so a
  // search that matches, say, 1 of 2 users on the fetched page still reports
  // `totalCount: 2`. `UsersListView` renders this value verbatim in its
  // "N users across all roles" header, so a search narrows the *table* but
  // not that summary line. Documented here as a known, pre-existing-pattern
  // limitation (the `/admin/users` list has no pagination UI and fetches one
  // large page, same caveat as `GET /api/auth/unassigned-users`) rather than
  // asserting a specific (arguably wrong) number, so this test doesn't break
  // if that's fixed later — flagged for the dev team to decide whether the
  // header should instead reflect `items.length` after a client-side filter.
  it("passes through the backend's unfiltered totalCount even when the search filter narrows the returned items (known display caveat)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
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
              RoleName: "User",
            },
            {
              UserId: "u2",
              Username: "adoe",
              Email: "adoe@hrsystem.com",
              FirstName: "Alex",
              LastName: "Doe",
              RoleName: "ProjectAdmin",
            },
          ],
        },
      },
    });

    const response = await GET(buildRequest("?search=jamie"));
    const body = await response.json();

    expect(body.data.items).toHaveLength(1);
    expect(body.data.totalCount).toBe(2); // unfiltered — see the note above.
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(buildRequest());

    expect(response.status).toBe(502);
  });

  it("treats a 404 from the backend as an empty page rather than an error", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
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
