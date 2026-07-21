import { z } from "zod";

/**
 * Lenient GUID format check: five hyphen-separated groups of hex digits
 * (8-4-4-4-12), matching what .NET's `Guid.ToString()` always produces.
 *
 * Deliberately *not* `z.uuid()` — Zod's built-in `uuid()` additionally
 * requires the RFC 9562/4122 version (`[1-8]`) and variant (`[89abAB]`)
 * nibbles, which this backend's data does not always satisfy:
 *   - The seeded `Auth/GetRoles` role ids (`docs/HR_System_BE.postman_collection.json`,
 *     e.g. `11111111-1111-1111-1111-111111111101`) fail that stricter check,
 *     which was blocking the Create User "Role" select — the user could pick
 *     a role, but client-side validation kept reporting "Select a role."
 *   - The seeded `SystemAdmin` account id (`00000000-0000-0000-0000-000000000001`,
 *     also used throughout the same Postman collection) fails it too, which
 *     was turning into a 400 ("Invalid filter parameters.") on
 *     `GET /api/timesheet-entries?userId=...` for that account — i.e. the
 *     "My Timesheets" / "Timesheet History" screens.
 *
 * Used anywhere a GUID *value* (not user-typed free text) needs a basic
 * format sanity-check before being sent to this app's own Route Handlers.
 */
const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function guidSchema(message: string) {
  return z.string().regex(GUID_PATTERN, message);
}
