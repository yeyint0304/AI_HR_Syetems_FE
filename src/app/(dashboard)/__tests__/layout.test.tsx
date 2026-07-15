import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/",
}));

async function setup() {
  vi.resetModules();
  window.localStorage.clear();
  const { default: DashboardLayout } = await import("../layout");
  const { useAuthStore } = await import("@/store/authStore");
  const { ToastProvider } = await import("@/components/ToastProvider");

  function Wrapped({ children }: { children: ReactNode }) {
    return (
      <ToastProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </ToastProvider>
    );
  }

  return { DashboardLayout: Wrapped, useAuthStore };
}

describe("DashboardLayout", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    window.localStorage.clear();
  });

  it("shows a loading state before the auth store has hydrated", async () => {
    const { DashboardLayout } = await setup();

    render(<DashboardLayout>Protected content</DashboardLayout>);

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /login once hydrated with no authenticated user", async () => {
    const { DashboardLayout, useAuthStore } = await setup();
    useAuthStore.setState({ hasHydrated: true, user: null });

    render(<DashboardLayout>Protected content</DashboardLayout>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the app shell and protected content for a hydrated, authenticated user", async () => {
    const { DashboardLayout, useAuthStore } = await setup();
    useAuthStore.setState({
      hasHydrated: true,
      user: {
        id: "u-1",
        username: "admin",
        firstName: "System",
        lastName: "Admin",
        email: "admin@hrsystem.com",
        role: "SYSTEM_ADMIN",
        countryCode: "SG",
        jobRole: "System Admin",
      },
    });

    render(<DashboardLayout>Protected content</DashboardLayout>);

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByRole("navigation", { name: "Sidebar" })).toBeInTheDocument();
  });
});
