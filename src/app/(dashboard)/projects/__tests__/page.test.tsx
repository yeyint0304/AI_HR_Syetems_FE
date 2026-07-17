import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ToastProvider";

vi.mock("@/lib/api/projects", () => ({
  getProjectList: vi.fn(),
  deleteProject: vi.fn(),
}));

import { deleteProject, getProjectList } from "@/lib/api/projects";
import ProjectsPage from "../page";

const ALPHA = {
  id: "1",
  code: "PRJ-ALPHA",
  name: "Project Alpha",
  description: null,
  clientName: "Acme Corp",
  clientEmail: null,
  startDate: "2026-01-01",
  endDate: "2026-06-30",
  maxDailyHours: null,
  isActive: true,
};

const BETA = {
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

function renderProjectsPage() {
  render(
    <ToastProvider>
      <ProjectsPage />
    </ToastProvider>,
  );
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.mocked(getProjectList).mockReset().mockResolvedValue([ALPHA, BETA]);
    vi.mocked(deleteProject).mockReset().mockResolvedValue(undefined);
  });

  it("shows a loading state before the project list resolves", () => {
    renderProjectsPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading projects…");
  });

  it("renders the fetched projects and active project count", async () => {
    renderProjectsPage();

    expect(await screen.findByText("PRJ-ALPHA")).toBeInTheDocument();
    expect(screen.getByText("2 active projects")).toBeInTheDocument();
    expect(screen.getByText("PRJ-BETA")).toBeInTheDocument();
  });

  it("shows an error state with a retry action when the request fails", async () => {
    vi.mocked(getProjectList).mockReset().mockRejectedValue(new Error("network down"));
    renderProjectsPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load projects.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("filters projects by search term", async () => {
    const user = userEvent.setup();
    renderProjectsPage();
    await screen.findByText("PRJ-ALPHA");

    await user.type(screen.getByLabelText("Search projects"), "Beta");

    expect(screen.queryByText("PRJ-ALPHA")).not.toBeInTheDocument();
    expect(screen.getByText("PRJ-BETA")).toBeInTheDocument();
  });

  it("shows an empty state when no project matches the search", async () => {
    const user = userEvent.setup();
    renderProjectsPage();
    await screen.findByText("PRJ-ALPHA");

    await user.type(screen.getByLabelText("Search projects"), "no-such-project");

    expect(screen.getByText("No projects match your search.")).toBeInTheDocument();
  });

  it("deletes a project after confirming in the modal and shows a success toast", async () => {
    const user = userEvent.setup();
    renderProjectsPage();
    await screen.findByText("PRJ-ALPHA");

    const alphaRow = screen.getByText("PRJ-ALPHA").closest("tr") as HTMLElement;
    await user.click(within(alphaRow).getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Delete project")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(deleteProject).toHaveBeenCalledWith("1");
    expect(await screen.findByText("Project deleted successfully!")).toBeInTheDocument();
    expect(screen.queryByText("PRJ-ALPHA")).not.toBeInTheDocument();
  });

  it("closes the confirm modal without deleting when cancelled", async () => {
    const user = userEvent.setup();
    renderProjectsPage();
    await screen.findByText("PRJ-ALPHA");

    const alphaRow = screen.getByText("PRJ-ALPHA").closest("tr") as HTMLElement;
    await user.click(within(alphaRow).getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteProject).not.toHaveBeenCalled();
    expect(screen.getByText("PRJ-ALPHA")).toBeInTheDocument();
  });
});
