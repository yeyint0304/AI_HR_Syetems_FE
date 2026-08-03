/**
 * @jest-environment node
 */
import { PUT } from "@/app/api/auth/profile/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken, getCurrentAuthUser, setUsernameCookie } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { put: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
  getCurrentAuthUser: jest.fn(),
  setUsernameCookie: jest.fn(),
}));

const VALID_BODY = {
  firstName: "Janet",
  lastName: "Doe",
  email: "jane@example.com",
  // Country is now a required field (`feature/user-deactivate`).
  countryId: "aa532dd2-1a51-4be0-b09b-be3d99ea15f3",
};

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("PUT /api/auth/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(jsonRequest(VALID_BODY));
    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("401s when the session can't be resolved into a user", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (getCurrentAuthUser as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(jsonRequest(VALID_BODY));
    expect(response.status).toBe(401);
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (getCurrentAuthUser as jest.Mock).mockResolvedValueOnce({
      id: "1",
      email: "jane@example.com",
      username: "jane",
      role: "Employee",
    });

    const response = await PUT(jsonRequest({ ...VALID_BODY, email: "not-an-email" }));
    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  // Per the `feature/user-deactivate` request ("also required on ...
  // Profile Update") — re-validated server-side, not just client-side.
  it("400s when countryId is missing", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (getCurrentAuthUser as jest.Mock).mockResolvedValueOnce({
      id: "1",
      email: "jane@example.com",
      username: "jane",
      role: "Employee",
    });

    const response = await PUT(jsonRequest({ ...VALID_BODY, countryId: null }));
    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("re-caches the username from the backend's response body and includes it in the returned user", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (getCurrentAuthUser as jest.Mock).mockResolvedValueOnce({
      id: "1",
      email: "jane@old.com",
      username: "jane",
      role: "Employee",
    });
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          UserId: "1",
          Username: "jane",
          Email: "jane@example.com",
          FirstName: "Janet",
          LastName: "Doe",
          CountryId: null,
        },
      },
    });

    const response = await PUT(jsonRequest(VALID_BODY));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toEqual(
      expect.objectContaining({ firstName: "Janet", email: "jane@example.com", username: "jane" })
    );
    expect(setUsernameCookie).toHaveBeenCalledWith("jane");
  });

  it("falls back to the already-resolved username when the backend response doesn't include one", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (getCurrentAuthUser as jest.Mock).mockResolvedValueOnce({
      id: "1",
      email: "jane@example.com",
      username: "jane",
      role: "Employee",
    });
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({ data: {} });

    const response = await PUT(jsonRequest(VALID_BODY));
    const body = await response.json();

    expect(body.user).toEqual(expect.objectContaining({ username: "jane" }));
  });

  it("surfaces the backend's error message on failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (getCurrentAuthUser as jest.Mock).mockResolvedValueOnce({
      id: "1",
      email: "jane@example.com",
      username: "jane",
      role: "Employee",
    });
    (backendApiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: "Email is already in use." } },
    });

    const response = await PUT(jsonRequest(VALID_BODY));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toMatch(/email is already in use/i);
  });
});
