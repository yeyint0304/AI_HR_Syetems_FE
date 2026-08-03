/**
 * @jest-environment node
 */
import { fetchUserRoleDirectory, getUserRoleName } from "@/lib/server/userRoleDirectory";
import { backendApiClient } from "@/lib/server/backendApiClient";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn() },
}));

describe("userRoleDirectory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchUserRoleDirectory", () => {
    it("calls Auth/SearchUsers with isAllRole=true and maps the paginated Items shape", async () => {
      (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          StatusCode: 200,
          IsSuccess: true,
          Message: "Success",
          Data: {
            TotalCount: 2,
            PageNo: 1,
            PageSize: 500,
            Items: [
              { UserId: "user-1", RoleName: "SystemAdmin" },
              { UserId: "user-2", RoleName: "ProjectAdmin" },
            ],
          },
        },
      });

      const directory = await fetchUserRoleDirectory("token-123");

      expect(backendApiClient.get).toHaveBeenCalledWith(
        "/Auth/SearchUsers",
        expect.objectContaining({
          params: expect.objectContaining({ isAllRole: true, page: 1 }),
          headers: { Authorization: "Bearer token-123" },
        })
      );
      expect(directory).toEqual([
        { userId: "user-1", roleName: "SystemAdmin" },
        { userId: "user-2", roleName: "ProjectAdmin" },
      ]);
    });

    it("tolerates a bare Data array (the shape the saved Postman example itself documents)", async () => {
      (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          StatusCode: 200,
          IsSuccess: true,
          Message: "Success",
          Data: [{ UserId: "user-1", RoleName: "Employee" }],
        },
      });

      const directory = await fetchUserRoleDirectory("token-123");

      expect(directory).toEqual([{ userId: "user-1", roleName: "Employee" }]);
    });

    it("skips entries missing an id or role name", async () => {
      (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          StatusCode: 200,
          IsSuccess: true,
          Message: "Success",
          Data: { Items: [{ UserId: "user-1" }, { RoleName: "Employee" }, null] },
        },
      });

      const directory = await fetchUserRoleDirectory("token-123");

      expect(directory).toEqual([]);
    });
  });

  describe("getUserRoleName", () => {
    it("resolves the matching user's role name", async () => {
      (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          StatusCode: 200,
          IsSuccess: true,
          Message: "Success",
          Data: { Items: [{ UserId: "user-1", RoleName: "SystemAdmin" }] },
        },
      });

      await expect(getUserRoleName("user-1", "token-123")).resolves.toBe("SystemAdmin");
    });

    it("returns undefined when the user isn't found in the directory", async () => {
      (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Items: [] } },
      });

      await expect(getUserRoleName("missing-user", "token-123")).resolves.toBeUndefined();
    });
  });
});
