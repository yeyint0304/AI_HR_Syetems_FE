import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiClient";
import {
  assignResource,
  createProject,
  deleteProject,
  getProjectAssignments,
  getProjectById,
  getProjectList,
  mapProjectFieldErrors,
  removeResource,
  updateProject,
} from "../projects";

const PROJECT_DTO = {
  Id: "p-1",
  Code: "PRJ-ALPHA",
  Name: "Project Alpha",
  Description: "Core platform revamp",
  ClientName: "Acme Corp",
  ClientEmail: "client@acme.com",
  StartDate: "2025-01-01",
  EndDate: "2025-12-31",
  MaxDailyHours: 8,
  IsActive: true,
};

describe("projects API service", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("maps GetProjectList response DTOs to camelCase Project models", async () => {
    vi.mocked(apiFetch).mockResolvedValue([PROJECT_DTO]);

    const result = await getProjectList();

    expect(apiFetch).toHaveBeenCalledWith("/api/v1/Project/GetProjectList");
    expect(result).toEqual([
      {
        id: "p-1",
        code: "PRJ-ALPHA",
        name: "Project Alpha",
        description: "Core platform revamp",
        clientName: "Acme Corp",
        clientEmail: "client@acme.com",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        maxDailyHours: 8,
        isActive: true,
      },
    ]);
  });

  it("returns an empty array when GetProjectList responds with no body", async () => {
    vi.mocked(apiFetch).mockResolvedValue(undefined);
    const result = await getProjectList();
    expect(result).toEqual([]);
  });

  it("fetches a single project by id", async () => {
    vi.mocked(apiFetch).mockResolvedValue(PROJECT_DTO);

    const result = await getProjectById("p-1");

    expect(apiFetch).toHaveBeenCalledWith("/api/v1/Project/GetProject/p-1");
    expect(result.id).toBe("p-1");
  });

  it("sends a PascalCase payload when creating a project", async () => {
    vi.mocked(apiFetch).mockResolvedValue(PROJECT_DTO);

    await createProject({
      code: "PRJ-ALPHA",
      name: "Project Alpha",
      clientName: "Acme Corp",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      isActive: true,
      description: "Core platform revamp",
    });

    expect(apiFetch).toHaveBeenCalledWith("/api/v1/Project/CreateProject", {
      method: "POST",
      body: {
        Code: "PRJ-ALPHA",
        Name: "Project Alpha",
        Description: "Core platform revamp",
        ClientName: "Acme Corp",
        StartDate: "2025-01-01",
        EndDate: "2025-12-31",
      },
    });
  });

  it("sends IsActive when updating a project", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ...PROJECT_DTO, IsActive: false });

    await updateProject("p-1", {
      code: "PRJ-ALPHA",
      name: "Project Alpha",
      clientName: "Acme Corp",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      isActive: false,
      description: "",
    });

    expect(apiFetch).toHaveBeenCalledWith("/api/v1/Project/UpdateProject/p-1", {
      method: "PUT",
      body: expect.objectContaining({ IsActive: false }),
    });
  });

  it("calls DELETE for deleteProject", async () => {
    vi.mocked(apiFetch).mockResolvedValue(undefined);
    await deleteProject("p-1");
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/Project/DeleteProject/p-1", { method: "DELETE" });
  });

  it("maps assignment DTOs for getProjectAssignments", async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      { Id: "a-1", ProjectId: "p-1", UserId: "u-1", ResourceRoleTypeId: "r-1" },
    ]);

    const result = await getProjectAssignments("p-1");

    expect(apiFetch).toHaveBeenCalledWith("/api/v1/Project/GetProjectAssignments/p-1");
    expect(result).toEqual([{ id: "a-1", projectId: "p-1", userId: "u-1", resourceRoleTypeId: "r-1" }]);
  });

  it("posts UserId/ResourceRoleTypeId when assigning a resource", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      Id: "a-2",
      ProjectId: "p-1",
      UserId: "u-2",
      ResourceRoleTypeId: "r-2",
    });

    const result = await assignResource("p-1", { userId: "u-2", resourceRoleTypeId: "r-2" });

    expect(apiFetch).toHaveBeenCalledWith("/api/v1/Project/AssignResource/p-1", {
      method: "POST",
      body: { UserId: "u-2", ResourceRoleTypeId: "r-2" },
    });
    expect(result.id).toBe("a-2");
  });

  it("calls DELETE with both project and assignment ids for removeResource", async () => {
    vi.mocked(apiFetch).mockResolvedValue(undefined);
    await removeResource("p-1", "a-2");
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/Project/RemoveResource/p-1/a-2", { method: "DELETE" });
  });

  describe("mapProjectFieldErrors", () => {
    it("maps known PascalCase backend fields to camelCase form keys", () => {
      const mapped = mapProjectFieldErrors({
        Code: ["Code is already taken."],
        ClientName: ["Client name is required."],
      });

      expect(mapped).toEqual({
        code: "Code is already taken.",
        clientName: "Client name is required.",
      });
    });

    it("returns an empty object when there are no field errors", () => {
      expect(mapProjectFieldErrors(undefined)).toEqual({});
    });
  });
});
