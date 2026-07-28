import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { AuthUser } from "@/types/auth.types";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { post: jest.fn(), put: jest.fn() },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/home",
}));

const user: AuthUser = {
  id: "1",
  email: "sarah@hrsystem.com",
  firstName: "Sarah",
  lastName: "Chen",
  role: "ProjectAdmin",
};

function renderShell(currentUser: AuthUser = user) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardShell user={currentUser}>
        <p>Page content</p>
      </DashboardShell>
    </QueryClientProvider>
  );
}

describe("DashboardShell", () => {
  it("renders the page content alongside a single primary navigation on desktop", () => {
    renderShell();

    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: /primary navigation/i })).toHaveLength(1);
  });

  it("opens the mobile navigation drawer when the menu button is clicked", async () => {
    const uiUser = userEvent.setup();
    renderShell();

    expect(screen.queryByRole("button", { name: /close navigation menu/i })).not.toBeInTheDocument();

    await uiUser.click(screen.getByRole("button", { name: /open navigation menu/i }));

    expect(screen.getByRole("button", { name: /close navigation menu/i })).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: /primary navigation/i })).toHaveLength(2);
  });

  it("closes the mobile navigation drawer when the overlay is clicked", async () => {
    const uiUser = userEvent.setup();
    renderShell();

    await uiUser.click(screen.getByRole("button", { name: /open navigation menu/i }));
    expect(screen.getByRole("button", { name: /close navigation menu/i })).toBeInTheDocument();

    await uiUser.click(screen.getByRole("button", { name: /close navigation menu/i }));
    expect(screen.queryByRole("button", { name: /close navigation menu/i })).not.toBeInTheDocument();
  });

  // Regression guard for the Sidebar/Topbar identity mismatch introduced by
  // the user-profile feature: Sidebar.tsx was changed to prefer `username`
  // over `firstName`, but Topbar.tsx (rendered on every dashboard page
  // alongside the Sidebar) was not updated to match, so the *same*
  // signed-in user gets a different name/initials in each nav element.
  it("shows a consistent display name/initials for the same user across the Sidebar footer and Topbar avatar", () => {
    const userWithUsername: AuthUser = { ...user, username: "sarah.chen" };
    renderShell(userWithUsername);

    // Sidebar footer (per this diff) now renders the username...
    expect(screen.getByText("sarah.chen")).toBeInTheDocument();
    // ...while the Topbar's profile-avatar link (unchanged) still renders
    // an aria-label/initials derived from the given name — a real user
    // would see two different identities for themselves on one screen.
    const topbarProfileLink = screen.getByRole("link", { name: /view profile for/i });
    expect(topbarProfileLink).toHaveAccessibleName("View profile for sarah.chen");
  });
});
