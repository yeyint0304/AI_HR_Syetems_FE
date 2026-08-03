/**
 * @jest-environment node
 */
import { canApproverActOnEntry } from "@/lib/server/timesheetEntryAuthorization";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getUserRoleName } from "@/lib/server/userRoleDirectory";
import type { AuthUser } from "@/types/auth.types";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn() },
}));

jest.mock("@/lib/server/userRoleDirectory", () => ({
  getUserRoleName: jest.fn(),
}));

function assignmentsResponse(assignments: Array<{ userId: string }>) {
  return {
    data: assignments.map((assignment, index) => ({
      Id: `assignment-${index}`,
      UserId: assignment.userId,
      ResourceRoleTypeId: "role-1",
    })),
  };
}

function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return { id: "manager-1", email: "manager@hrsystem.com", role: "ProjectAdmin", ...overrides };
}

describe("canApproverActOnEntry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("denies a manager acting on their own entry (rule 1), for any role", async () => {
    const projectAdmin = buildUser({ id: "manager-1", role: "ProjectAdmin" });
    const systemAdmin = buildUser({ id: "admin-1", role: "SystemAdmin" });

    await expect(
      canApproverActOnEntry(projectAdmin, { userId: "manager-1", projectId: "project-1" }, "token")
    ).resolves.toBe(false);
    await expect(
      canApproverActOnEntry(systemAdmin, { userId: "admin-1", projectId: "project-1" }, "token")
    ).resolves.toBe(false);

    expect(backendApiClient.get).not.toHaveBeenCalled();
    expect(getUserRoleName).not.toHaveBeenCalled();
  });

  it("allows a SystemAdmin to act on any other user's entry, unconditionally", async () => {
    const systemAdmin = buildUser({ id: "admin-1", role: "SystemAdmin" });

    await expect(
      canApproverActOnEntry(systemAdmin, { userId: "employee-9", projectId: "project-1" }, "token")
    ).resolves.toBe(true);

    expect(getUserRoleName).not.toHaveBeenCalled();
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("denies a role with no manager authority at all (e.g. a plain Employee)", async () => {
    const employee = buildUser({ id: "emp-1", role: "Employee" });

    await expect(
      canApproverActOnEntry(employee, { userId: "employee-9", projectId: "project-1" }, "token")
    ).resolves.toBe(false);
  });

  it("denies a ProjectAdmin acting on a SystemAdmin's entry, even without checking project assignment (rule 2)", async () => {
    const projectAdmin = buildUser({ id: "manager-1", role: "ProjectAdmin" });
    (getUserRoleName as jest.Mock).mockResolvedValueOnce("SystemAdmin");

    await expect(
      canApproverActOnEntry(projectAdmin, { userId: "other-sysadmin", projectId: "project-1" }, "token")
    ).resolves.toBe(false);

    expect(getUserRoleName).toHaveBeenCalledWith("other-sysadmin", "token");
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("allows a ProjectAdmin to act on a non-SystemAdmin's entry when assigned to its project (rule 3)", async () => {
    const projectAdmin = buildUser({ id: "manager-1", role: "ProjectAdmin" });
    (getUserRoleName as jest.Mock).mockResolvedValueOnce("Employee");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(
      assignmentsResponse([{ userId: "manager-1" }])
    );

    await expect(
      canApproverActOnEntry(projectAdmin, { userId: "employee-9", projectId: "project-1" }, "token")
    ).resolves.toBe(true);

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Project/GetProjectAssignments/project-1",
      expect.objectContaining({ headers: { Authorization: "Bearer token" } })
    );
  });

  it("denies a ProjectAdmin acting on a non-SystemAdmin's entry when not assigned to its project", async () => {
    const projectAdmin = buildUser({ id: "manager-1", role: "ProjectAdmin" });
    (getUserRoleName as jest.Mock).mockResolvedValueOnce("ProjectAdmin");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(assignmentsResponse([]));

    await expect(
      canApproverActOnEntry(projectAdmin, { userId: "other-pm", projectId: "project-1" }, "token")
    ).resolves.toBe(false);
  });
});
