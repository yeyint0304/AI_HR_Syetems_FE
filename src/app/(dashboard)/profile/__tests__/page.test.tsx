import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

async function renderProfilePage() {
  vi.resetModules();
  window.localStorage.clear();
  const { default: ProfilePage } = await import("../page");
  const { useAuthStore } = await import("@/store/authStore");
  useAuthStore.setState({ hasHydrated: true, user: ADMIN_USER });
  render(<ProfilePage />);
  return { useAuthStore };
}

describe("ProfilePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders nothing when there is no logged-in user", async () => {
    vi.resetModules();
    window.localStorage.clear();
    const { default: ProfilePage } = await import("../page");
    const { useAuthStore } = await import("@/store/authStore");
    useAuthStore.setState({ hasHydrated: true, user: null });

    const { container } = render(<ProfilePage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("pre-fills the profile form with the current user's details", async () => {
    await renderProfilePage();

    expect(screen.getByLabelText("First name")).toHaveValue("System");
    expect(screen.getByLabelText("Last name")).toHaveValue("Admin");
    expect(screen.getByLabelText("Email")).toHaveValue("admin@hrsystem.com");
  });

  it("validates required profile fields and an already-used email", async () => {
    const user = userEvent.setup();
    await renderProfilePage();

    await user.clear(screen.getByLabelText("First name"));
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "sarah@hrsystem.com");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("First name is required.")).toBeInTheDocument();
    expect(screen.getByText("This email is already in use.")).toBeInTheDocument();
  });

  it("updates the profile successfully with valid data", async () => {
    const user = userEvent.setup();
    const { useAuthStore } = await renderProfilePage();

    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "Updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Profile updated successfully.")).toBeInTheDocument();
    expect(useAuthStore.getState().user?.firstName).toBe("Updated");
  });

  it("validates the change-password form", async () => {
    const user = userEvent.setup();
    await renderProfilePage();

    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Current password is required.")).toBeInTheDocument();
    expect(screen.getByText("New password is required.")).toBeInTheDocument();
    expect(screen.getByText("Please confirm the new password.")).toBeInTheDocument();
  });

  it("shows a mismatch error when new password confirmation does not match", async () => {
    const user = userEvent.setup();
    await renderProfilePage();

    await user.type(screen.getByLabelText("Current password"), "Password@123");
    await user.type(screen.getByLabelText("New password"), "NewPassword@123");
    await user.type(screen.getByLabelText("Confirm new password"), "Mismatch@123");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
  });

  it("changes the password successfully and clears the form", async () => {
    const user = userEvent.setup();
    await renderProfilePage();

    await user.type(screen.getByLabelText("Current password"), "Password@123");
    await user.type(screen.getByLabelText("New password"), "NewPassword@123");
    await user.type(screen.getByLabelText("Confirm new password"), "NewPassword@123");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Password changed successfully.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveValue("");
  });

  it("shows a form-level error when the current password is incorrect", async () => {
    const user = userEvent.setup();
    await renderProfilePage();

    await user.type(screen.getByLabelText("Current password"), "wrong-password");
    await user.type(screen.getByLabelText("New password"), "NewPassword@123");
    await user.type(screen.getByLabelText("Confirm new password"), "NewPassword@123");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Current password is incorrect.")).toBeInTheDocument();
  });
});
