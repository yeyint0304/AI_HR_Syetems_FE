import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete project"
        description="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders the title, description, and default action labels when open", () => {
    render(
      <ConfirmDialog
        open
        title="Delete project"
        description="Are you sure you want to delete this project?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Delete project")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to delete this project?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("supports custom confirm/cancel labels", () => {
    render(
      <ConfirmDialog
        open
        title="Remove assignment"
        description="Remove this user?"
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        title="Delete project"
        description="Are you sure?"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the Cancel button is clicked", async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        title="Delete project"
        description="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the Escape key is pressed", async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        title="Delete project"
        description="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the overlay is clicked", async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        title="Delete project"
        description="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole("button", { name: /dismiss dialog/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables the Cancel button and shows a busy confirm button while isConfirming", () => {
    render(
      <ConfirmDialog
        open
        title="Delete project"
        description="Are you sure?"
        isConfirming
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveAttribute("aria-busy", "true");
  });
});
