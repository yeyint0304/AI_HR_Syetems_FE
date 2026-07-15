import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshModule() {
  vi.resetModules();
  window.localStorage.clear();
  return import("../mockProjects");
}

describe("mockProjects", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("seeds two active projects by default", async () => {
    const { listProjects } = await freshModule();
    const projects = listProjects();
    expect(projects).toHaveLength(2);
    expect(projects.map((p) => p.code)).toEqual(["PRJ-ALPHA", "PRJ-BETA"]);
  });

  it("creates a new project and persists it to localStorage", async () => {
    const { createProject, listProjects } = await freshModule();

    const created = createProject({
      code: "prj-gamma",
      name: "  Project Gamma  ",
      client: "  Initech  ",
      status: "Active",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      description: "  New client work  ",
    });

    expect(created.code).toBe("prj-gamma");
    expect(created.name).toBe("Project Gamma");
    expect(created.client).toBe("Initech");
    expect(created.description).toBe("New client work");
    expect(created.assignedUserIds).toEqual([]);
    expect(listProjects()).toHaveLength(3);

    const stored = JSON.parse(window.localStorage.getItem("hr_mock_projects_v1") ?? "[]");
    expect(stored).toHaveLength(3);
  });

  it("detects a taken project code case-insensitively, excluding the current project when editing", async () => {
    const { isProjectCodeTaken } = await freshModule();

    expect(isProjectCodeTaken("prj-alpha")).toBe(true);
    expect(isProjectCodeTaken("PRJ-ALPHA", "1")).toBe(false);
    expect(isProjectCodeTaken("prj-does-not-exist")).toBe(false);
  });

  it("updates an existing project and throws for an unknown id", async () => {
    const { updateProject, getProject } = await freshModule();

    const updated = updateProject("1", {
      code: "PRJ-ALPHA",
      name: "Project Alpha Renamed",
      client: "Acme Corp",
      status: "Active",
      startDate: "2026-01-01",
      endDate: "2026-06-30",
      description: "Updated description",
    });

    expect(updated.name).toBe("Project Alpha Renamed");
    expect(getProject("1")?.name).toBe("Project Alpha Renamed");

    expect(() =>
      updateProject("missing-id", {
        code: "X",
        name: "X",
        client: "X",
        status: "Active",
        startDate: "2026-01-01",
        endDate: "2026-01-02",
        description: "",
      }),
    ).toThrow("Project not found.");
  });

  it("sets project status and throws for an unknown id", async () => {
    const { setProjectStatus } = await freshModule();

    const deactivated = setProjectStatus("2", "Inactive");
    expect(deactivated.status).toBe("Inactive");

    expect(() => setProjectStatus("missing-id", "Inactive")).toThrow("Project not found.");
  });

  it("assigns a user without creating duplicates, and removes a user", async () => {
    const { assignUserToProject, removeUserFromProject, getProject } = await freshModule();

    const assigned = assignUserToProject("2", "u-2");
    expect(assigned.assignedUserIds).toEqual(["u-2"]);

    // Assigning the same user again should be a no-op, not a duplicate.
    const assignedAgain = assignUserToProject("2", "u-2");
    expect(assignedAgain.assignedUserIds).toEqual(["u-2"]);

    const removed = removeUserFromProject("2", "u-2");
    expect(removed.assignedUserIds).toEqual([]);
    expect(getProject("2")?.assignedUserIds).toEqual([]);
  });

  it("throws when assigning to or removing from a non-existent project", async () => {
    const { assignUserToProject, removeUserFromProject } = await freshModule();

    expect(() => assignUserToProject("missing-id", "u-1")).toThrow("Project not found.");
    expect(() => removeUserFromProject("missing-id", "u-1")).toThrow("Project not found.");
  });
});
