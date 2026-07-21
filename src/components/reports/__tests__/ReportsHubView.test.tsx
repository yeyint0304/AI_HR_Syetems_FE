import { render, screen } from "@testing-library/react";
import { ReportsHubView } from "@/components/reports/ReportsHubView";
import { useAuthStore } from "@/stores/auth.store";

describe("ReportsHubView", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it("shows only the Timesheet Report card to a plain User", () => {
    useAuthStore.setState({ user: { id: "1", email: "user@hrsystem.com", role: "User" } });
    render(<ReportsHubView />);

    expect(screen.getByRole("link", { name: /timesheet report/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /user roles summary/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /cost & revenue report/i })).not.toBeInTheDocument();
  });

  it("shows all three report cards to a ProjectAdmin", () => {
    useAuthStore.setState({ user: { id: "2", email: "pa@hrsystem.com", role: "ProjectAdmin" } });
    render(<ReportsHubView />);

    expect(screen.getByRole("link", { name: /timesheet report/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /user roles summary/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cost & revenue report/i })).toBeInTheDocument();
  });

  it("shows all three report cards to a SystemAdmin", () => {
    useAuthStore.setState({ user: { id: "3", email: "sa@hrsystem.com", role: "SystemAdmin" } });
    render(<ReportsHubView />);

    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("links each card to its correct destination route", () => {
    useAuthStore.setState({ user: { id: "3", email: "sa@hrsystem.com", role: "SystemAdmin" } });
    render(<ReportsHubView />);

    expect(screen.getByRole("link", { name: /timesheet report/i })).toHaveAttribute("href", "/reports/timesheet");
    expect(screen.getByRole("link", { name: /user roles summary/i })).toHaveAttribute(
      "href",
      "/reports/roles-summary"
    );
    expect(screen.getByRole("link", { name: /cost & revenue report/i })).toHaveAttribute(
      "href",
      "/reports/cost-revenue"
    );
  });

  it("still shows the non-manager-only Timesheet Report card when there is no signed-in user yet", () => {
    useAuthStore.setState({ user: null });
    render(<ReportsHubView />);

    expect(screen.getByRole("link", { name: /timesheet report/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /user roles summary/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /cost & revenue report/i })).not.toBeInTheDocument();
  });
});
