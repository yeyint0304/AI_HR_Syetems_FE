import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ToastProvider";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({ push: pushMock }),
}));

const pushMock = vi.fn();

vi.mock("@/lib/mockProjects", () => ({
  getProject: vi.fn(),
  isProjectCodeTaken: vi.fn(),
  updateProject: vi.fn(),
  setProjectStatus: vi.fn(),
}));

import {
  getProject,
  isProjectCodeTaken,
  setProjectStatus,
  updateProject,
} from "@/lib/mockProjects";
import EditProjectPage from "../page";

const ALPHA_PROJECT = {
  id: "1",
  code: "PRJ-ALPHA",
  name: "Project Alpha",
  client: "Acme Corp",
  status: "Active" as const,
  startDate: "2026-01-01",
  endDate: "2026-06-30",
  description: "Core platform revamp for Acme Corp.",
  assignedUserIds: ["u-3"],
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
    vi.mocked(getProject).mockReset().mockReturnValue(ALPHA_PROJECT);
    vi.mocked(isProjectCodeTaken).mockReset().mockReturnValue(false);
    vi.mocked(updateProject).mockReset();
    vi.mocked(setProjectStatus).mockReset();
  });

  it("shows a not-found state when the project does not exist", () => {
    vi.mocked(getProject).mockReturnValue(undefined);
    renderPage();

    expect(screen.getByRole("heading", { name: "Project not found" })).toBeInTheDocument();
  });

  it("pre-fills the form with the project's current data", () => {
    renderPage();

    expect(screen.getByLabelText(/Project name/)).toHaveValue("Project Alpha");
    expect(screen.getByLabelText(/Project code/)).toHaveValue("PRJ-ALPHA");
    expect(screen.getByLabelText(/Client name/)).toHaveValue("Acme Corp");
  });

  it("validates required fields before submitting", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.clear(screen.getByLabelText(/Project name/));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Project name is required.")).toBeInTheDocument();
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("saves the updated project and navigates back to the project list", async () => {
    vi.mocked(updateProject).mockReturnValue({ ...ALPHA_PROJECT, name: "Renamed Project" });
    const user = userEvent.setup();
    renderPage();

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

  it("deactivates the project after confirming in the modal", async () => {
    vi.mocked(setProjectStatus).mockReturnValue({ ...ALPHA_PROJECT, status: "Inactive" });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Deactivate project" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Deactivate" }));

    expect(setProjectStatus).toHaveBeenCalledWith("1", "Inactive");
    expect(await screen.findByText("Project deactivated successfully!")).toBeInTheDocument();
    expect(dialog).not.toBeInTheDocument();
  });

  it("disables the deactivate button once the project is inactive", () => {
    vi.mocked(getProject).mockReturnValue({ ...ALPHA_PROJECT, status: "Inactive" });
    renderPage();

    expect(screen.getByRole("button", { name: "Deactivate project" })).toBeDisabled();
  });
});
