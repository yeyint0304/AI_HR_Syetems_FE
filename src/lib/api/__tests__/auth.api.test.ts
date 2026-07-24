import { apiClient } from "@/lib/api/axiosInstance";
import {
  changePasswordRequest,
  createUserRequest,
  getUnassignedUsersRequest,
  loginRequest,
  logoutRequest,
  updateProfileRequest,
} from "@/lib/api/auth.api";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { post: jest.fn(), put: jest.fn(), get: jest.fn() },
}));

describe("auth.api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loginRequest posts credentials and returns the user", async () => {
    const user = { id: "1", email: "jane@example.com", role: "User" };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { user } });

    const result = await loginRequest({ usernameOrEmail: "jane", password: "Password1!" });

    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      usernameOrEmail: "jane",
      password: "Password1!",
    });
    expect(result).toEqual(user);
  });

  it("logoutRequest posts with no payload", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });
    await logoutRequest();
    expect(apiClient.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("updateProfileRequest puts the payload and returns the updated user", async () => {
    const user = { id: "1", email: "new@example.com", role: "User" };
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { user } });

    const payload = { firstName: "Jane", lastName: "Doe", email: "new@example.com" };
    const result = await updateProfileRequest(payload);

    expect(apiClient.put).toHaveBeenCalledWith("/auth/profile", payload);
    expect(result).toEqual(user);
  });

  it("changePasswordRequest puts the payload and returns the message", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { message: "Your password has been updated successfully." },
    });

    const payload = {
      currentPassword: "Old1!aaaa",
      newPassword: "New1!aaaa",
      confirmNewPassword: "New1!aaaa",
    };
    const result = await changePasswordRequest(payload);

    expect(apiClient.put).toHaveBeenCalledWith("/auth/change-password", payload);
    expect(result).toEqual({ message: "Your password has been updated successfully." });
  });

  it("createUserRequest posts the payload and returns the created id", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "42" } } });

    const payload = {
      username: "newuser",
      email: "newuser@example.com",
      password: "Password1!",
      firstName: "New",
      lastName: "User",
      roleId: "role-guid",
    };
    const result = await createUserRequest(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/auth/users", payload);
    expect(result).toEqual({ id: "42" });
  });

  it("getUnassignedUsersRequest passes search/page/pageSize as query params and returns the page", async () => {
    const page = {
      items: [
        { id: "u1", username: "jsmith", email: "jsmith@hrsystem.com", firstName: "Jamie", lastName: "Smith" },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      hasMore: false,
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: page } });

    const result = await getUnassignedUsersRequest({ search: "jamie", page: 1, pageSize: 20 });

    expect(apiClient.get).toHaveBeenCalledWith("/auth/unassigned-users", {
      params: { search: "jamie", page: 1, pageSize: 20 },
    });
    expect(result).toEqual(page);
  });

  it("getUnassignedUsersRequest defaults to an empty params object", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { data: { items: [], page: 1, pageSize: 20, totalCount: 0, hasMore: false } },
    });

    await getUnassignedUsersRequest();

    expect(apiClient.get).toHaveBeenCalledWith("/auth/unassigned-users", { params: {} });
  });
});
