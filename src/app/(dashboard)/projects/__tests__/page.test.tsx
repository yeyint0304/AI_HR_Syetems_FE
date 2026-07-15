import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

async function renderProjectsPage() {
  vi.resetModules();
  window.localStorage.clear();
  // Import the page and its ToastProvider dependency from the *same* fresh
  // module registry so they share the same React Context instance.
  const { default: ProjectsPage } = await import("../page");
  const { ToastProvider } = await import("@/components/ToastProvider");
  render(
    <ToastProvider>
      <ProjectsPage />
    </ToastProvider>,
  );
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the seeded projects and active project count", async () => {
    await renderProjectsPage();

    expect(screen.getByText("2 active projects")).toBeInTheDocument();
    expect(screen.getByText("PRJ-ALPHA")).toBeInTheDocument();
    expect(screen.getByText("PRJ-BETA")).toBeInTheDocument();
  });

  it("filters projects by search term", async () => {
    const user = userEvent.setup();
    await renderProjectsPage();

    await user.type(screen.getByLabelText("Search projects"), "Beta");

    expect(screen.queryByText("PRJ-ALPHA")).not.toBeInTheDocument();
    expect(screen.getByText("PRJ-BETA")).toBeInTheDocument();
  });

  it("shows an empty state when no project matches the search", async () => {
    const user = userEvent.setup();
    await renderProjectsPage();

    await user.type(screen.getByLabelText("Search projects"), "no-such-project");

    expect(screen.getByText("No projects match your search.")).toBeInTheDocument();
  });

  it("deactivates a project after confirming in the modal and shows a success toast", async () => {
    const user = userEvent.setup();
    await renderProjectsPage();

    const alphaRow = screen.getByText("PRJ-ALPHA").closest("tr");
    expect(alphaRow).not.toBeNull();

    const deleteButton = within(alphaRow as HTMLElement).getByRole("button", { name: "Delete" });
    await user.click(deleteButton);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Deactivate project")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));

    expect(await screen.findByText("Project deactivated successfully!")).toBeInTheDocument();
    expect(screen.getByText("1 active project")).toBeInTheDocument();

    const updatedRow = screen.getByText("PRJ-ALPHA").closest("tr") as HTMLElement;
    expect(within(updatedRow).getByText("Inactive")).toBeInTheDocument();
    expect(within(updatedRow).getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("closes the confirm modal without changing status when cancelled", async () => {
    const user = userEvent.setup();
    await renderProjectsPage();

    const alphaRow = screen.getByText("PRJ-ALPHA").closest("tr") as HTMLElement;
    await user.click(within(alphaRow).getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("2 active projects")).toBeInTheDocument();
  });
});
