/**
 * @jest-environment node
 */
import { GET } from "@/app/api/resource-role-types/route";
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

describe("GET /api/resource-role-types", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the resource role type list, unwrapping the backend's paginated Data.Items envelope (per the saved ResourceRoleType/GetAllResourceRoleTypes example)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Items: [
            {
              Id: "44444444-4444-4444-4444-444444444401",
              Name: "Senior Developer",
              Description: "Senior software engineer with 5+ years experience",
              CreatedAt: "2026-06-11T10:14:31Z",
            },
            {
              Id: "44444444-4444-4444-4444-444444444402",
              Name: "Junior Developer",
              Description: "Junior software engineer with up to 2 years experience",
              CreatedAt: "2026-06-11T10:14:31Z",
            },
          ],
          TotalCount: 2,
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
        id: "44444444-4444-4444-4444-444444444401",
        name: "Senior Developer",
        description: "Senior software engineer with 5+ years experience",
      },
      {
        id: "44444444-4444-4444-4444-444444444402",
        name: "Junior Developer",
        description: "Junior software engineer with up to 2 years experience",
      },
    ]);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/ResourceRoleType/GetAllResourceRoleTypes",
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
