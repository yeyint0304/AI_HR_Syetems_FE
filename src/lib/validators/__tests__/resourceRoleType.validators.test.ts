import {
  createResourceRoleTypeSchema,
  updateResourceRoleTypeSchema,
} from "@/lib/validators/resourceRoleType.validators";

describe("resourceRoleType.validators", () => {
  describe("createResourceRoleTypeSchema", () => {
    it("accepts a fully valid payload", () => {
      expect(
        createResourceRoleTypeSchema.safeParse({
          name: "Software Engineer",
          description: "Full-stack software engineer role",
        }).success
      ).toBe(true);
    });

    it("accepts an empty description", () => {
      expect(
        createResourceRoleTypeSchema.safeParse({ name: "Software Engineer", description: "" }).success
      ).toBe(true);
    });

    it("accepts a missing description", () => {
      expect(createResourceRoleTypeSchema.safeParse({ name: "Software Engineer" }).success).toBe(true);
    });

    it("rejects a missing name", () => {
      expect(createResourceRoleTypeSchema.safeParse({ name: "" }).success).toBe(false);
    });

    it("rejects a description that is too long", () => {
      const result = createResourceRoleTypeSchema.safeParse({
        name: "Software Engineer",
        description: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateResourceRoleTypeSchema", () => {
    it("accepts the same shape as create", () => {
      expect(
        updateResourceRoleTypeSchema.safeParse({
          name: "Senior Software Engineer",
          description: "Senior full-stack role",
        }).success
      ).toBe(true);
    });

    it("rejects a missing name", () => {
      expect(updateResourceRoleTypeSchema.safeParse({ name: "" }).success).toBe(false);
    });
  });
});
