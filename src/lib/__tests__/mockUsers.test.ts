import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshModule() {
  vi.resetModules();
  window.localStorage.clear();
  return import("../mockUsers");
}

describe("mockUsers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("seeds three demo users by default", async () => {
    const { listMockUsers } = await freshModule();
    const users = listMockUsers();
    expect(users).toHaveLength(3);
    expect(users.map((u) => u.username)).toEqual(["admin", "sarah", "alex"]);
    // Public user objects must never leak the password field.
    expect(users[0]).not.toHaveProperty("password");
  });

  it("finds a seeded user by username or email with the correct password", async () => {
    const { findMockUser } = await freshModule();

    expect(findMockUser("admin", "Password@123")).not.toBeNull();
    expect(findMockUser("ADMIN", "Password@123")).not.toBeNull();
    expect(findMockUser("admin@hrsystem.com", "Password@123")).not.toBeNull();
  });

  it("returns null for an unknown user or wrong password", async () => {
    const { findMockUser } = await freshModule();

    expect(findMockUser("admin", "wrong-password")).toBeNull();
    expect(findMockUser("nobody", "Password@123")).toBeNull();
  });

  it("creates a new user, trims fields, and persists to localStorage", async () => {
    const { createMockUser, listMockUsers } = await freshModule();

    const created = createMockUser({
      username: "newuser",
      email: "newuser@hrsystem.com",
      password: "Password@123",
      firstName: "  New  ",
      lastName: "  User  ",
      role: "ASSIGNED_USER",
      countryCode: "SG",
      jobRole: "  QA  ",
    });

    expect(created.firstName).toBe("New");
    expect(created.lastName).toBe("User");
    expect(created.jobRole).toBe("QA");
    expect(listMockUsers()).toHaveLength(4);

    const stored = JSON.parse(window.localStorage.getItem("hr_mock_users_v2") ?? "[]");
    expect(stored).toHaveLength(4);
  });

  it("detects taken usernames and emails case-insensitively, excluding a given user id", async () => {
    const { isUsernameTaken, isEmailTaken } = await freshModule();

    expect(isUsernameTaken("Admin")).toBe(true);
    expect(isUsernameTaken("brand-new-user")).toBe(false);

    expect(isEmailTaken("ADMIN@HRSYSTEM.COM")).toBe(true);
    expect(isEmailTaken("admin@hrsystem.com", "u-1")).toBe(false);
  });

  it("updates a user's profile and throws for an unknown user id", async () => {
    const { updateMockUserProfile } = await freshModule();

    const updated = updateMockUserProfile("u-1", {
      firstName: "Updated",
      lastName: "Admin",
      email: "updated-admin@hrsystem.com",
    });

    expect(updated.firstName).toBe("Updated");
    expect(updated.email).toBe("updated-admin@hrsystem.com");

    expect(() =>
      updateMockUserProfile("missing-id", {
        firstName: "X",
        lastName: "Y",
        email: "x@y.com",
      }),
    ).toThrow("User not found.");
  });

  it("changes a user's password only when the current password matches", async () => {
    const { changeMockUserPassword, findMockUser } = await freshModule();

    expect(() => changeMockUserPassword("u-1", "wrong-current", "NewPassword@123")).toThrow(
      "Current password is incorrect.",
    );

    changeMockUserPassword("u-1", "Password@123", "NewPassword@123");
    expect(findMockUser("admin", "NewPassword@123")).not.toBeNull();
    expect(findMockUser("admin", "Password@123")).toBeNull();
  });

  it("throws when changing the password for an unknown user id", async () => {
    const { changeMockUserPassword } = await freshModule();

    expect(() => changeMockUserPassword("missing-id", "a", "b")).toThrow("User not found.");
  });
});
