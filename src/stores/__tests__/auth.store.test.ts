import { useAuthStore } from "@/stores/auth.store";
import type { AuthUser } from "@/types/auth.types";

const sampleUser: AuthUser = {
  id: "1",
  email: "jane@example.com",
  username: "jane",
  role: "User",
};

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it("has no user by default", () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("sets the user via setUser", () => {
    useAuthStore.getState().setUser(sampleUser);
    expect(useAuthStore.getState().user).toEqual(sampleUser);
  });

  it("clears the user via clearUser", () => {
    useAuthStore.getState().setUser(sampleUser);
    useAuthStore.getState().clearUser();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
