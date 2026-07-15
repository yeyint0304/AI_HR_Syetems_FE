import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ToastProvider";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/mockProjects", () => ({
  createProject: vi.fn(),
  isProjectCodeTaken: vi.fn(),
}));

import { createProject, isProjectCodeTaken } from "@/lib/mockProjects";
import NewProjectPage from "../page";

function renderPage() {
  render(
    <ToastProvider>
      <NewProjectPage />
    </ToastProvider>,
  );
}

describe("NewProjectPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(createProject).mockReset();
    vi.mocked(isProjectCodeTaken).mockReset().mockReturnValue(false);
  });

  it("renders the create project form", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Project name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project code/)).toBeInTheDocument();
  });

  it("shows validation errors for required fields and does not call createProject", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Save project" }));

    expect(await screen.findByText("Project name is required.")).toBeInTheDocument();
    expect(screen.getByText("Project code is required.")).toBeInTheDocument();
    expect(screen.getByText("Client name is required.")).toBeInTheDocument();
    expect(screen.getByText("Start date is required.")).toBeInTheDocument();
    expect(screen.getByText("End date is required.")).toBeInTheDocument();
    expect(createProject).not.toHaveBeenCalled();
  });

  it("shows an error when the project code is already taken", async () => {
    vi.mocked(isProjectCodeTaken).mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Project code/), "PRJ-ALPHA");
    await user.click(screen.getByRole("button", { name: "Save project" }));

    expect(await screen.findByText("This project code is already taken.")).toBeInTheDocument();
    expect(createProject).not.toHaveBeenCalled();
  });

  it("validates that the end date is after the start date", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Project name/), "Project Gamma");
    await user.type(screen.getByLabelText(/Project code/), "PRJ-GAMMA");
    await user.type(screen.getByLabelText(/Client name/), "Initech");
    await user.type(screen.getByLabelText(/Start date/), "2026-06-01");
    await user.type(screen.getByLabelText(/End date/), "2026-01-01");
    await user.click(screen.getByRole("button", { name: "Save project" }));

    expect(
      await screen.findByText("End date must be after the start date."),
    ).toBeInTheDocument();
    expect(createProject).not.toHaveBeenCalled();
  });

  it("submits a valid form, shows a success toast, and navigates back to the project list", async () => {
    vi.mocked(createProject).mockReturnValue({
      id: "99",
      code: "PRJ-GAMMA",
      name: "Project Gamma",
      client: "Initech",
      status: "Active",
      startDate: "2026-01-01",
      endDate: "2026-06-01",
      description: "",
      assignedUserIds: [],
    });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Project name/), "Project Gamma");
    await user.type(screen.getByLabelText(/Project code/), "PRJ-GAMMA");
    await user.type(screen.getByLabelText(/Client name/), "Initech");
    await user.type(screen.getByLabelText(/Start date/), "2026-01-01");
    await user.type(screen.getByLabelText(/End date/), "2026-06-01");
    await user.click(screen.getByRole("button", { name: "Save project" }));

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Project Gamma", code: "PRJ-GAMMA", client: "Initech" }),
    );
    expect(await screen.findByText("Project created successfully!")).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith("/projects");
  });

  it("shows an error toast when createProject throws", async () => {
    vi.mocked(createProject).mockImplementation(() => {
      throw new Error("boom");
    });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Project name/), "Project Gamma");
    await user.type(screen.getByLabelText(/Project code/), "PRJ-GAMMA");
    await user.type(screen.getByLabelText(/Client name/), "Initech");
    await user.type(screen.getByLabelText(/Start date/), "2026-01-01");
    await user.type(screen.getByLabelText(/End date/), "2026-06-01");
    await user.click(screen.getByRole("button", { name: "Save project" }));

    const errorMessages = await screen.findAllByText("Unable to create project.");
    expect(errorMessages.length).toBeGreaterThan(0);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
