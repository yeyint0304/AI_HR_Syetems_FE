import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ToastProvider";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "2" }),
}));

vi.mock("@/lib/api/projects", () => ({
  getProjectById: vi.fn(),
  getProjectAssignments: vi.fn(),
  assignResource: vi.fn(),
  removeResource: vi.fn(),
}));

vi.mock("@/lib/api/resourceRoleTypes", () => ({
  getResourceRoleTypes: vi.fn(),
}));

vi.mock("@/lib/mockUsers", () => ({
  listMockUsers: vi.fn(),
}));

import {
  assignResource,
  getProjectAssignments,
  getProjectById,
  removeResource,
} from "@/lib/api/projects";
import { getResourceRoleTypes } from "@/lib/api/resourceRoleTypes";
import { listMockUsers } from "@/lib/mockUsers";
import ProjectAssignmentsPage from "../page";

const BETA_PROJECT = {
  id: "2",
  code: "PRJ-BETA",
  name: "Project Beta",
  description: null,
  clientName: "Globex Inc",
  clientEmail: null,
  startDate: "2026-02-01",
  endDate: "2026-12-31",
  maxDailyHours: null,
  isActive: true,
};

const ALL_USERS = [
  {
    id: "u-2",
    username: "sarah",
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah@hrsystem.com",
    role: "PROJECT_ADMIN" as const,
    countryCode: "SG",
    jobRole: "Project Admin",
  },
  {
    id: "u-3",
    username: "alex",
    firstName: "Alex",
    lastName: "Kumar",
    email: "alex@hrsystem.com",
    role: "ASSIGNED_USER" as const,
    countryCode: "IN",
    jobRole: "Senior Developer",
  },
];

const ROLE_TYPES = [{ id: "r-1", name: "Software Engineer", description: null }];

function renderPage() {
  render(
    <ToastProvider>
      <ProjectAssignmentsPage />
    </ToastProvider>,
  );
}

describe("ProjectAssignmentsPage", () => {
  beforeEach(() => {
    vi.mocked(getProjectById).mockReset().mockResolvedValue(BETA_PROJECT);
    vi.mocked(getProjectAssignments).mockReset().mockResolvedValue([]);
    vi.mocked(getResourceRoleTypes).mockReset().mockResolvedValue(ROLE_TYPES);
    vi.mocked(listMockUsers).mockReset().mockReturnValue(ALL_USERS);
    vi.mocked(assignResource).mockReset();
    vi.mocked(removeResource).mockReset().mockResolvedValue(undefined);
  });

  it("shows a loading state before data resolves", () => {
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading assignments…");
  });

  it("shows an empty state when no users are assigned", async () => {
    renderPage();

    expect(await screen.findByText("No users assigned yet.")).toBeInTheDocument();
    expect(screen.getByText("0 users currently assigned")).toBeInTheDocument();
  });

  it("lists unassigned users and available roles in the add-user selects", async () => {
    renderPage();
    await screen.findByText("No users assigned yet.");

    const userSelect = screen.getByLabelText("Select a user");
    expect(within(userSelect).getByText(/Sarah Chen/)).toBeInTheDocument();
    expect(within(userSelect).getByText(/Alex Kumar/)).toBeInTheDocument();

    const roleSelect = screen.getByLabelText("Select a resource role");
    expect(within(roleSelect).getByText("Software Engineer")).toBeInTheDocument();
  });

  it("assigns a selected user and role to the project and shows a success toast", async () => {
    vi.mocked(assignResource).mockResolvedValue({
      id: "a-1",
      projectId: "2",
      userId: "u-2",
      resourceRoleTypeId: "r-1",
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("No users assigned yet.");

    await user.selectOptions(screen.getByLabelText("Select a user"), "u-2");
    await user.selectOptions(screen.getByLabelText("Select a resource role"), "r-1");
    await user.click(screen.getByRole("button", { name: "Add user" }));

    expect(assignResource).toHaveBeenCalledWith("2", { userId: "u-2", resourceRoleTypeId: "r-1" });
    expect(await screen.findByText("Sarah Chen assigned to project.")).toBeInTheDocument();
  });

  it("disables the add-user button until both a user and role are selected", async () => {
    renderPage();
    await screen.findByText("No users assigned yet.");

    expect(screen.getByRole("button", { name: "Add user" })).toBeDisabled();
  });

  it("removes an assigned user after confirming in the modal", async () => {
    vi.mocked(getProjectAssignments)
      .mockReset()
      .mockResolvedValue([{ id: "a-1", projectId: "2", userId: "u-3", resourceRoleTypeId: "r-1" }]);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Alex Kumar");

    await user.click(screen.getByRole("button", { name: "Remove" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(removeResource).toHaveBeenCalledWith("2", "a-1");
    expect(await screen.findByText("Alex Kumar removed from project.")).toBeInTheDocument();
  });
});
