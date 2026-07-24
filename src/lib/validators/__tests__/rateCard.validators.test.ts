import {
  createRateCardSchema,
  rateCardListQuerySchema,
  updateRateCardSchema,
} from "@/lib/validators/rateCard.validators";

const VALID_CREATE = {
  countryId: "22222222-2222-2222-2222-222222222201",
  resourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
  currencyId: "33333333-3333-3333-3333-333333333301",
  hourlyRate: 25,
  billingRate: 75,
  effectiveDate: "2025-03-01",
  isActive: true,
};

describe("rateCard.validators", () => {
  describe("createRateCardSchema", () => {
    it("accepts a fully valid payload", () => {
      expect(createRateCardSchema.safeParse(VALID_CREATE).success).toBe(true);
    });

    it("rejects a non-GUID countryId", () => {
      expect(createRateCardSchema.safeParse({ ...VALID_CREATE, countryId: "not-a-guid" }).success).toBe(
        false
      );
    });

    it("rejects a non-GUID resourceRoleTypeId", () => {
      expect(
        createRateCardSchema.safeParse({ ...VALID_CREATE, resourceRoleTypeId: "not-a-guid" }).success
      ).toBe(false);
    });

    it("rejects a non-GUID currencyId", () => {
      expect(createRateCardSchema.safeParse({ ...VALID_CREATE, currencyId: "not-a-guid" }).success).toBe(
        false
      );
    });

    it("rejects a zero or negative hourly rate", () => {
      expect(createRateCardSchema.safeParse({ ...VALID_CREATE, hourlyRate: 0 }).success).toBe(false);
      expect(createRateCardSchema.safeParse({ ...VALID_CREATE, hourlyRate: -5 }).success).toBe(false);
    });

    it("rejects an hourly rate that is too large", () => {
      expect(createRateCardSchema.safeParse({ ...VALID_CREATE, hourlyRate: 10_000_000 }).success).toBe(
        false
      );
    });

    it("accepts a zero billing rate but rejects a negative one", () => {
      expect(createRateCardSchema.safeParse({ ...VALID_CREATE, billingRate: 0 }).success).toBe(true);
      expect(createRateCardSchema.safeParse({ ...VALID_CREATE, billingRate: -1 }).success).toBe(false);
    });

    it("rejects a missing effective date", () => {
      expect(createRateCardSchema.safeParse({ ...VALID_CREATE, effectiveDate: "" }).success).toBe(false);
    });

    it("rejects a non-boolean isActive", () => {
      expect(createRateCardSchema.safeParse({ ...VALID_CREATE, isActive: "true" }).success).toBe(false);
    });

    it("accepts the backend's seeded, non-RFC-4122-variant reference-data ids", () => {
      // Per `docs/HR_System_BE.postman_collection.json` ("Rate Card" folder),
      // the seeded Country/ResourceRoleType/Currency ids (e.g.
      // `22222222-...-222222222201`) don't satisfy `z.uuid()`'s stricter
      // RFC 9562/4122 variant check — this schema uses the shared lenient
      // `guidSchema` instead (see `lib/validators/shared.validators.ts`).
      expect(createRateCardSchema.safeParse(VALID_CREATE).success).toBe(true);
    });
  });

  describe("updateRateCardSchema", () => {
    const VALID_UPDATE = {
      hourlyRate: 30,
      billingRate: 80,
      effectiveDate: "2025-04-01",
      isActive: true,
    };

    it("accepts a fully valid payload", () => {
      expect(updateRateCardSchema.safeParse(VALID_UPDATE).success).toBe(true);
    });

    it("does not require country/role/currency ids", () => {
      expect(updateRateCardSchema.safeParse(VALID_UPDATE).success).toBe(true);
    });

    it("rejects a zero or negative hourly rate", () => {
      expect(updateRateCardSchema.safeParse({ ...VALID_UPDATE, hourlyRate: 0 }).success).toBe(false);
    });

    it("rejects a non-boolean isActive", () => {
      expect(updateRateCardSchema.safeParse({ ...VALID_UPDATE, isActive: "false" }).success).toBe(false);
    });
  });

  describe("rateCardListQuerySchema", () => {
    it("accepts an empty query (every filter optional)", () => {
      expect(rateCardListQuerySchema.safeParse({}).success).toBe(true);
    });

    it("transforms isActive from a string to a boolean", () => {
      const result = rateCardListQuerySchema.safeParse({ isActive: "true" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.isActive).toBe(true);
    });

    it("rejects an invalid isActive value", () => {
      expect(rateCardListQuerySchema.safeParse({ isActive: "yes" }).success).toBe(false);
    });

    it("rejects a non-GUID countryId filter", () => {
      expect(rateCardListQuerySchema.safeParse({ countryId: "not-a-guid" }).success).toBe(false);
    });
  });
});
