import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const ADMIN_USER = {
  id: "u-1",
  username: "admin",
  firstName: "System",
  lastName: "Admin",
  email: "admin@hrsystem.com",
  role: "SYSTEM_ADMIN" as const,
  countryCode: "SG",
  jobRole: "System Admin",
};

async function setup() {
  vi.resetModules();
  window.localStorage.clear();
  const { UserMenu } = await import("../UserMenu");
  const { useAuthStore } = await import("@/store/authStore");
  const { ToastProvider } = await import("../ToastProvider");

  useAuthStore.setState({ hasHydrated: true, user: ADMIN_USER });

  function Wrapped({ children }: { children: ReactNode }) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return { UserMenu, useAuthStore, Wrapped };
}

describe("UserMenu", () => {
  beforeEach(() => {
    pushMock.mockClear();
    window.localStorage.clear();
  });

  it("renders nothing when there is no logged-in user", async () => {
    const { UserMenu, useAuthStore, Wrapped } = await setup();
    useAuthStore.setState({ user: null });

    render(
      <Wrapped>
        <UserMenu />
      </Wrapped>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens the menu and lists demo users to switch to", async () => {
    const { UserMenu, Wrapped } = await setup();
    const user = userEvent.setup();

    render(
      <Wrapped>
        <UserMenu />
      </Wrapped>,
    );

    const trigger = screen.getByRole("button", { name: "SA" });
    await user.click(trigger);

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Sarah Chen")).toBeInTheDocument();
    expect(within(menu).getByText("Alex Kumar")).toBeInTheDocument();
  });

  it("switches the active demo user and shows a success toast", async () => {
    const { UserMenu, useAuthStore, Wrapped } = await setup();
    const user = userEvent.setup();

    render(
      <Wrapped>
        <UserMenu />
      </Wrapped>,
    );

    await user.click(screen.getByRole("button", { name: "SA" }));
    await user.click(screen.getByRole("menuitem", { name: /Sarah Chen/ }));

    expect(useAuthStore.getState().user?.username).toBe("sarah");
    expect(await screen.findByText("Switched to Sarah Chen.")).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when Escape is pressed", async () => {
    const { UserMenu, Wrapped } = await setup();
    const user = userEvent.setup();

    render(
      <Wrapped>
        <UserMenu />
      </Wrapped>,
    );

    await user.click(screen.getByRole("button", { name: "SA" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("signs out and redirects to /login", async () => {
    const { UserMenu, useAuthStore, Wrapped } = await setup();
    const user = userEvent.setup();

    render(
      <Wrapped>
        <UserMenu />
      </Wrapped>,
    );

    await user.click(screen.getByRole("button", { name: "SA" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(useAuthStore.getState().user).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/login");
  });
});
