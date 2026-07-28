/**
 * @jest-environment node
 */
import { computeAccessTokenMaxAge, extractTokens, extractUsername } from "@/lib/server/tokenUtils";
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

  it("extracts tokens nested under the real backend's Data envelope (per the saved Auth/Login example)", () => {
    expect(
      extractTokens({
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          AccessToken: "access-envelope",
          RefreshToken: "refresh-envelope",
          ExpiresAt: "2026-08-06T11:15:48.0766717Z",
          UserId: "00000000-0000-0000-0000-000000000001",
          Username: "admin",
          Email: "admin@hrsystem.com",
          FirstName: "System",
          LastName: "Admin",
          Roles: ["SystemAdmin"],
        },
      })
    ).toEqual({
      accessToken: "access-envelope",
      refreshToken: "refresh-envelope",
    });
  });

  it("returns null when the backend envelope reports a logical failure (IsSuccess: false)", () => {
    expect(
      extractTokens({
        StatusCode: 401,
        IsSuccess: false,
        Message: "Invalid username/email or password.",
        Data: null,
      })
    ).toBeNull();
  });
});

describe("extractUsername", () => {
  it("extracts the PascalCase Username field nested under the Data envelope", () => {
    expect(
      extractUsername({
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: { UserId: "1", Username: "admin", Email: "admin@hrsystem.com" },
      })
    ).toBe("admin");
  });

  it("extracts a camelCase username as a fallback", () => {
    expect(extractUsername({ username: "jane" })).toBe("jane");
  });

  it("returns undefined when the backend envelope reports a logical failure", () => {
    expect(
      extractUsername({ StatusCode: 401, IsSuccess: false, Message: "Invalid credentials.", Data: null })
    ).toBeUndefined();
  });

  it("returns undefined when the field is missing, blank, or the payload isn't an object", () => {
    expect(extractUsername({})).toBeUndefined();
    expect(extractUsername({ Username: "" })).toBeUndefined();
    expect(extractUsername(null)).toBeUndefined();
    expect(extractUsername("not an object")).toBeUndefined();
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
