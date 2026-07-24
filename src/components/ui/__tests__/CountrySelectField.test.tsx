import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CountrySelectField } from "@/components/ui/CountrySelectField";

const COUNTRIES = [
  { id: "22222222-2222-2222-2222-222222222201", code: "SG", name: "Singapore" },
  { id: "22222222-2222-2222-2222-222222222202", code: "US", name: "United States" },
];

describe("CountrySelectField", () => {
  it("renders a combobox with all countries as options when opened", async () => {
    const user = userEvent.setup();
    render(<CountrySelectField countries={COUNTRIES} value="" onChange={jest.fn()} />);

    const field = screen.getByLabelText(/^country$/i);
    expect(field).toHaveAttribute("role", "combobox");
    await user.click(field);

    expect(screen.getByRole("option", { name: "Singapore (SG)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "United States (US)" })).toBeInTheDocument();
  });

  it("filters options as the user types", async () => {
    const user = userEvent.setup();
    render(<CountrySelectField countries={COUNTRIES} value="" onChange={jest.fn()} />);

    const field = screen.getByLabelText(/^country$/i);
    await user.click(field);
    await user.type(field, "United");

    expect(screen.getByRole("option", { name: "United States (US)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Singapore (SG)" })).not.toBeInTheDocument();
  });

  it("calls onChange with the selected country's id when an option is clicked", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<CountrySelectField countries={COUNTRIES} value="" onChange={onChange} />);

    const field = screen.getByLabelText(/^country$/i);
    await user.click(field);
    await user.click(screen.getByRole("option", { name: "United States (US)" }));

    expect(onChange).toHaveBeenCalledWith("22222222-2222-2222-2222-222222222202");
  });

  it("shows the selected country's label when closed", () => {
    render(
      <CountrySelectField
        countries={COUNTRIES}
        value="22222222-2222-2222-2222-222222222201"
        onChange={jest.fn()}
      />
    );

    expect(screen.getByLabelText(/^country$/i)).toHaveValue("Singapore (SG)");
  });

  it("renders as disabled with a loading placeholder while loading", () => {
    render(<CountrySelectField countries={[]} value="" onChange={jest.fn()} isLoading disabled />);

    const field = screen.getByLabelText(/^country$/i);
    expect(field).toBeDisabled();
    expect(field).toHaveAttribute("placeholder", "Loading countries…");
  });

  it("shows a field-level error message", () => {
    render(
      <CountrySelectField countries={COUNTRIES} value="" onChange={jest.fn()} error="Select a country." />
    );

    expect(screen.getByText("Select a country.")).toBeInTheDocument();
  });
});
