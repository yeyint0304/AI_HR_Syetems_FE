import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";

/**
 * `jest-environment-jsdom` does not expose `TextEncoder`/`TextDecoder` as
 * globals (unlike the real browser and Node.js runtimes Next.js actually
 * runs in), which silently breaks `lib/utils/jwt.ts#decodeJwt` (and anything
 * built on it — every auth-gated Server Component, the login Route Handler,
 * and `proxy.ts`) under test: the try/catch there swallows the resulting
 * `ReferenceError` and just returns `null`, so tests would falsely observe
 * "no user" for a perfectly valid token. Polyfilling from Node's `util`
 * module keeps behavior identical to production without touching app code.
 */
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}
