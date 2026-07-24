import {
  createExchangeRateSchema,
  updateExchangeRateSchema,
} from "@/lib/validators/exchangeRate.validators";

const VALID_CREATE = {
  fromCurrencyId: "33333333-3333-3333-3333-333333333301",
  toCurrencyId: "33333333-3333-3333-3333-333333333302",
  rate: 1.25,
  effectiveDate: "2026-06-22",
  isActive: true,
};

describe("exchangeRate.validators", () => {
  describe("createExchangeRateSchema", () => {
    it("accepts a fully valid payload", () => {
      expect(createExchangeRateSchema.safeParse(VALID_CREATE).success).toBe(true);
    });

    it("rejects a non-GUID fromCurrencyId", () => {
      const result = createExchangeRateSchema.safeParse({ ...VALID_CREATE, fromCurrencyId: "not-a-guid" });
      expect(result.success).toBe(false);
    });

    it("rejects a non-GUID toCurrencyId", () => {
      const result = createExchangeRateSchema.safeParse({ ...VALID_CREATE, toCurrencyId: "not-a-guid" });
      expect(result.success).toBe(false);
    });

    it("rejects matching from/to currencies", () => {
      const result = createExchangeRateSchema.safeParse({
        ...VALID_CREATE,
        toCurrencyId: VALID_CREATE.fromCurrencyId,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a zero or negative rate", () => {
      expect(createExchangeRateSchema.safeParse({ ...VALID_CREATE, rate: 0 }).success).toBe(false);
      expect(createExchangeRateSchema.safeParse({ ...VALID_CREATE, rate: -1.5 }).success).toBe(false);
    });

    it("rejects a rate that is too large", () => {
      expect(createExchangeRateSchema.safeParse({ ...VALID_CREATE, rate: 10_000_000 }).success).toBe(
        false
      );
    });

    it("rejects a missing effective date", () => {
      expect(createExchangeRateSchema.safeParse({ ...VALID_CREATE, effectiveDate: "" }).success).toBe(
        false
      );
    });

    it("rejects a non-boolean isActive", () => {
      expect(createExchangeRateSchema.safeParse({ ...VALID_CREATE, isActive: "true" }).success).toBe(
        false
      );
    });

    it("accepts the backend's seeded, non-RFC-4122-variant Currency ids (regression: matches ResourceRoleType/AssignResource fix)", () => {
      // Per `docs/HR_System_BE.postman_collection.json` ("Exchange Rate"
      // folder), the seeded Currency ids (e.g. `33333333-...-333333333301`)
      // don't satisfy `z.uuid()`'s stricter RFC 9562/4122 variant check —
      // `fromCurrencyId`/`toCurrencyId` use the shared lenient `guidSchema`
      // instead (see `lib/validators/shared.validators.ts`).
      const result = createExchangeRateSchema.safeParse(VALID_CREATE);
      expect(result.success).toBe(true);
    });
  });

  describe("updateExchangeRateSchema", () => {
    const VALID_UPDATE = { rate: 1.3, effectiveDate: "2026-06-22", isActive: true };

    it("accepts a fully valid payload", () => {
      expect(updateExchangeRateSchema.safeParse(VALID_UPDATE).success).toBe(true);
    });

    it("does not require currency ids", () => {
      const result = updateExchangeRateSchema.safeParse(VALID_UPDATE);
      expect(result.success).toBe(true);
    });

    it("rejects a zero or negative rate", () => {
      expect(updateExchangeRateSchema.safeParse({ ...VALID_UPDATE, rate: 0 }).success).toBe(false);
    });

    it("rejects a non-boolean isActive", () => {
      expect(updateExchangeRateSchema.safeParse({ ...VALID_UPDATE, isActive: "false" }).success).toBe(
        false
      );
    });
  });
});
