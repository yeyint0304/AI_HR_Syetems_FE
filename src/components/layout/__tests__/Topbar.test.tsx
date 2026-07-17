import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Topbar } from "@/components/layout/Topbar";
import type { AuthUser } from "@/types/auth.types";

let mockPathname = "/home";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

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
    render(<Topbar user={user} onOpenMobileNav={jest.fn()} />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.queryByText("/")).not.toBeInTheDocument();
  });

  it("appends the current page label as a breadcrumb on other routes", () => {
    mockPathname = "/profile";
    render(<Topbar user={user} onOpenMobileNav={jest.fn()} />);

    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("calls onOpenMobileNav when the mobile menu button is clicked", async () => {
    const onOpenMobileNav = jest.fn();
    const uiUser = userEvent.setup();
    render(<Topbar user={user} onOpenMobileNav={onOpenMobileNav} />);

    await uiUser.click(screen.getByRole("button", { name: /open navigation menu/i }));

    expect(onOpenMobileNav).toHaveBeenCalledTimes(1);
  });

  it("renders a profile link with the user's initials when signed in", () => {
    render(<Topbar user={user} onOpenMobileNav={jest.fn()} />);

    const profileLink = screen.getByRole("link", { name: /view profile for sarah/i });
    expect(profileLink).toHaveAttribute("href", "/profile");
    expect(profileLink).toHaveTextContent("SC");
  });

  it("omits the profile link when there is no signed-in user", () => {
    render(<Topbar user={null} onOpenMobileNav={jest.fn()} />);

    expect(screen.queryByRole("link", { name: /view profile/i })).not.toBeInTheDocument();
  });
});
