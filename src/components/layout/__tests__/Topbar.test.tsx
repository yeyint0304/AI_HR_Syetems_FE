import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import type { AuthUser } from "@/types/auth.types";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { post: jest.fn(), put: jest.fn() },
}));

let mockPathname = "/home";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => mockPathname,
}));

function renderTopbar(user: AuthUser | null, onOpenMobileNav: () => void = jest.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Topbar user={user} onOpenMobileNav={onOpenMobileNav} />
    </QueryClientProvider>
  );
}

const user: AuthUser = {
  id: "1",
  email: "sarah@hrsystem.com",
  firstName: "Sarah",
  lastName: "Chen",
  role: "ProjectAdmin",
};

describe("Topbar", () => {
  beforeEach(() => {
    mockPathname = "/home";
  });

  it("renders only the Dashboard breadcrumb on the dashboard route", () => {
    renderTopbar(user);

    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.queryByText("/")).not.toBeInTheDocument();
  });

  it("appends the current page label as a breadcrumb on other routes", () => {
    mockPathname = "/profile";
    renderTopbar(user);

    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders the full ancestor trail, with a linked intermediate crumb, for a nested route", () => {
    mockPathname = "/projects/new";
    renderTopbar(user);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/home");
    const projectsCrumb = screen.getByRole("link", { name: "Projects" });
    expect(projectsCrumb).toHaveAttribute("href", "/projects");

    const currentCrumb = screen.getByText("New project");
    expect(currentCrumb.tagName).not.toBe("A");
    expect(currentCrumb.closest("li")).toHaveAttribute("aria-current", "page");
  });

  it("calls onOpenMobileNav when the mobile menu button is clicked", async () => {
    const onOpenMobileNav = jest.fn();
    const uiUser = userEvent.setup();
    renderTopbar(user, onOpenMobileNav);

    await uiUser.click(screen.getByRole("button", { name: /open navigation menu/i }));

    expect(onOpenMobileNav).toHaveBeenCalledTimes(1);
  });

  it("renders the account menu trigger with the user's initials when signed in", () => {
    renderTopbar(user);

    const trigger = screen.getByRole("button", { name: /account menu for sarah chen/i });
    expect(trigger).toHaveTextContent("SC");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the account dropdown showing the user's full name and role", async () => {
    const uiUser = userEvent.setup();
    renderTopbar(user);

    await uiUser.click(screen.getByRole("button", { name: /account menu for sarah chen/i }));

    const menu = screen.getByRole("menu", { name: /account/i });
    expect(menu).toHaveClass("max-h-[300px]", "overflow-y-auto");
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("ProjectAdmin")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /view profile/i })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("menuitem", { name: /change password/i })).toHaveAttribute(
      "href",
      "/profile/change-password"
    );
    expect(screen.getByRole("menuitem", { name: /sign out/i })).toBeInTheDocument();
  });

  it("omits the account menu when there is no signed-in user", () => {
    renderTopbar(null);

    expect(screen.queryByRole("button", { name: /account menu/i })).not.toBeInTheDocument();
  });
});
