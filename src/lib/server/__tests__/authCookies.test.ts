/**
 * @jest-environment node
 */
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/constants/auth.constants";
import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
} from "@/lib/server/authCookies";

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

  it("clearAuthCookies deletes both cookies", async () => {
    await clearAuthCookies();
    expect(store.delete).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE);
    expect(store.delete).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE);
  });
});
