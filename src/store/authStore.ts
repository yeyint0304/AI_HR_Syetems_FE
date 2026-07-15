import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  changeMockUserPassword,
  findMockUser,
  listMockUsers,
  UpdateProfileInput,
  updateMockUserProfile,
} from "@/lib/mockUsers";
import { AuthUser } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  hasHydrated: boolean;
  login: (usernameOrEmail: string, password: string) => AuthUser;
  logout: () => void;
  updateProfile: (input: UpdateProfileInput) => AuthUser;
  changePassword: (currentPassword: string, newPassword: string) => void;
  // Prototype convenience only — swaps the active session to another seed
  // user without a password, so the demo role switcher can work.
  switchUser: (userId: string) => AuthUser;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      hasHydrated: false,

      login: (usernameOrEmail, password) => {
        const user = findMockUser(usernameOrEmail, password);
        if (!user) {
          throw new Error("Invalid username/email or password.");
        }
        set({ user });
        return user;
      },

      logout: () => set({ user: null }),

      updateProfile: (input) => {
        const currentUser = get().user;
        if (!currentUser) {
          throw new Error("Not authenticated.");
        }
        const updated = updateMockUserProfile(currentUser.id, input);
        set({ user: updated });
        return updated;
      },

      changePassword: (currentPassword, newPassword) => {
        const currentUser = get().user;
        if (!currentUser) {
          throw new Error("Not authenticated.");
        }
        changeMockUserPassword(currentUser.id, currentPassword, newPassword);
      },

      switchUser: (userId) => {
        const target = listMockUsers().find((candidate) => candidate.id === userId);
        if (!target) {
          throw new Error("User not found.");
        }
        set({ user: target });
        return target;
      },
    }),
    {
      name: "hr_mock_auth_v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
      // Rehydration is triggered manually (see AuthHydrator) so the very
      // first client render matches the server render and avoids a
      // hydration mismatch.
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);
