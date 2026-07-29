import { decodeJwt, isTokenExpired, mapClaimsToAuthUser } from "@/lib/utils/jwt";

function base64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildToken(claims: Record<string, unknown>): string {
  return [base64Url(JSON.stringify({ alg: "none", typ: "JWT" })), base64Url(JSON.stringify(claims)), "sig"].join(
    "."
  );
}

describe("decodeJwt", () => {
  it("decodes a well-formed token's payload", () => {
    const token = buildToken({ sub: "1", email: "jane@example.com" });
    expect(decodeJwt(token)).toEqual({ sub: "1", email: "jane@example.com" });
  });

  it("returns null for a malformed token", () => {
    expect(decodeJwt("not-a-jwt")).toBeNull();
    expect(decodeJwt("a.b")).toBeNull();
  });
});

describe("isTokenExpired", () => {
  it("returns true when claims are null", () => {
    expect(isTokenExpired(null)).toBe(true);
  });

  it("returns true when exp is missing", () => {
    expect(isTokenExpired({ sub: "1" })).toBe(true);
  });

  it("returns false for a future exp", () => {
    expect(isTokenExpired({ exp: Math.floor(Date.now() / 1000) + 500 })).toBe(false);
  });

  it("returns true for an exp within the skew window", () => {
    expect(isTokenExpired({ exp: Math.floor(Date.now() / 1000) + 5 })).toBe(true);
  });
});

describe("mapClaimsToAuthUser", () => {
  it("returns null when the mandatory id/email/role claims are missing", () => {
    expect(mapClaimsToAuthUser({ email: "jane@example.com" })).toBeNull();
  });

  it("maps given_name/family_name claims as-is (mock-auth token shape)", () => {
    const user = mapClaimsToAuthUser({
      sub: "1",
      email: "jane@example.com",
      given_name: "Jane",
      family_name: "Doe",
      unique_name: "jane",
      role: "Employee",
    });
    expect(user).toEqual({
      id: "1",
      email: "jane@example.com",
      username: "jane",
      firstName: "Jane",
      lastName: "Doe",
      role: "Employee",
      countryId: null,
    });
  });

  it("derives firstName/lastName by splitting the 'name' claim when given_name/family_name are absent (real backend token shape)", () => {
    const user = mapClaimsToAuthUser({
      sub: "1",
      email: "admin@hrsystem.com",
      name: "System Admin",
      role: "SystemAdmin",
    });
    expect(user).toEqual(
      expect.objectContaining({ firstName: "System", lastName: "Admin", role: "SystemAdmin" })
    );
  });

  it("keeps a multi-word 'last name' together when splitting the 'name' claim", () => {
    const user = mapClaimsToAuthUser({
      sub: "1",
      email: "linthit@example.com",
      name: "Lin Thit Htoo edited",
      role: "SystemAdmin",
    });
    expect(user).toEqual(expect.objectContaining({ firstName: "Lin", lastName: "Thit Htoo edited" }));
  });

  it("leaves firstName/lastName undefined when there is no name claim at all", () => {
    const user = mapClaimsToAuthUser({ sub: "1", email: "jane@example.com", role: "Employee" });
    expect(user?.firstName).toBeUndefined();
    expect(user?.lastName).toBeUndefined();
  });

  it("never overrides given_name/family_name claims with the 'name' claim when both are present", () => {
    const user = mapClaimsToAuthUser({
      sub: "1",
      email: "jane@example.com",
      given_name: "Jane",
      family_name: "Doe",
      name: "Someone Else",
      role: "Employee",
    });
    expect(user).toEqual(expect.objectContaining({ firstName: "Jane", lastName: "Doe" }));
  });

  it("defaults countryId to null when the claim is absent", () => {
    const user = mapClaimsToAuthUser({ sub: "1", email: "jane@example.com", role: "Employee" });
    expect(user?.countryId).toBeNull();
  });
});
