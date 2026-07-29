import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuthStore } from "@/stores/auth.store";
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

function renderShell() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardShell user={user}>
        <p>Page content</p>
      </DashboardShell>
    </QueryClientProvider>
  );
}

describe("DashboardShell", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

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

  it("uses the initial server-provided user before the auth store is populated", () => {
    renderShell();

    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
  });

  it("prefers the auth store's user over the initial prop once populated (immediate profile-update reflection)", () => {
    useAuthStore.setState({ user: { ...user, firstName: "Janet" } });
    renderShell();

    expect(screen.getByText("Janet Chen")).toBeInTheDocument();
    expect(screen.queryByText("Sarah Chen")).not.toBeInTheDocument();
  });
});
