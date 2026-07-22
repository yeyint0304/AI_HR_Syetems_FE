import { guidSchema } from "@/lib/validators/shared.validators";

describe("guidSchema", () => {
  const schema = guidSchema("Invalid GUID.");

  it("accepts a standard RFC 4122 v4 GUID", () => {
    expect(schema.safeParse("3fa85f64-5717-4562-b3fc-2c963f66afa6").success).toBe(true);
  });

  it("accepts the backend's seeded Role ids, which are not RFC 4122-variant compliant", () => {
    // Per `docs/HR_System_BE.postman_collection.json` (`Auth/GetRoles`) — the
    // seeded SystemAdmin/ProjectAdmin/Employee role ids all share this
    // non-standard-variant pattern. `z.uuid()` rejects these; `guidSchema`
    // must accept them so the Create User "Role" select can pass validation.
    expect(schema.safeParse("11111111-1111-1111-1111-111111111101").success).toBe(true);
  });

  it("accepts the backend's seeded SystemAdmin user id", () => {
    // Per `docs/HR_System_BE.postman_collection.json` — used throughout as
    // the seeded SystemAdmin account's `sub` claim. `z.uuid()` rejects this;
    // `guidSchema` must accept it so `userId` query filters built from the
    // signed-in user's own id (e.g. My Timesheets/Timesheet History) work.
    expect(schema.safeParse("00000000-0000-0000-0000-000000000001").success).toBe(true);
  });

  it("rejects a non-GUID string", () => {
    expect(schema.safeParse("not-a-guid").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(schema.safeParse("").success).toBe(false);
  });
});
