/**
 * @jest-environment node
 *
 * Proxy (see `node_modules/next/dist/docs/.../proxy.md`) defaults to the
 * Node.js runtime, not the browser/jsdom one the rest of this suite uses for
 * React components — run this file under `node` so the Fetch API globals
 * (`Request`/`Response`, used internally by `NextRequest`/`NextResponse`)
 * are available, matching production.
 */
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { ACCESS_TOKEN_COOKIE } from "@/lib/constants/auth.constants";

/**
 * Builds an unsigned JWT-shaped token with the given claims (the
 * decode-only `lib/utils/jwt.ts` never verifies signatures, so this is
 * sufficient to exercise `proxy.ts`'s optimistic checks).
 */
function buildToken(claims: Record<string, unknown>): string {
  const base64Url = (value: string) =>
    Buffer.from(value, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return [base64Url(JSON.stringify({ alg: "none", typ: "JWT" })), base64Url(JSON.stringify(claims)), "sig"].join(
    "."
  );
}

const nowSeconds = Math.floor(Date.now() / 1000);
const validToken = buildToken({
  sub: "1",
  email: "jane@example.com",
  role: "User",
  exp: nowSeconds + 900,
});
const adminToken = buildToken({
  sub: "2",
  email: "admin@example.com",
  role: "SystemAdmin",
  exp: nowSeconds + 900,
});
const expiredToken = buildToken({
  sub: "1",
  email: "jane@example.com",
  role: "User",
  exp: nowSeconds - 60,
});

function buildRequest(path: string, token?: string): NextRequest {
  const request = new NextRequest(new URL(path, "http://localhost:3000"));
  if (token) {
    request.cookies.set(ACCESS_TOKEN_COOKIE, token);
  }
  return request;
}

describe("proxy", () => {
  it("redirects unauthenticated visitors hitting a protected route (including /) to /login", () => {
    const response = proxy(buildRequest("/"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets unauthenticated visitors reach /login", () => {
    const response = proxy(buildRequest("/login"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets an authenticated visitor with a valid token through to a protected route", () => {
    const response = proxy(buildRequest("/home", validToken));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an authenticated visitor away from /login back to /", () => {
    const response = proxy(buildRequest("/login", validToken));
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("treats an expired token as unauthenticated", () => {
    const response = proxy(buildRequest("/home", expiredToken));
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects a non-SystemAdmin away from /admin routes", () => {
    const response = proxy(buildRequest("/admin/users/new", validToken));
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("lets a SystemAdmin through to /admin routes", () => {
    const response = proxy(buildRequest("/admin/users/new", adminToken));
    expect(response.headers.get("location")).toBeNull();
  });
});
