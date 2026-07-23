import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useAuth,
  useChangePassword,
  useCreateUser,
  useLogin,
  useLogout,
  useRoles,
  useUnassignedUsersInfinite,
  useUpdateProfile,
} from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/auth.store";
import {
  changePasswordRequest,
  createUserRequest,
  getRolesRequest,
  getUnassignedUsersRequest,
  loginRequest,
  logoutRequest,
  updateProfileRequest,
} from "@/lib/api/auth.api";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import type { AuthUser } from "@/types/auth.types";

jest.mock("@/lib/api/auth.api", () => ({
  loginRequest: jest.fn(),
  logoutRequest: jest.fn(),
  updateProfileRequest: jest.fn(),
  changePasswordRequest: jest.fn(),
  createUserRequest: jest.fn(),
  getRolesRequest: jest.fn(),
  getUnassignedUsersRequest: jest.fn(),
}));

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

const sampleUser: AuthUser = {
  id: "1",
  email: "jane@example.com",
  username: "jane",
  role: USER_ROLES.USER,
};

function withQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null });
  });

  it("reports unauthenticated with no known user", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isSystemAdmin).toBe(false);
  });

  it("reports authenticated once a user is set, deriving role helpers", () => {
    useAuthStore.getState().setUser({ ...sampleUser, role: USER_ROLES.SYSTEM_ADMIN });
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isSystemAdmin).toBe(true);
  });

  it("isSystemAdmin is false for non-admin roles", () => {
    useAuthStore.getState().setUser(sampleUser);
    const { result } = renderHook(() => useAuth());
    expect(result.current.isSystemAdmin).toBe(false);
  });
});

describe("useLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null });
  });

  it("stores the user and redirects to the dashboard on success", async () => {
    (loginRequest as jest.Mock).mockResolvedValueOnce(sampleUser);
    const { result } = renderHook(() => useLogin(), { wrapper: withQueryClient() });

    result.current.mutate({ usernameOrEmail: "jane", password: "Password1!" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user).toEqual(sampleUser);
    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe("useLogout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: sampleUser });
  });

  it("clears the user and redirects to /login even though onSettled always runs", async () => {
    (logoutRequest as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLogout(), { wrapper: withQueryClient() });

    result.current.mutate();

    await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("still clears the user and redirects when the backend logout call fails", async () => {
    (logoutRequest as jest.Mock).mockRejectedValueOnce(new Error("network error"));
    const { result } = renderHook(() => useLogout(), { wrapper: withQueryClient() });

    result.current.mutate();

    await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});

describe("useUpdateProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: sampleUser });
  });

  it("stores the updated user and refreshes on success", async () => {
    const updatedUser = { ...sampleUser, firstName: "Janet" };
    (updateProfileRequest as jest.Mock).mockResolvedValueOnce(updatedUser);
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: withQueryClient() });

    result.current.mutate({ firstName: "Janet", lastName: "Doe", email: "jane@example.com" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user).toEqual(updatedUser);
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe("useChangePassword", () => {
  beforeEach(() => jest.clearAllMocks());

  it("resolves with the backend's confirmation message", async () => {
    (changePasswordRequest as jest.Mock).mockResolvedValueOnce({ message: "Password updated." });
    const { result } = renderHook(() => useChangePassword(), { wrapper: withQueryClient() });

    result.current.mutate({
      currentPassword: "Old1!aaaa",
      newPassword: "New1!aaaa",
      confirmNewPassword: "New1!aaaa",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ message: "Password updated." });
  });
});

describe("useCreateUser", () => {
  beforeEach(() => jest.clearAllMocks());

  it("resolves with the created user's id", async () => {
    (createUserRequest as jest.Mock).mockResolvedValueOnce({ id: "42" });
    const { result } = renderHook(() => useCreateUser(), { wrapper: withQueryClient() });

    result.current.mutate({
      username: "newuser",
      email: "newuser@example.com",
      password: "Password1!",
      firstName: "New",
      lastName: "User",
      roleId: "role-guid",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "42" });
  });
});

describe("useRoles", () => {
  beforeEach(() => jest.clearAllMocks());

  it("resolves with the fetched role list", async () => {
    const roles = [{ id: "role-1", name: "SystemAdmin" }];
    (getRolesRequest as jest.Mock).mockResolvedValueOnce(roles);
    const { result } = renderHook(() => useRoles(), { wrapper: withQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(roles);
  });
});

describe("useUnassignedUsersInfinite", () => {
  beforeEach(() => jest.clearAllMocks());

  const user = {
    id: "user-1",
    username: "jsmith",
    email: "jsmith@hrsystem.com",
    firstName: "Jamie",
    lastName: "Smith",
  };

  it("resolves with the first fetched page of unassigned users", async () => {
    (getUnassignedUsersRequest as jest.Mock).mockResolvedValueOnce({
      items: [user],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      hasMore: false,
    });
    const { result } = renderHook(() => useUnassignedUsersInfinite(""), {
      wrapper: withQueryClient(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toEqual([
      { items: [user], page: 1, pageSize: 20, totalCount: 1, hasMore: false },
    ]);
    expect(getUnassignedUsersRequest).toHaveBeenCalledWith({
      search: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it("passes a non-empty search term through to the request", async () => {
    (getUnassignedUsersRequest as jest.Mock).mockResolvedValueOnce({
      items: [user],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      hasMore: false,
    });
    renderHook(() => useUnassignedUsersInfinite("jamie"), { wrapper: withQueryClient() });

    await waitFor(() =>
      expect(getUnassignedUsersRequest).toHaveBeenCalledWith({
        search: "jamie",
        page: 1,
        pageSize: 20,
      })
    );
  });

  it("fetches the next page and appends it once fetchNextPage is called", async () => {
    (getUnassignedUsersRequest as jest.Mock)
      .mockResolvedValueOnce({ items: [user], page: 1, pageSize: 1, totalCount: 2, hasMore: true })
      .mockResolvedValueOnce({
        items: [{ ...user, id: "user-2", username: "adoe" }],
        page: 2,
        pageSize: 1,
        totalCount: 2,
        hasMore: false,
      });
    const { result } = renderHook(() => useUnassignedUsersInfinite(""), {
      wrapper: withQueryClient(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("stops paginating once a 'next' page returns only already-seen users (backend ignoring `page`)", async () => {
    (getUnassignedUsersRequest as jest.Mock)
      .mockResolvedValueOnce({ items: [user], page: 1, pageSize: 1, totalCount: 5, hasMore: true })
      .mockResolvedValueOnce({ items: [user], page: 1, pageSize: 1, totalCount: 5, hasMore: true });
    const { result } = renderHook(() => useUnassignedUsersInfinite(""), {
      wrapper: withQueryClient(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(false);
  });
});
