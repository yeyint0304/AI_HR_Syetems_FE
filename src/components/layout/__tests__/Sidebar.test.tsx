import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import type { AuthUser } from "@/types/auth.types";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { post: jest.fn(), put: jest.fn() },
}));

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
let mockPathname = "/home";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
  usePathname: () => mockPathname,
}));

function renderSidebar(user: AuthUser | null, onNavigate?: () => void) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Sidebar user={user} onNavigate={onNavigate} />
    </QueryClientProvider>
  );
}

const projectAdminUser: AuthUser = {
  id: "1",
  email: "sarah@hrsystem.com",
  firstName: "Sarah",
  lastName: "Chen",
  role: "ProjectAdmin",
};

const systemAdminUser: AuthUser = {
  id: "2",
  email: "admin@hrsystem.com",
  firstName: "System",
  lastName: "Admin",
  role: "SystemAdmin",
};

describe("Sidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/home";
  });

  it("renders the brand header and the Dashboard link", () => {
    renderSidebar(projectAdminUser);

    expect(screen.getByText("HR System")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/home");
  });

  it("marks the active route with aria-current", () => {
    mockPathname = "/home";
    renderSidebar(projectAdminUser);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("aria-current", "page");
  });

  it("renders not-yet-implemented items as disabled, non-navigating controls", () => {
    renderSidebar(projectAdminUser);

    const timesheetsItem = screen.getByRole("button", { name: /my timesheets/i });
    expect(timesheetsItem).toBeDisabled();
    expect(timesheetsItem).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("link", { name: /^my timesheets$/i })).not.toBeInTheDocument();
  });

  it("renders the implemented Projects item as a real navigation link", () => {
    renderSidebar(projectAdminUser);

    const projectsLink = screen.getByRole("link", { name: /^projects$/i });
    expect(projectsLink).toHaveAttribute("href", "/projects");
  });

  it("hides the Administration section for a non-SystemAdmin user", () => {
    renderSidebar(projectAdminUser);

    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
  });

  it("shows the Administration section for a SystemAdmin user", () => {
    renderSidebar(systemAdminUser);

    expect(screen.getByText("Administration")).toBeInTheDocument();
  });

  it("renders the signed-in user's name, role, and a sign-out control", () => {
    renderSidebar(projectAdminUser);

    expect(screen.getByText("Sarah")).toBeInTheDocument();
    expect(screen.getByText("ProjectAdmin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("invokes onNavigate when a real nav link is clicked", async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();
    renderSidebar(projectAdminUser, onNavigate);

    await user.click(screen.getByRole("link", { name: /dashboard/i }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
