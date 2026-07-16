/**
 * @jest-environment node
 */
import { computeAccessTokenMaxAge, extractTokens } from "@/lib/server/tokenUtils";
import { DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS } from "@/lib/constants/auth.constants";

describe("extractTokens", () => {
  it("extracts PascalCase AccessToken/RefreshToken (the documented backend shape)", () => {
    expect(extractTokens({ AccessToken: "access-1", RefreshToken: "refresh-1" })).toEqual({
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("extracts camelCase accessToken/refreshToken as a fallback", () => {
    expect(extractTokens({ accessToken: "access-2", refreshToken: "refresh-2" })).toEqual({
      accessToken: "access-2",
      refreshToken: "refresh-2",
    });
  });

  it("returns null when either token is missing", () => {
    expect(extractTokens({ AccessToken: "access-1" })).toBeNull();
    expect(extractTokens({ RefreshToken: "refresh-1" })).toBeNull();
    expect(extractTokens({})).toBeNull();
  });

  it("returns null for non-object payloads", () => {
    expect(extractTokens(null)).toBeNull();
    expect(extractTokens("not an object")).toBeNull();
    expect(extractTokens(undefined)).toBeNull();
  });
});

describe("computeAccessTokenMaxAge", () => {
  it("returns the default when claims are null", () => {
    expect(computeAccessTokenMaxAge(null)).toBe(DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS);
  });

  it("returns the default when the exp claim is missing", () => {
    expect(computeAccessTokenMaxAge({ sub: "1" })).toBe(DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS);
  });

  it("derives the remaining seconds from a future exp claim", () => {
    const exp = Math.floor(Date.now() / 1000) + 500;
    const maxAge = computeAccessTokenMaxAge({ exp });
    expect(maxAge).toBeGreaterThan(0);
    expect(maxAge).toBeLessThanOrEqual(500);
  });

  it("falls back to the default when exp is already in the past", () => {
    const exp = Math.floor(Date.now() / 1000) - 500;
    expect(computeAccessTokenMaxAge({ exp })).toBe(DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS);
  });
});
