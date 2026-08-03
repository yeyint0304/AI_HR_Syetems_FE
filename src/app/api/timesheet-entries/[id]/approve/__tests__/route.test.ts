/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts` / `app/api/timesheet-periods/[id]/lock/__tests__/route.test.ts`.
 */
import { PUT } from "@/app/api/timesheet-entries/[id]/approve/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn(), put: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function base64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Builds an unsigned JWT carrying the given claims (payload-decoding only — see `lib/utils/jwt.ts`). */
function buildToken(claims: Record<string, unknown>): string {
  return [base64Url(JSON.stringify({ alg: "none", typ: "JWT" })), base64Url(JSON.stringify(claims)), "sig"].join(
    "."
  );
}

const projectAdminToken = buildToken({
  sub: "manager-1",
  email: "admin@hrsystem.com",
  role: "ProjectAdmin",
});

const systemAdminToken = buildToken({
  sub: "sysadmin-1",
  email: "sysadmin@hrsystem.com",
  role: "SystemAdmin",
});

/** Response for the `Project/GetProjectAssignments/{projectId}` lookup `canApproverActOnEntry` performs. */
function assignmentsEnvelope(assignments: Array<{ userId: string }>) {
  return {
    data: {
      StatusCode: 200,
      IsSuccess: true,
      Message: "Success",
      Data: assignments.map((assignment, index) => ({
        Id: `assignment-${index}`,
        UserId: assignment.userId,
        ResourceRoleTypeId: "role-1",
      })),
    },
  };
}

/** Response for the `Auth/SearchUsers?isAllRole=true` lookup `canApproverActOnEntry` performs (`getUserRoleName`). */
function userRolesEnvelope(users: Array<{ userId: string; roleName: string }>) {
  return {
    data: {
      StatusCode: 200,
      IsSuccess: true,
      Message: "Success",
      Data: { TotalCount: users.length, PageNo: 1, PageSize: 500, Items: users.map((u) => ({ UserId: u.userId, RoleName: u.roleName })) },
    },
  };
}

/**
 * Mocks the `GetTimesheetEntryById` lookup `fetchEntryForApproval` performs
 * before approving. Defaults to a still-pending entry owned by `manager-1`
 * (the signed-in `projectAdminToken` above) so the tests that don't override
 * `UserId` exercise the self-approval-is-now-denied path.
 */
function mockEntryLookup(overrides: Record<string, unknown> = {}) {
  (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
    data: {
      StatusCode: 200,
      IsSuccess: true,
      Message: "OK",
      Data: {
        Id: "1",
        UserId: "manager-1",
        ProjectId: "project-1",
        TimesheetPeriodId: "period-1",
        EntryDate: "2025-02-24",
        Hours: 4,
        TaskDescription: "Work",
        IsApproved: false,
        ...overrides,
      },
    },
  });
}

describe("PUT /api/timesheet-entries/[id]/approve", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not approve timesheet entries", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" })
    );

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("404s when the entry does not exist", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "Timesheet entry not found.", Data: null },
    });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Timesheet entry not found.");
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("409s without calling the backend's approve endpoint when the entry is already approved", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    // Owned by someone else so the request clears the self-approval and
    // role/project-scope checks before reaching the already-approved check.
    mockEntryLookup({ UserId: "employee-9", IsApproved: true });
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(
      userRolesEnvelope([{ userId: "employee-9", roleName: "Employee" }])
    );
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(assignmentsEnvelope([{ userId: "manager-1" }]));

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("This timesheet entry has already been approved.");
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  // `feature/user-deactivate`: "System Admin and Project Admin cannot
  // approve or reject their own timesheet" — self-approval is now denied,
  // reversing the previous "self-approval is intentionally permitted"
  // behavior.
  it("403s a manager approving their own still-pending entry, with a dedicated message", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    // `UserId: "manager-1"` matches the signed-in caller's `sub`.
    mockEntryLookup({ UserId: "manager-1" });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toBe("You cannot approve your own timesheet entry.");
    expect(backendApiClient.put).not.toHaveBeenCalled();
    // No directory/assignments lookup is needed to reject a self-approval.
    expect(backendApiClient.get).toHaveBeenCalledTimes(1);
  });

  it("403s a SystemAdmin approving their own still-pending entry too", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    mockEntryLookup({ UserId: "sysadmin-1" });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toBe("You cannot approve your own timesheet entry.");
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("allows a manager assigned to the project to approve another user's still-pending entry and returns 200 on success", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    mockEntryLookup({ UserId: "employee-9" });
    // `getUserRoleName`'s directory lookup — "employee-9" isn't a SystemAdmin.
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(
      userRolesEnvelope([{ userId: "employee-9", roleName: "Employee" }])
    );
    // `canApproverActOnEntry`'s assignments lookup — `manager-1` is an
    // assigned resource on `project-1` (the entry's project).
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(assignmentsEnvelope([{ userId: "manager-1" }]));
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Timesheet entry approved successfully.",
        Data: { Id: "1", IsApproved: true, ApprovedAt: "2026-06-22T05:18:00Z", ApprovedBy: "manager-1" },
      },
    });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Timesheet entry approved successfully.");
  });

  it("403s a ProjectAdmin approving another user's entry on a project they are not assigned to", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    mockEntryLookup({ UserId: "employee-9" });
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(
      userRolesEnvelope([{ userId: "employee-9", roleName: "Employee" }])
    );
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(assignmentsEnvelope([])); // not assigned

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toMatch(/do not have permission/i);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  // `feature/user-deactivate`: "For System Admin, their timesheet can only
  // be approved by other System Admins" — a ProjectAdmin is blocked here even
  // though they *are* an assigned resource on the entry's project.
  it("403s a ProjectAdmin approving a SystemAdmin's entry, even on a project they are assigned to", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    mockEntryLookup({ UserId: "other-sysadmin" });
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(
      userRolesEnvelope([{ userId: "other-sysadmin", roleName: "SystemAdmin" }])
    );

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toMatch(/do not have permission/i);
    expect(backendApiClient.put).not.toHaveBeenCalled();
    // Blocked by role before ever reaching the project-assignments lookup.
    expect(backendApiClient.get).toHaveBeenCalledTimes(2);
  });

  it("allows a SystemAdmin to approve another user's entry regardless of project assignment", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    mockEntryLookup({ UserId: "employee-9" });
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Timesheet entry approved successfully.",
        Data: { Id: "1", IsApproved: true, ApprovedAt: "2026-06-22T05:18:00Z", ApprovedBy: "sysadmin-1" },
      },
    });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );

    expect(response.status).toBe(200);
    // SystemAdmin is exempt from both the role check and project scoping, so
    // neither the user-role directory nor the assignments lookup is
    // consulted — only the one `GetTimesheetEntryById` call from `mockEntryLookup`.
    expect(backendApiClient.get).toHaveBeenCalledTimes(1);
  });

  it("forwards the backend's message for an expected 4xx logical failure from the approve call itself", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    mockEntryLookup({ UserId: "employee-9" });
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(
      userRolesEnvelope([{ userId: "employee-9", roleName: "Employee" }])
    );
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(assignmentsEnvelope([{ userId: "manager-1" }]));
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 400, IsSuccess: false, Message: "Unable to process this approval request.", Data: null },
    });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Unable to process this approval request.");
  });

  it("sanitizes a 5xx envelope-based logical failure instead of forwarding the raw backend message", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    mockEntryLookup({ UserId: "employee-9" });
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(
      userRolesEnvelope([{ userId: "employee-9", roleName: "Employee" }])
    );
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(assignmentsEnvelope([{ userId: "manager-1" }]));
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 500,
        IsSuccess: false,
        Message: "System.Data.SqlClient.SqlException",
        Data: null,
      },
    });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to approve this timesheet entry.");
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    mockEntryLookup({ UserId: "employee-9" });
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(
      userRolesEnvelope([{ userId: "employee-9", roleName: "Employee" }])
    );
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(assignmentsEnvelope([{ userId: "manager-1" }]));
    (backendApiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );

    expect(response.status).toBe(502);
  });

  it("returns a 502 fallback when the entry lookup itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );

    expect(response.status).toBe(502);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });
});
