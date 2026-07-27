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

    it("unwraps the real backend's Data envelope (per the saved Project/GetProject example)", () => {
      expect(
        mapBackendProject({
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
        })
      ).toEqual({
        id: "6f2594d9-224a-414a-a409-30dc98f9a1be",
        code: "PRJ-001",
        name: "Project Helix",
        description: "Straight Through Processing",
        clientName: "Tokio Marine",
        clientEmail: "lin.htoo@tokiomarine-life.sg",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        maxDailyHours: 20,
        isActive: true,
      });
    });

    it("returns null when the envelope reports a logical failure (IsSuccess: false)", () => {
      expect(
        mapBackendProject({ StatusCode: 404, IsSuccess: false, Message: "Not found.", Data: null })
      ).toBeNull();
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

    it("unwraps the real backend's envelope, tolerating a paginated Data.Items shape (regression: 'Projects' list rendering empty)", () => {
      // `Project/GetProjectList`'s saved Postman example has no response
      // body, so whether `Data` is a bare array or paginated
      // (`{ Items, TotalCount, Page, PageSize }` — the shape
      // `Currency/GetAllCurrencies` and `ResourceRoleType/GetAllResourceRoleTypes`
      // actually use) is unconfirmed either way. This asserts the paginated
      // shape is handled too, not just a bare array.
      const result = mapBackendProjectList({
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Items: [{ Id: "1", Code: "PRJ-A", Name: "Project A" }],
          TotalCount: 1,
          Page: 1,
          PageSize: 100,
        },
      });
      expect(result).toEqual([
        expect.objectContaining({ id: "1", code: "PRJ-A", name: "Project A" }),
      ]);
    });

    it("still unwraps a real backend envelope wrapping a bare array", () => {
      const result = mapBackendProjectList({
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: [{ Id: "1", Code: "A", Name: "A" }],
      });
      expect(result).toHaveLength(1);
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

    it("derives userName from FirstName/LastName (regression: 'Assigned Users' list showing raw GUIDs)", () => {
      // Per the saved "200 - Success" example for `Project/GetProjectAssignments`
      // in `docs/HR_System_BE.postman_collection.json`, each item carries
      // `FirstName`/`LastName`/`Email` — never a combined `UserName`/`FullName`
      // field.
      expect(
        mapBackendAssignment({
          Id: "12565026-b4b4-45d8-a7db-5d0537cf66ab",
          UserId: "84e4be46-3d9f-4e86-ab08-74d8837958b9",
          FirstName: "Lin Thit",
          LastName: "Htoo edited",
          Email: "linnthit.htoo@d3-sg.com",
          ResourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
          RoleName: "Senior Developer",
          AssignedAt: "2026-06-18T14:11:57",
          IsActive: true,
        })
      ).toEqual({
        id: "12565026-b4b4-45d8-a7db-5d0537cf66ab",
        userId: "84e4be46-3d9f-4e86-ab08-74d8837958b9",
        userName: "Lin Thit Htoo edited",
        userEmail: "linnthit.htoo@d3-sg.com",
        resourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
        resourceRoleTypeName: "Senior Developer",
      });
    });

    it("unwraps the real backend's Data envelope (per the saved Project/AssignResource example)", () => {
      expect(
        mapBackendAssignment({
          StatusCode: 200,
          IsSuccess: true,
          Message: "Success",
          Data: {
            Id: "12565026-b4b4-45d8-a7db-5d0537cf66ab",
            ProjectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
            UserId: "84e4be46-3d9f-4e86-ab08-74d8837958b9",
            ResourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
          },
        })
      ).toEqual(
        expect.objectContaining({
          id: "12565026-b4b4-45d8-a7db-5d0537cf66ab",
          userId: "84e4be46-3d9f-4e86-ab08-74d8837958b9",
          resourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
        })
      );
    });
  });

  describe("mapBackendAssignmentList", () => {
    it("extracts a bare array", () => {
      const result = mapBackendAssignmentList([{ Id: "a1", UserId: "u1", ResourceRoleTypeId: "r1" }]);
      expect(result).toHaveLength(1);
    });

    it("unwraps the real backend's envelope wrapping a bare Data array (per the saved Project/GetProjectAssignments example)", () => {
      const result = mapBackendAssignmentList({
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: [
          {
            Id: "12565026-b4b4-45d8-a7db-5d0537cf66ab",
            UserId: "84e4be46-3d9f-4e86-ab08-74d8837958b9",
            FirstName: "Lin Thit",
            LastName: "Htoo",
            ResourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
          },
        ],
      });
      expect(result).toEqual([
        expect.objectContaining({ id: "12565026-b4b4-45d8-a7db-5d0537cf66ab", userName: "Lin Thit Htoo" }),
      ]);
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

    it("unwraps the real backend's Data envelope", () => {
      expect(
        mapBackendResourceRoleType({
          StatusCode: 200,
          IsSuccess: true,
          Message: "Success",
          Data: { Id: "r1", Name: "Senior Developer" },
        })
      ).toEqual({ id: "r1", name: "Senior Developer", description: null });
    });
  });

  describe("mapBackendResourceRoleTypeList", () => {
    it("extracts a bare array", () => {
      const result = mapBackendResourceRoleTypeList([{ Id: "r1", Name: "Senior Developer" }]);
      expect(result).toHaveLength(1);
    });

    it("unwraps the real backend's paginated Data.Items envelope (per the saved ResourceRoleType/GetAllResourceRoleTypes example)", () => {
      const result = mapBackendResourceRoleTypeList({
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Items: [
            { Id: "r1", Name: "Senior Developer", Description: "Senior dev" },
            { Id: "r2", Name: "Junior Developer", Description: "Junior dev" },
          ],
          TotalCount: 2,
          Page: 1,
          PageSize: 100,
        },
      });

      expect(result).toEqual([
        { id: "r1", name: "Senior Developer", description: "Senior dev" },
        { id: "r2", name: "Junior Developer", description: "Junior dev" },
      ]);
    });
  });
});
