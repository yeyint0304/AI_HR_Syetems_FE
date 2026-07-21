import {
  assignResourceSchema,
  createProjectSchema,
  updateProjectSchema,
} from "@/lib/validators/project.validators";

const VALID_PROJECT = {
  name: "Project Alpha - Web Platform",
  code: "PRJ-ALPHA",
  clientName: "Acme Corp",
  clientEmail: "client@acme.com",
  startDate: "2025-01-15",
  endDate: "2025-12-31",
  maxDailyHours: 8,
  description: "A sample project",
};

describe("project.validators", () => {
  describe("createProjectSchema", () => {
    it("accepts a fully valid payload", () => {
      const result = createProjectSchema.safeParse(VALID_PROJECT);
      expect(result.success).toBe(true);
    });

    it("rejects a missing project name", () => {
      const result = createProjectSchema.safeParse({ ...VALID_PROJECT, name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a lowercase project code", () => {
      const result = createProjectSchema.safeParse({ ...VALID_PROJECT, code: "prj-alpha" });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid client email", () => {
      const result = createProjectSchema.safeParse({ ...VALID_PROJECT, clientEmail: "not-an-email" });
      expect(result.success).toBe(false);
    });

    it("rejects an end date before the start date", () => {
      const result = createProjectSchema.safeParse({
        ...VALID_PROJECT,
        startDate: "2025-12-31",
        endDate: "2025-01-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects max daily hours outside of 1-24", () => {
      expect(createProjectSchema.safeParse({ ...VALID_PROJECT, maxDailyHours: 0 }).success).toBe(false);
      expect(createProjectSchema.safeParse({ ...VALID_PROJECT, maxDailyHours: 25 }).success).toBe(false);
    });

    it("allows an empty description", () => {
      const result = createProjectSchema.safeParse({ ...VALID_PROJECT, description: "" });
      expect(result.success).toBe(true);
    });
  });

  describe("updateProjectSchema", () => {
    it("requires isActive to be a boolean", () => {
      const result = updateProjectSchema.safeParse({ ...VALID_PROJECT, isActive: true });
      expect(result.success).toBe(true);
    });

    it("rejects a non-boolean isActive", () => {
      const result = updateProjectSchema.safeParse({ ...VALID_PROJECT, isActive: "true" });
      expect(result.success).toBe(false);
    });
  });

  describe("assignResourceSchema", () => {
    it("accepts valid GUIDs", () => {
      const result = assignResourceSchema.safeParse({
        userId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        resourceRoleTypeId: "3fa85f64-5717-4562-b3fc-2c963f66afa7",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a non-GUID userId", () => {
      const result = assignResourceSchema.safeParse({
        userId: "not-a-guid",
        resourceRoleTypeId: "3fa85f64-5717-4562-b3fc-2c963f66afa7",
      });
      expect(result.success).toBe(false);
    });

    it("accepts the backend's seeded, non-RFC-4122-variant ResourceRoleType id (regression: assign-resource 400)", () => {
      // Per `docs/HR_System_BE.postman_collection.json` ("Assign Resource"),
      // the seeded ResourceRoleType ids (e.g. this one, "Senior Developer")
      // don't satisfy `z.uuid()`'s stricter RFC 9562/4122 variant check —
      // this was turning a valid "Resource role" selection on the Project
      // Assignments screen into a 400, both client- and server-side (see
      // `POST /api/projects/[id]/assignments`, which re-validates with this
      // same schema). `userId`/`resourceRoleTypeId` use the shared lenient
      // `guidSchema` instead (see `lib/validators/shared.validators.ts`).
      const result = assignResourceSchema.safeParse({
        userId: "84e4be46-3d9f-4e86-ab08-74d8837958b9",
        resourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
      });
      expect(result.success).toBe(true);
    });
  });
});
