import { canManageProjects, PROJECT_MANAGER_ROLES } from "@/lib/constants/project.constants";

describe("project.constants", () => {
  describe("canManageProjects", () => {
    it("allows SystemAdmin", () => {
      expect(canManageProjects("SystemAdmin")).toBe(true);
    });

    it("allows ProjectAdmin", () => {
      expect(canManageProjects("ProjectAdmin")).toBe(true);
    });

    it("disallows a regular User", () => {
      expect(canManageProjects("User")).toBe(false);
    });

    it("disallows a Guest", () => {
      expect(canManageProjects("Guest")).toBe(false);
    });

    it("disallows null/undefined roles", () => {
      expect(canManageProjects(null)).toBe(false);
      expect(canManageProjects(undefined)).toBe(false);
    });
  });

  it("exposes exactly SystemAdmin and ProjectAdmin as manager roles", () => {
    expect(PROJECT_MANAGER_ROLES).toEqual(["SystemAdmin", "ProjectAdmin"]);
  });
});
