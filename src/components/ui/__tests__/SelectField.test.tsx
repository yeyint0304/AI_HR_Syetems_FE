import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectField } from "@/components/ui/SelectField";

const OPTIONS = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
];

describe("SelectField", () => {
  it("renders the placeholder option as disabled by default", () => {
    render(<SelectField label="Role" placeholder="Select a role" options={OPTIONS} onChange={jest.fn()} />);

    const select = screen.getByLabelText(/^role$/i);
    expect(within(select).getByRole("option", { name: "Select a role" })).toBeDisabled();
  });

  it("keeps the placeholder option enabled and reselectable when placeholderDisabled is false", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <SelectField
        label="Project"
        placeholder="All Projects"
        placeholderDisabled={false}
        options={OPTIONS}
        onChange={onChange}
      />
    );

    const select = screen.getByLabelText(/^project$/i);
    expect(within(select).getByRole("option", { name: "All Projects" })).toBeEnabled();

    await user.selectOptions(select, "Option A");
    expect(select).toHaveValue("a");

    // Must still be reachable/enabled after a specific option was chosen.
    expect(within(select).getByRole("option", { name: "All Projects" })).toBeEnabled();
    await user.selectOptions(select, "All Projects");
    expect(select).toHaveValue("");
  });

  it("associates the label, hint, and error via accessible attributes", () => {
    render(
      <SelectField
        label="Status"
        hint="Pick one"
        error="Required"
        placeholder="Select"
        options={OPTIONS}
        onChange={jest.fn()}
      />
    );

    const select = screen.getByLabelText(/^status$/i);
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("forwards standard select props such as disabled and value", () => {
    render(
      <SelectField
        label="Status"
        placeholder="Select"
        options={OPTIONS}
        value="b"
        disabled
        onChange={jest.fn()}
      />
    );

    const select = screen.getByLabelText(/^status$/i);
    expect(select).toBeDisabled();
    expect(select).toHaveValue("b");
  });
});
