import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ToastProvider";
import { ApiError } from "@/lib/apiClient";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/api/projects", () => ({
  getProjectById: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  mapProjectFieldErrors: vi.fn(() => ({})),
}));

import { deleteProject, getProjectById, updateProject } from "@/lib/api/projects";
import EditProjectPage from "../page";

const ALPHA_PROJECT = {
  id: "1",
  code: "PRJ-ALPHA",
  name: "Project Alpha",
  description: "Core platform revamp for Acme Corp.",
  clientName: "Acme Corp",
  clientEmail: null,
  startDate: "2026-01-01",
  endDate: "2026-06-30",
  maxDailyHours: null,
  isActive: true,
};

function renderPage() {
  render(
    <ToastProvider>
      <EditProjectPage />
    </ToastProvider>,
  );
}

describe("EditProjectPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(getProjectById).mockReset().mockResolvedValue(ALPHA_PROJECT);
    vi.mocked(updateProject).mockReset();
    vi.mocked(deleteProject).mockReset().mockResolvedValue(undefined);
  });

  it("shows a loading state before the project resolves", () => {
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading project…");
  });

  it("shows a not-found state when the project does not exist", async () => {
    vi.mocked(getProjectById).mockRejectedValue(new ApiError("Not found", 404));
    renderPage();

    expect(await screen.findByRole("heading", { name: "Project not found" })).toBeInTheDocument();
  });

  it("shows an error state with retry when the request fails", async () => {
    vi.mocked(getProjectById).mockRejectedValue(new ApiError("Server error", 500));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("pre-fills the form with the project's current data", async () => {
    renderPage();

    expect(await screen.findByLabelText(/Project name/)).toHaveValue("Project Alpha");
    expect(screen.getByLabelText(/Project code/)).toHaveValue("PRJ-ALPHA");
    expect(screen.getByLabelText(/Client name/)).toHaveValue("Acme Corp");
  });

  it("validates required fields before submitting", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText(/Project name/);

    await user.clear(screen.getByLabelText(/Project name/));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Project name is required.")).toBeInTheDocument();
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("saves the updated project and navigates back to the project list", async () => {
    vi.mocked(updateProject).mockResolvedValue({ ...ALPHA_PROJECT, name: "Renamed Project" });
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText(/Project name/);

    await user.clear(screen.getByLabelText(/Project name/));
    await user.type(screen.getByLabelText(/Project name/), "Renamed Project");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateProject).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ name: "Renamed Project" }),
    );
    expect(await screen.findByText("Project updated successfully!")).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith("/projects");
  });

  it("deletes the project after confirming in the modal", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText(/Project name/);

    await user.click(screen.getByRole("button", { name: "Delete Project" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteProject).toHaveBeenCalledWith("1");
    expect(await screen.findByText("Project deleted successfully!")).toBeInTheDocument();
    expect(dialog).not.toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith("/projects");
  });
});
