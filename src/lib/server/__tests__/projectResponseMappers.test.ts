/**
 * @jest-environment node
 */
import {
  mapBackendAssignment,
  mapBackendAssignmentList,
  mapBackendProject,
  mapBackendProjectList,
  mapBackendResourceRoleType,
  mapBackendResourceRoleTypeList,
} from "@/lib/server/projectResponseMappers";

describe("projectResponseMappers", () => {
  describe("mapBackendProject", () => {
    it("maps a PascalCase project", () => {
      expect(
        mapBackendProject({
          Id: "1",
          Code: "PRJ-ALPHA",
          Name: "Project Alpha",
          Description: "Desc",
          ClientName: "Acme Corp",
          ClientEmail: "client@acme.com",
          StartDate: "2025-01-15",
          EndDate: "2025-12-31",
          MaxDailyHours: 8,
          IsActive: true,
        })
      ).toEqual({
        id: "1",
        code: "PRJ-ALPHA",
        name: "Project Alpha",
        description: "Desc",
        clientName: "Acme Corp",
        clientEmail: "client@acme.com",
        startDate: "2025-01-15",
        endDate: "2025-12-31",
        maxDailyHours: 8,
        isActive: true,
      });
    });

    it("maps a camelCase project", () => {
      expect(
        mapBackendProject({
          id: "2",
          code: "PRJ-BETA",
          name: "Project Beta",
          clientName: "TechStart Inc",
          clientEmail: "client@techstart.com",
          startDate: "2025-03-01",
          endDate: "2025-09-30",
          maxDailyHours: 6,
          isActive: false,
        })
      ).toEqual(
        expect.objectContaining({ id: "2", code: "PRJ-BETA", name: "Project Beta", isActive: false })
      );
    });

    it("returns null when required fields are missing", () => {
      expect(mapBackendProject({ Name: "No id or code" })).toBeNull();
      expect(mapBackendProject(null)).toBeNull();
      expect(mapBackendProject("not-an-object")).toBeNull();
    });
  });

  describe("mapBackendProjectList", () => {
    it("extracts a bare array", () => {
      const result = mapBackendProjectList([
        { Id: "1", Code: "A", Name: "A" },
        { Id: "2", Code: "B", Name: "B" },
      ]);
      expect(result).toHaveLength(2);
    });

    it("extracts a { data: [...] } wrapper", () => {
      const result = mapBackendProjectList({ data: [{ Id: "1", Code: "A", Name: "A" }] });
      expect(result).toHaveLength(1);
    });

    it("extracts an { Items: [...] } wrapper", () => {
      const result = mapBackendProjectList({ Items: [{ Id: "1", Code: "A", Name: "A" }] });
      expect(result).toHaveLength(1);
    });

    it("returns an empty array for an unrecognized shape", () => {
      expect(mapBackendProjectList({ unexpected: true })).toEqual([]);
    });
  });

  describe("mapBackendAssignment", () => {
    it("maps a PascalCase assignment", () => {
      expect(
        mapBackendAssignment({
          Id: "a1",
          UserId: "u1",
          UserName: "Alex Kumar",
          UserEmail: "alex@hrsystem.com",
          ResourceRoleTypeId: "r1",
          ResourceRoleTypeName: "Senior Developer",
        })
      ).toEqual({
        id: "a1",
        userId: "u1",
        userName: "Alex Kumar",
        userEmail: "alex@hrsystem.com",
        resourceRoleTypeId: "r1",
        resourceRoleTypeName: "Senior Developer",
      });
    });

    it("returns null when required fields are missing", () => {
      expect(mapBackendAssignment({ Id: "a1" })).toBeNull();
    });
  });

  describe("mapBackendAssignmentList", () => {
    it("extracts a bare array", () => {
      const result = mapBackendAssignmentList([{ Id: "a1", UserId: "u1", ResourceRoleTypeId: "r1" }]);
      expect(result).toHaveLength(1);
    });
  });

  describe("mapBackendResourceRoleType", () => {
    it("maps a PascalCase resource role type", () => {
      expect(mapBackendResourceRoleType({ Id: "r1", Name: "Senior Developer" })).toEqual({
        id: "r1",
        name: "Senior Developer",
        description: null,
      });
    });

    it("returns null when required fields are missing", () => {
      expect(mapBackendResourceRoleType({})).toBeNull();
    });
  });

  describe("mapBackendResourceRoleTypeList", () => {
    it("extracts a bare array", () => {
      const result = mapBackendResourceRoleTypeList([{ Id: "r1", Name: "Senior Developer" }]);
      expect(result).toHaveLength(1);
    });
  });
});
