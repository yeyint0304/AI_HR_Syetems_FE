import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserMenu } from "@/components/layout/UserMenu";
import { apiClient } from "@/lib/api/axiosInstance";
import type { AuthUser } from "@/types/auth.types";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { post: jest.fn(), put: jest.fn() },
}));

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

const user: AuthUser = {
  id: "1",
  email: "sarah@hrsystem.com",
  firstName: "Sarah",
  lastName: "Chen",
  role: "ProjectAdmin",
};

function renderMenu() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserMenu user={user} />
    </QueryClientProvider>
  );
}

describe("UserMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a closed menu by default", () => {
    renderMenu();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /account menu for sarah chen/i })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("opens the menu on click and toggles it closed on a second click", async () => {
    const uiUser = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole("button", { name: /account menu for sarah chen/i });
    await uiUser.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await uiUser.click(trigger);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when Escape is pressed", async () => {
    const uiUser = userEvent.setup();
    renderMenu();

    await uiUser.click(screen.getByRole("button", { name: /account menu for sarah chen/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await uiUser.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside of it", async () => {
    const uiUser = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <div>
          <button type="button">Outside</button>
          <UserMenu user={user} />
        </div>
      </QueryClientProvider>
    );

    await uiUser.click(screen.getByRole("button", { name: /account menu for sarah chen/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await uiUser.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu after clicking 'View profile'", async () => {
    const uiUser = userEvent.setup();
    renderMenu();

    await uiUser.click(screen.getByRole("button", { name: /account menu for sarah chen/i }));
    await uiUser.click(screen.getByRole("menuitem", { name: /view profile/i }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("signs out when 'Sign out' is clicked", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });
    const uiUser = userEvent.setup();
    renderMenu();

    await uiUser.click(screen.getByRole("button", { name: /account menu for sarah chen/i }));
    await uiUser.click(screen.getByRole("menuitem", { name: /sign out/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith("/auth/logout"));
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});
