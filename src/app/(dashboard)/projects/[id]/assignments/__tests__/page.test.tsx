import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ToastProvider";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "2" }),
}));

vi.mock("@/lib/mockProjects", () => ({
  getProject: vi.fn(),
  assignUserToProject: vi.fn(),
  removeUserFromProject: vi.fn(),
}));

vi.mock("@/lib/mockUsers", () => ({
  listMockUsers: vi.fn(),
}));

import { assignUserToProject, getProject, removeUserFromProject } from "@/lib/mockProjects";
import { listMockUsers } from "@/lib/mockUsers";
import ProjectAssignmentsPage from "../page";

const BETA_PROJECT = {
  id: "2",
  code: "PRJ-BETA",
  name: "Project Beta",
  client: "Globex Inc",
  status: "Active" as const,
  startDate: "2026-02-01",
  endDate: "2026-12-31",
  description: "Data migration and reporting rollout for Globex.",
  assignedUserIds: [] as string[],
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

function renderPage() {
  render(
    <ToastProvider>
      <ProjectAssignmentsPage />
    </ToastProvider>,
  );
}

describe("ProjectAssignmentsPage", () => {
  beforeEach(() => {
    vi.mocked(getProject).mockReset().mockReturnValue(BETA_PROJECT);
    vi.mocked(listMockUsers).mockReset().mockReturnValue(ALL_USERS);
    vi.mocked(assignUserToProject).mockReset();
    vi.mocked(removeUserFromProject).mockReset();
  });

  it("shows a not-found state when the project does not exist", () => {
    vi.mocked(getProject).mockReturnValue(undefined);
    renderPage();

    expect(screen.getByRole("heading", { name: "Project not found" })).toBeInTheDocument();
  });

  it("shows an empty state when no users are assigned", () => {
    renderPage();

    expect(screen.getByText("No users assigned yet.")).toBeInTheDocument();
    expect(screen.getByText("0 users currently assigned")).toBeInTheDocument();
  });

  it("lists unassigned users in the add-user select", () => {
    renderPage();

    const select = screen.getByLabelText("Select a user");
    expect(within(select).getByText(/Sarah Chen/)).toBeInTheDocument();
    expect(within(select).getByText(/Alex Kumar/)).toBeInTheDocument();
  });

  it("assigns a selected user to the project and shows a success toast", async () => {
    vi.mocked(assignUserToProject).mockReturnValue({
      ...BETA_PROJECT,
      assignedUserIds: ["u-2"],
    });
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Select a user"), "u-2");
    await user.click(screen.getByRole("button", { name: "Add user" }));

    expect(assignUserToProject).toHaveBeenCalledWith("2", "u-2");
    expect(
      await screen.findByText("Sarah Chen assigned to project."),
    ).toBeInTheDocument();
  });

  it("disables the add-user button until a user is selected", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Add user" })).toBeDisabled();
  });

  it("removes an assigned user after confirming in the modal", async () => {
    vi.mocked(getProject).mockReturnValue({ ...BETA_PROJECT, assignedUserIds: ["u-3"] });
    vi.mocked(removeUserFromProject).mockReturnValue({ ...BETA_PROJECT, assignedUserIds: [] });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(removeUserFromProject).toHaveBeenCalledWith("2", "u-3");
    expect(
      await screen.findByText("Alex Kumar removed from project."),
    ).toBeInTheDocument();
  });
});
