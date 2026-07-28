import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchableSelectField, type SearchableSelectOption } from "@/components/ui/SearchableSelectField";

const OPTIONS: SearchableSelectOption[] = [
  { value: "1", label: "Jamie Smith — jamie@hrsystem.com" },
  { value: "2", label: "Alex Doe — alex@hrsystem.com" },
];

function setup(overrides: Partial<React.ComponentProps<typeof SearchableSelectField>> = {}) {
  const onSelect = jest.fn();
  const onSearchTermChange = jest.fn();
  const props: React.ComponentProps<typeof SearchableSelectField> = {
    label: "User",
    selectedOption: null,
    onSelect,
    searchTerm: "",
    onSearchTermChange,
    options: OPTIONS,
    ...overrides,
  };
  render(<SearchableSelectField {...props} />);
  return { onSelect, onSearchTermChange };
}

describe("SearchableSelectField", () => {
  it("renders a labeled combobox input, closed by default", () => {
    setup();
    const input = screen.getByRole("combobox", { name: "User" });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the listbox and lists options on focus", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("combobox", { name: "User" }));

    expect(screen.getByRole("combobox", { name: "User" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("option", { name: /jamie smith/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /alex doe/i })).toBeInTheDocument();
  });

  it("caps the opened listbox at a 400px max-height and keeps it scrollable", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("combobox", { name: "User" }));

    expect(screen.getByRole("listbox")).toHaveClass("max-h-[400px]", "overflow-y-auto");
  });

  it("calls onSelect and closes the list when an option is clicked", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();

    await user.click(screen.getByRole("combobox", { name: "User" }));
    await user.click(screen.getByRole("option", { name: /jamie smith/i }));

    expect(onSelect).toHaveBeenCalledWith(OPTIONS[0]);
    expect(screen.getByRole("combobox", { name: "User" })).toHaveAttribute("aria-expanded", "false");
  });

  it("calls onSearchTermChange as the user types", async () => {
    const user = userEvent.setup();
    const { onSearchTermChange } = setup();

    await user.type(screen.getByRole("combobox", { name: "User" }), "ja");

    expect(onSearchTermChange).toHaveBeenCalledWith("j");
    expect(onSearchTermChange).toHaveBeenCalledWith("a");
  });

  it("shows the selected option's label when closed", () => {
    setup({ selectedOption: OPTIONS[0] });
    expect(screen.getByRole("combobox", { name: "User" })).toHaveValue(OPTIONS[0].label);
  });

  it("shows a loading row while the first page is loading", async () => {
    const user = userEvent.setup();
    setup({ isLoading: true, options: [] });

    await user.click(screen.getByRole("combobox", { name: "User" }));

    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  });

  it("shows the empty message when there are no options", async () => {
    const user = userEvent.setup();
    setup({ options: [], emptyMessage: "No matching users found." });

    await user.click(screen.getByRole("combobox", { name: "User" }));

    expect(screen.getByText("No matching users found.")).toBeInTheDocument();
  });

  it("shows a load error with a retry button", async () => {
    const user = userEvent.setup();
    const onRetryLoad = jest.fn();
    setup({ loadError: "Unable to load users.", onRetryLoad, options: [] });

    await user.click(screen.getByRole("combobox", { name: "User" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/unable to load users/i);

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetryLoad).toHaveBeenCalled();
  });

  it("shows a 'Loading more…' row while fetching an additional page", async () => {
    const user = userEvent.setup();
    setup({ isFetchingMore: true });

    await user.click(screen.getByRole("combobox", { name: "User" }));

    expect(screen.getByText(/loading more/i)).toBeInTheDocument();
  });

  it("navigates and selects options via the keyboard", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();

    const input = screen.getByRole("combobox", { name: "User" });
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith(OPTIONS[1]);
  });

  it("closes the listbox on Escape", async () => {
    const user = userEvent.setup();
    setup();

    const input = screen.getByRole("combobox", { name: "User" });
    await user.click(input);
    expect(input).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    setup({ disabled: true });

    await user.click(screen.getByRole("combobox", { name: "User" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("calls onLoadMore when the list is scrolled near the bottom and more results are available", async () => {
    const user = userEvent.setup();
    const onLoadMore = jest.fn();
    setup({ hasMore: true, onLoadMore });

    await user.click(screen.getByRole("combobox", { name: "User" }));
    const listbox = screen.getByRole("listbox");
    Object.defineProperty(listbox, "scrollHeight", { value: 300, configurable: true });
    Object.defineProperty(listbox, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(listbox, "scrollTop", { value: 260, configurable: true });

    listbox.dispatchEvent(new Event("scroll"));

    expect(onLoadMore).toHaveBeenCalled();
  });

  it("does not call onLoadMore when there is no more data", async () => {
    const user = userEvent.setup();
    const onLoadMore = jest.fn();
    setup({ hasMore: false, onLoadMore });

    await user.click(screen.getByRole("combobox", { name: "User" }));
    const listbox = screen.getByRole("listbox");
    Object.defineProperty(listbox, "scrollHeight", { value: 300, configurable: true });
    Object.defineProperty(listbox, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(listbox, "scrollTop", { value: 260, configurable: true });

    listbox.dispatchEvent(new Event("scroll"));

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("renders a field-level validation error", () => {
    setup({ error: "Select a user." });
    expect(screen.getByRole("alert")).toHaveTextContent("Select a user.");
    expect(screen.getByRole("combobox", { name: "User" })).toHaveAttribute("aria-invalid", "true");
  });
});
