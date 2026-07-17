import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ToastProvider";
import { ApiError } from "@/lib/apiClient";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/api/projects", () => ({
  createProject: vi.fn(),
  mapProjectFieldErrors: vi.fn((fieldErrors) => {
    if (!fieldErrors) return {};
    const map: Record<string, string> = { Code: "code", ClientName: "clientName" };
    const result: Record<string, string> = {};
    for (const [key, messages] of Object.entries(fieldErrors as Record<string, string[]>)) {
      const mappedKey = map[key];
      if (mappedKey) result[mappedKey] = messages[0];
    }
    return result;
  }),
}));

import { createProject } from "@/lib/api/projects";
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
    vi.mocked(createProject).mockResolvedValue({
      id: "99",
      code: "PRJ-GAMMA",
      name: "Project Gamma",
      description: "",
      clientName: "Initech",
      clientEmail: null,
      startDate: "2026-01-01",
      endDate: "2026-06-01",
      maxDailyHours: null,
      isActive: true,
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
      expect.objectContaining({ name: "Project Gamma", code: "PRJ-GAMMA", clientName: "Initech" }),
    );
    expect(await screen.findByText("Project created successfully!")).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith("/projects");
  });

  it("shows the backend's error message and field errors when createProject rejects with an ApiError", async () => {
    vi.mocked(createProject).mockRejectedValue(
      new ApiError("This project code is already taken.", 400, {
        Code: ["This project code is already taken."],
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Project name/), "Project Gamma");
    await user.type(screen.getByLabelText(/Project code/), "PRJ-ALPHA");
    await user.type(screen.getByLabelText(/Client name/), "Initech");
    await user.type(screen.getByLabelText(/Start date/), "2026-01-01");
    await user.type(screen.getByLabelText(/End date/), "2026-06-01");
    await user.click(screen.getByRole("button", { name: "Save project" }));

    const errorMessages = await screen.findAllByText("This project code is already taken.");
    expect(errorMessages.length).toBeGreaterThan(0);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a generic error toast when createProject throws a non-ApiError", async () => {
    vi.mocked(createProject).mockRejectedValue(new Error("boom"));

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
