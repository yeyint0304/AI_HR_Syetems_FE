/**
 * @jest-environment node
 */
import { GET } from "@/app/api/countries/route";
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

describe("GET /api/countries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the country list for any authenticated user, unwrapping the backend's Data.Items envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Items: [
            {
              Id: "22222222-2222-2222-2222-222222222201",
              Code: "SG",
              Name: "Singapore",
              CreatedAt: "2026-06-11T10:14:31Z",
            },
            {
              Id: "aa532dd2-1a51-4be0-b09b-be3d99ea15f3",
              Code: "MM",
              Name: "Myanmar",
              CreatedAt: "2026-06-23T13:02:46Z",
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
      { id: "22222222-2222-2222-2222-222222222201", code: "SG", name: "Singapore" },
      { id: "aa532dd2-1a51-4be0-b09b-be3d99ea15f3", code: "MM", name: "Myanmar" },
    ]);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Country/GetAllCountries",
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
