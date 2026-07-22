import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} title="Add exchange rate" onClose={jest.fn()}>
        <p>Form content</p>
      </Modal>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the title, description, and children when open", () => {
    render(
      <Modal open title="Add exchange rate" description="Create a new conversion rate." onClose={jest.fn()}>
        <p>Form content</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Add exchange rate")).toBeInTheDocument();
    expect(screen.getByText("Create a new conversion rate.")).toBeInTheDocument();
    expect(screen.getByText("Form content")).toBeInTheDocument();
  });

  it("calls onClose when the Escape key is pressed", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <Modal open title="Add exchange rate" onClose={onClose}>
        <p>Form content</p>
      </Modal>
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the overlay is clicked", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <Modal open title="Add exchange rate" onClose={onClose}>
        <p>Form content</p>
      </Modal>
    );

    await user.click(screen.getByRole("button", { name: /dismiss dialog/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
