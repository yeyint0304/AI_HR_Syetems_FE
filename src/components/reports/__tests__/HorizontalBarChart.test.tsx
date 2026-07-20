import { render, screen } from "@testing-library/react";
import { HorizontalBarChart } from "@/components/reports/HorizontalBarChart";

describe("HorizontalBarChart", () => {
  it("renders the title and each bar's label and value as plain text", () => {
    render(
      <HorizontalBarChart
        title="Hours by Role"
        bars={[
          { label: "Developer", value: 80, valueLabel: "80h" },
          { label: "QA", value: 40, valueLabel: "40h" },
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Hours by Role" })).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("80h")).toBeInTheDocument();
    expect(screen.getByText("QA")).toBeInTheDocument();
    expect(screen.getByText("40h")).toBeInTheDocument();
  });

  it("shows the default empty message when there are no bars", () => {
    render(<HorizontalBarChart title="Hours by Role" bars={[]} />);

    expect(screen.getByText("No data to display.")).toBeInTheDocument();
  });

  it("shows a custom empty message when provided", () => {
    render(<HorizontalBarChart title="Cost vs Revenue" bars={[]} emptyMessage="No cost/revenue data yet." />);

    expect(screen.getByText("No cost/revenue data yet.")).toBeInTheDocument();
  });

  it("marks the decorative bar fill as aria-hidden so no information is conveyed by color/width alone", () => {
    const { container } = render(
      <HorizontalBarChart title="Hours by Role" bars={[{ label: "Developer", value: 80, valueLabel: "80h" }]} />
    );

    const hiddenBar = container.querySelector('[aria-hidden="true"].bg-blue-600');
    expect(hiddenBar).toBeInTheDocument();
  });
});
