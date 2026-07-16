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

  it("renders a welcome message and role for an authenticated user", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(
      buildToken({ sub: "1", email: "jane@example.com", role: "User", given_name: "Jane" })
    );

    render(await DashboardHomePage());

    expect(screen.getByRole("heading", { name: /welcome, jane/i })).toBeInTheDocument();
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
});
