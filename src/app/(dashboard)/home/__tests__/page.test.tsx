import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import DashboardHomePage from "@/app/(dashboard)/home/page";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

function buildToken(claims: Record<string, unknown>): string {
  const base64Url = (value: string) =>
    Buffer.from(value, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return [
    base64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    base64Url(JSON.stringify(claims)),
    "sig",
  ].join(".");
}

describe("DashboardHomePage (/home)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /login when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(null);

    await expect(DashboardHomePage()).rejects.toThrow("REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders a greeting message and role for an authenticated user", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(
      buildToken({ sub: "1", email: "jane@example.com", role: "User", given_name: "Jane" })
    );

    render(await DashboardHomePage());

    expect(screen.getByRole("heading", { name: /good morning, jane/i })).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("hides the Create user shortcut for a non-SystemAdmin user", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(
      buildToken({ sub: "1", email: "jane@example.com", role: "User", given_name: "Jane" })
    );

    render(await DashboardHomePage());

    expect(screen.getByRole("link", { name: /update profile/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /change password/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create user/i })).not.toBeInTheDocument();
  });

  it("shows the Create user shortcut for a SystemAdmin user", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(
      buildToken({ sub: "1", email: "admin@example.com", role: "SystemAdmin", given_name: "Admin" })
    );

    render(await DashboardHomePage());

    expect(screen.getByRole("link", { name: /create user/i })).toBeInTheDocument();
  });

  it("renders the summary stat cards", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(
      buildToken({ sub: "1", email: "jane@example.com", role: "User", given_name: "Jane" })
    );

    render(await DashboardHomePage());

    expect(screen.getByText("Total Projects")).toBeInTheDocument();
    expect(screen.getByText("Hours This Week")).toBeInTheDocument();
    expect(screen.getByText("Pending Invoices")).toBeInTheDocument();
    expect(screen.getByText("Active Users")).toBeInTheDocument();
  });

  it("renders the recent timesheet entries with project, hours, and status", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(
      buildToken({ sub: "1", email: "jane@example.com", role: "User", given_name: "Jane" })
    );

    render(await DashboardHomePage());

    expect(
      screen.getByRole("heading", { name: /recent timesheet entries/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Project Alpha - Web Platform").length).toBeGreaterThan(0);
    expect(screen.getByText("6h")).toBeInTheDocument();
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
  });

  it("renders the recent invoices with number, client, amount, and status", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(
      buildToken({ sub: "1", email: "jane@example.com", role: "User", given_name: "Jane" })
    );

    render(await DashboardHomePage());

    expect(screen.getByRole("heading", { name: /recent invoices/i })).toBeInTheDocument();
    expect(screen.getByText("INV-202502-0001")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("SGD 8,400.00")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders the quick actions as disabled, non-interactive controls", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(
      buildToken({ sub: "1", email: "jane@example.com", role: "User", given_name: "Jane" })
    );

    render(await DashboardHomePage());

    expect(screen.getByRole("heading", { name: /quick actions/i })).toBeInTheDocument();
    for (const label of ["Log Time", "View Reports", "Generate Invoice", "Manage Projects"]) {
      const action = screen.getByRole("button", { name: new RegExp(label, "i") });
      expect(action).toBeDisabled();
      expect(action).toHaveAttribute("aria-disabled", "true");
    }
  });
});
