import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshStore() {
  vi.resetModules();
  window.localStorage.clear();
  const { useAuthStore } = await import("../authStore");
  return useAuthStore;
}

describe("authStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts logged out and un-hydrated", async () => {
    const useAuthStore = await freshStore();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().hasHydrated).toBe(false);
  });

  it("logs in a seeded demo user with correct credentials", async () => {
    const useAuthStore = await freshStore();

    const user = useAuthStore.getState().login("admin", "Password@123");

    expect(user.username).toBe("admin");
    expect(useAuthStore.getState().user?.username).toBe("admin");
  });

  it("throws and leaves the user logged out on invalid credentials", async () => {
    const useAuthStore = await freshStore();

    expect(() => useAuthStore.getState().login("admin", "wrong-password")).toThrow(
      "Invalid username/email or password.",
    );
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("logs out the current user", async () => {
    const useAuthStore = await freshStore();

    useAuthStore.getState().login("admin", "Password@123");
    expect(useAuthStore.getState().user).not.toBeNull();

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("updates the logged-in user's profile", async () => {
    const useAuthStore = await freshStore();

    useAuthStore.getState().login("admin", "Password@123");
    const updated = useAuthStore.getState().updateProfile({
      firstName: "Updated",
      lastName: "Name",
      email: "updated@hrsystem.com",
    });

    expect(updated.firstName).toBe("Updated");
    expect(useAuthStore.getState().user?.email).toBe("updated@hrsystem.com");
  });

  it("throws when updating a profile while logged out", async () => {
    const useAuthStore = await freshStore();

    expect(() =>
      useAuthStore.getState().updateProfile({
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
      }),
    ).toThrow("Not authenticated.");
  });

  it("changes the logged-in user's password", async () => {
    const useAuthStore = await freshStore();

    useAuthStore.getState().login("admin", "Password@123");
    expect(() =>
      useAuthStore.getState().changePassword("Password@123", "NewPassword@123"),
    ).not.toThrow();
  });

  it("throws when changing password while logged out", async () => {
    const useAuthStore = await freshStore();

    expect(() => useAuthStore.getState().changePassword("a", "b")).toThrow("Not authenticated.");
  });

  it("switches the active session to another seeded user without a password", async () => {
    const useAuthStore = await freshStore();

    useAuthStore.getState().login("admin", "Password@123");
    const switched = useAuthStore.getState().switchUser("u-2");

    expect(switched.username).toBe("sarah");
    expect(useAuthStore.getState().user?.username).toBe("sarah");
  });

  it("throws when switching to an unknown user id", async () => {
    const useAuthStore = await freshStore();

    useAuthStore.getState().login("admin", "Password@123");
    expect(() => useAuthStore.getState().switchUser("missing-id")).toThrow("User not found.");
  });
});
