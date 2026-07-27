import { createCountrySchema, updateCountrySchema } from "@/lib/validators/country.validators";

const VALID_CREATE = { code: "SG", name: "Singapore" };

describe("country.validators", () => {
  describe("createCountrySchema", () => {
    it("accepts a fully valid payload", () => {
      expect(createCountrySchema.safeParse(VALID_CREATE).success).toBe(true);
    });

    it("rejects a code that isn't a 2-letter uppercase ISO 3166-1 code", () => {
      expect(createCountrySchema.safeParse({ ...VALID_CREATE, code: "sg" }).success).toBe(false);
      expect(createCountrySchema.safeParse({ ...VALID_CREATE, code: "SGP" }).success).toBe(false);
      expect(createCountrySchema.safeParse({ ...VALID_CREATE, code: "" }).success).toBe(false);
    });

    it("rejects a missing name", () => {
      expect(createCountrySchema.safeParse({ ...VALID_CREATE, name: "" }).success).toBe(false);
    });
  });

  describe("updateCountrySchema", () => {
    it("accepts a valid name-only payload", () => {
      expect(updateCountrySchema.safeParse({ name: "Republic of Singapore" }).success).toBe(true);
    });

    it("rejects a missing name", () => {
      expect(updateCountrySchema.safeParse({ name: "" }).success).toBe(false);
    });

    it("does not require or accept a code field for the update to be considered", () => {
      // `code` simply isn't part of the schema shape — passing it is ignored,
      // not rejected (Zod object schemas strip unknown keys by default).
      const result = updateCountrySchema.safeParse({ name: "Singapore", code: "SG" });
      expect(result.success).toBe(true);
    });
  });
});
