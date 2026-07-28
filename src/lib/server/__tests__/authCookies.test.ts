/**
 * @jest-environment node
 */
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  USERNAME_COOKIE,
} from "@/lib/constants/auth.constants";
import {
  clearAuthCookies,
  getAccessToken,
  getCurrentAuthUser,
  getRefreshToken,
  getUsernameCookie,
  setAuthCookies,
  setUsernameCookie,
} from "@/lib/server/authCookies";

function buildToken(claims: Record<string, unknown>): string {
  const base64Url = (value: string) =>
    Buffer.from(value, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return [
    base64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    base64Url(JSON.stringify(claims)),
    "sig",
  ].join(".");
}

const store = { set: jest.fn(), get: jest.fn(), delete: jest.fn() };

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("authCookies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cookies as jest.Mock).mockResolvedValue(store);
  });

  it("sets both cookies as httpOnly, sameSite=strict, path=/ with the given max-ages", async () => {
    await setAuthCookies("access-token", "refresh-token", 900, 60_480);

    expect(store.set).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE, "access-token", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
      maxAge: 900,
    });
    expect(store.set).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE, "refresh-token", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
      maxAge: 60_480,
    });
  });

  it("marks cookies secure in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    jest.resetModules();
    jest.doMock("next/headers", () => ({ cookies: jest.fn().mockResolvedValue(store) }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fresh = require("@/lib/server/authCookies") as typeof import("@/lib/server/authCookies");

    await fresh.setAuthCookies("access-token", "refresh-token");

    expect(store.set).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      "access-token",
      expect.objectContaining({ secure: true })
    );

    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, configurable: true });
  });

  it("applies default max-ages when not provided", async () => {
    await setAuthCookies("access-token", "refresh-token");

    expect(store.set).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      "access-token",
      expect.objectContaining({ maxAge: 15 * 60 })
    );
    expect(store.set).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      "refresh-token",
      expect.objectContaining({ maxAge: 7 * 24 * 60 * 60 })
    );
  });

  it("getAccessToken returns the cookie value when present", async () => {
    store.get.mockReturnValueOnce({ value: "access-token" });
    expect(await getAccessToken()).toBe("access-token");
    expect(store.get).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE);
  });

  it("getAccessToken returns null when the cookie is missing", async () => {
    store.get.mockReturnValueOnce(undefined);
    expect(await getAccessToken()).toBeNull();
  });

  it("getRefreshToken returns the cookie value when present", async () => {
    store.get.mockReturnValueOnce({ value: "refresh-token" });
    expect(await getRefreshToken()).toBe("refresh-token");
    expect(store.get).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE);
  });

  it("getRefreshToken returns null when the cookie is missing", async () => {
    store.get.mockReturnValueOnce(undefined);
    expect(await getRefreshToken()).toBeNull();
  });

  it("clearAuthCookies deletes the access, refresh, and username cookies", async () => {
    await clearAuthCookies();
    expect(store.delete).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE);
    expect(store.delete).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE);
    expect(store.delete).toHaveBeenCalledWith(USERNAME_COOKIE);
  });

  it("setUsernameCookie sets an httpOnly, sameSite=strict cookie with the default (refresh-token) max-age", async () => {
    await setUsernameCookie("admin");
    expect(store.set).toHaveBeenCalledWith(USERNAME_COOKIE, "admin", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  });

  it("getUsernameCookie returns the cookie value when present, and null when missing", async () => {
    store.get.mockReturnValueOnce({ value: "admin" });
    expect(await getUsernameCookie()).toBe("admin");

    store.get.mockReturnValueOnce(undefined);
    expect(await getUsernameCookie()).toBeNull();
  });

  describe("getCurrentAuthUser", () => {
    it("returns null when there is no access-token cookie", async () => {
      store.get.mockReturnValueOnce(undefined);
      expect(await getCurrentAuthUser()).toBeNull();
    });

    it("returns the JWT-derived user as-is when the JWT already carries a username claim", async () => {
      const token = buildToken({
        sub: "1",
        email: "jane@example.com",
        unique_name: "jane.doe",
        role: "Employee",
      });
      store.get.mockReturnValueOnce({ value: token });

      const user = await getCurrentAuthUser();
      expect(user).toEqual(expect.objectContaining({ username: "jane.doe" }));
      // No fallback lookup needed once the JWT itself resolves a username.
      expect(store.get).toHaveBeenCalledTimes(1);
    });

    it("overlays the cached USERNAME_COOKIE when the JWT (the real backend's shape) has no username claim", async () => {
      const token = buildToken({ sub: "1", email: "admin@hrsystem.com", role: "SystemAdmin" });
      store.get.mockReturnValueOnce({ value: token }).mockReturnValueOnce({ value: "admin" });

      const user = await getCurrentAuthUser();
      expect(user).toEqual(expect.objectContaining({ username: "admin", email: "admin@hrsystem.com" }));
      expect(store.get).toHaveBeenCalledWith(USERNAME_COOKIE);
    });

    it("still returns the user (with an undefined username) when neither the JWT nor the cookie has one", async () => {
      const token = buildToken({ sub: "1", email: "admin@hrsystem.com", role: "SystemAdmin" });
      store.get.mockReturnValueOnce({ value: token }).mockReturnValueOnce(undefined);

      const user = await getCurrentAuthUser();
      expect(user).toEqual(expect.objectContaining({ email: "admin@hrsystem.com" }));
      expect(user?.username).toBeUndefined();
    });
  });
});
