import {
  canManageResourceRoleTypes,
  RESOURCE_ROLE_TYPE_MANAGER_ROLES,
} from "@/lib/constants/resourceRoleType.constants";

describe("resourceRoleType.constants", () => {
  describe("canManageResourceRoleTypes", () => {
    it("allows SystemAdmin", () => {
      expect(canManageResourceRoleTypes("SystemAdmin")).toBe(true);
    });

    it("disallows ProjectAdmin", () => {
      expect(canManageResourceRoleTypes("ProjectAdmin")).toBe(false);
    });

    it("disallows a regular User", () => {
      expect(canManageResourceRoleTypes("User")).toBe(false);
    });

    it("disallows a Guest", () => {
      expect(canManageResourceRoleTypes("Guest")).toBe(false);
    });

    it("disallows null/undefined roles", () => {
      expect(canManageResourceRoleTypes(null)).toBe(false);
      expect(canManageResourceRoleTypes(undefined)).toBe(false);
    });
  });

  it("exposes exactly SystemAdmin as the manager role", () => {
    expect(RESOURCE_ROLE_TYPE_MANAGER_ROLES).toEqual(["SystemAdmin"]);
  });
});
