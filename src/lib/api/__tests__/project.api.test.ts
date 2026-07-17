import { apiClient } from "@/lib/api/axiosInstance";
import {
  assignResourceRequest,
  createProjectRequest,
  deleteProjectRequest,
  getProjectAssignmentsRequest,
  getProjectListRequest,
  getProjectRequest,
  removeResourceRequest,
  updateProjectRequest,
} from "@/lib/api/project.api";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const PROJECT = {
  id: "1",
  code: "PRJ-ALPHA",
  name: "Project Alpha",
  clientName: "Acme Corp",
  clientEmail: "client@acme.com",
  startDate: "2025-01-15",
  endDate: "2025-12-31",
  maxDailyHours: 8,
  isActive: true,
};

describe("project.api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getProjectListRequest fetches and unwraps the project list", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [PROJECT] } });

    const result = await getProjectListRequest();

    expect(apiClient.get).toHaveBeenCalledWith("/projects");
    expect(result).toEqual([PROJECT]);
  });

  it("getProjectRequest fetches a single project by id", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: PROJECT } });

    const result = await getProjectRequest("1");

    expect(apiClient.get).toHaveBeenCalledWith("/projects/1");
    expect(result).toEqual(PROJECT);
  });

  it("createProjectRequest posts the payload and returns the created project", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: PROJECT } });

    const payload = {
      code: "PRJ-ALPHA",
      name: "Project Alpha",
      clientName: "Acme Corp",
      clientEmail: "client@acme.com",
      startDate: "2025-01-15",
      endDate: "2025-12-31",
      maxDailyHours: 8,
    };
    const result = await createProjectRequest(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/projects", payload);
    expect(result).toEqual(PROJECT);
  });

  it("updateProjectRequest puts the payload to the project's id", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: PROJECT } });

    const payload = { ...PROJECT };
    const result = await updateProjectRequest("1", payload);

    expect(apiClient.put).toHaveBeenCalledWith("/projects/1", payload);
    expect(result).toEqual(PROJECT);
  });

  it("deleteProjectRequest deletes the project by id", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    await deleteProjectRequest("1");

    expect(apiClient.delete).toHaveBeenCalledWith("/projects/1");
  });

  it("getProjectAssignmentsRequest fetches assignments for a project", async () => {
    const assignment = {
      id: "a1",
      userId: "u1",
      userName: "Alex Kumar",
      resourceRoleTypeId: "r1",
      resourceRoleTypeName: "Senior Developer",
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [assignment] } });

    const result = await getProjectAssignmentsRequest("1");

    expect(apiClient.get).toHaveBeenCalledWith("/projects/1/assignments");
    expect(result).toEqual([assignment]);
  });

  it("assignResourceRequest posts the payload to the project's assignments", async () => {
    const assignment = {
      id: "a1",
      userId: "u1",
      resourceRoleTypeId: "r1",
    };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: assignment } });

    const payload = { userId: "u1", resourceRoleTypeId: "r1" };
    const result = await assignResourceRequest("1", payload);

    expect(apiClient.post).toHaveBeenCalledWith("/projects/1/assignments", payload);
    expect(result).toEqual(assignment);
  });

  it("removeResourceRequest deletes the assignment by project and assignment id", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    await removeResourceRequest("1", "a1");

    expect(apiClient.delete).toHaveBeenCalledWith("/projects/1/assignments/a1");
  });
});
