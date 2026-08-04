import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthYearPicker } from "@/components/ui/MonthYearPicker";

function setup(overrides: Partial<React.ComponentProps<typeof MonthYearPicker>> = {}) {
  const onChange = jest.fn();
  const props: React.ComponentProps<typeof MonthYearPicker> = {
    label: "Month",
    year: 2026,
    month: 7,
    onChange,
    ...overrides,
  };
  render(<MonthYearPicker {...props} />);
  return { onChange };
}

describe("MonthYearPicker", () => {
  it("renders a closed disclosure button showing the selected month and year", () => {
    setup();

    const trigger = screen.getByRole("button", { name: "Month" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("July 2026");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a calendar dialog with year navigation and a month grid on click", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Month" }));

    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: /choose month and year/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "January" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "December" })).toBeInTheDocument();
  });

  it("marks the currently selected month as pressed", async () => {
    const user = userEvent.setup();
    setup({ month: 3 });

    await user.click(screen.getByRole("button", { name: "Month" }));

    expect(screen.getByRole("button", { name: "March" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "April" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the browsed year and clicked month, then closes", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByRole("button", { name: "November" }));

    expect(onChange).toHaveBeenCalledWith(2026, 11);
    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute("aria-expanded", "false");
  });

  it("navigates to the previous/next year without changing the applied selection", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByRole("button", { name: /previous year/i }));

    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /next year/i }));
    await user.click(screen.getByRole("button", { name: /next year/i }));
    expect(screen.getByText("2027")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "May" }));
    expect(onChange).toHaveBeenCalledWith(2027, 5);
  });

  it("disables the previous-year button at minYear and the next-year button at maxYear", async () => {
    const user = userEvent.setup();
    setup({ year: 2026, minYear: 2026, maxYear: 2026 });

    await user.click(screen.getByRole("button", { name: "Month" }));

    expect(screen.getByRole("button", { name: /previous year/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next year/i })).toBeDisabled();
  });

  it("closes the popover on Escape and when clicking outside", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    setup({ disabled: true });

    await user.click(screen.getByRole("button", { name: "Month" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a field-level validation error, described by the trigger button", () => {
    setup({ error: "Select a valid month." });

    const trigger = screen.getByRole("button", { name: "Month" });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Select a valid month.");
    expect(trigger).toHaveAttribute("aria-describedby", alert.id);
  });
});
