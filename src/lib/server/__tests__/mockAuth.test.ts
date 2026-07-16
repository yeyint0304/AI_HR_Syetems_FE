import {
  MOCK_LOGIN_HINT,
  createMockAuthTokens,
  isBackendUnreachableError,
  isMockAuthEnabled,
} from "@/lib/server/mockAuth";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { USER_ROLES } from "@/lib/constants/auth.constants";

describe("createMockAuthTokens", () => {
  it("returns null for unknown credentials", () => {
    expect(createMockAuthTokens({ usernameOrEmail: "nobody", password: "wrong" })).toBeNull();
  });

  it("returns null when the username matches but the password is wrong", () => {
    expect(
      createMockAuthTokens({ usernameOrEmail: "admin", password: "totally-wrong" })
    ).toBeNull();
  });

  it("issues a decodable access token + opaque refresh token for a known mock account", () => {
    const [{ usernameOrEmail, password }] = MOCK_LOGIN_HINT;
    const tokens = createMockAuthTokens({ usernameOrEmail, password });

    expect(tokens).not.toBeNull();
    expect(tokens?.accessToken.split(".")).toHaveLength(3);
    expect(typeof tokens?.refreshToken).toBe("string");

    const claims = decodeJwt(tokens!.accessToken);
    expect(claims).not.toBeNull();
    expect(claims?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const user = mapClaimsToAuthUser(claims!);
    expect(user).toEqual(
      expect.objectContaining({ username: "admin", role: USER_ROLES.SYSTEM_ADMIN })
    );
  });

  it("matches accounts case-insensitively by username or email", () => {
    const tokens = createMockAuthTokens({ usernameOrEmail: "ADMIN", password: "Password123!" });
    expect(tokens).not.toBeNull();

    const byEmail = createMockAuthTokens({
      usernameOrEmail: "Admin@HRSystem.local",
      password: "Password123!",
    });
    expect(byEmail).not.toBeNull();
  });
});

describe("isBackendUnreachableError", () => {
  it("returns true for an Axios error with no response (connection refused/timeout)", () => {
    expect(
      isBackendUnreachableError({ isAxiosError: true, code: "ECONNREFUSED", response: undefined })
    ).toBe(true);
  });

  it("returns false for a real HTTP error response (e.g. 401)", () => {
    expect(
      isBackendUnreachableError({ isAxiosError: true, response: { status: 401 } })
    ).toBe(false);
  });

  it("returns false for non-Axios errors", () => {
    expect(isBackendUnreachableError(new Error("boom"))).toBe(false);
    expect(isBackendUnreachableError(null)).toBe(false);
  });
});

describe("isMockAuthEnabled", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, configurable: true });
  });

  it("is enabled outside production", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", configurable: true });
    expect(isMockAuthEnabled()).toBe(true);
  });

  it("is disabled in production", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    expect(isMockAuthEnabled()).toBe(false);
  });
});
