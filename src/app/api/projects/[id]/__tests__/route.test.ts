/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts` / `app/api/auth/login/__tests__/route.test.ts`.
 */
import { GET } from "@/app/api/projects/[id]/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/projects/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/projects/1"), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the project, unwrapping the real backend's Data envelope (per the saved Project/GetProject example)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Id: "6f2594d9-224a-414a-a409-30dc98f9a1be",
          Code: "PRJ-001",
          Name: "Project Helix",
          Description: "Straight Through Processing",
          ClientName: "Tokio Marine",
          ClientEmail: "lin.htoo@tokiomarine-life.sg",
          StartDate: "2025-01-01",
          EndDate: "2025-12-31",
          MaxDailyHours: 20,
          IsActive: true,
        },
      },
    });

    const response = await GET(
      new Request("http://localhost/api/projects/6f2594d9-224a-414a-a409-30dc98f9a1be"),
      routeParams("6f2594d9-224a-414a-a409-30dc98f9a1be")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({
        id: "6f2594d9-224a-414a-a409-30dc98f9a1be",
        code: "PRJ-001",
        name: "Project Helix",
      })
    );
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Project/GetProject/6f2594d9-224a-414a-a409-30dc98f9a1be",
      { headers: { Authorization: "Bearer access-token" } }
    );
  });

  it("returns a 404 when the backend signals a logical failure (IsSuccess: false) at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "Project not found.", Data: null },
    });

    const response = await GET(new Request("http://localhost/api/projects/missing"), routeParams("missing"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Project not found.");
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(new Request("http://localhost/api/projects/1"), routeParams("1"));

    expect(response.status).toBe(502);
  });
});
