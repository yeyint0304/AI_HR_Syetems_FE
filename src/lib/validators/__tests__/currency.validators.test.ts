import { createCurrencySchema, updateCurrencySchema } from "@/lib/validators/currency.validators";

const VALID_CREATE = {
  code: "USD",
  name: "US Dollar",
  symbol: "$",
  isBaseCurrency: false,
  isActive: true,
};

describe("currency.validators", () => {
  describe("createCurrencySchema", () => {
    it("accepts a fully valid payload", () => {
      expect(createCurrencySchema.safeParse(VALID_CREATE).success).toBe(true);
    });

    it("rejects a code that isn't a 3-letter uppercase ISO 4217 code", () => {
      expect(createCurrencySchema.safeParse({ ...VALID_CREATE, code: "us" }).success).toBe(false);
      expect(createCurrencySchema.safeParse({ ...VALID_CREATE, code: "USDD" }).success).toBe(false);
      expect(createCurrencySchema.safeParse({ ...VALID_CREATE, code: "" }).success).toBe(false);
    });

    it("rejects a missing name", () => {
      expect(createCurrencySchema.safeParse({ ...VALID_CREATE, name: "" }).success).toBe(false);
    });

    it("rejects a missing symbol", () => {
      expect(createCurrencySchema.safeParse({ ...VALID_CREATE, symbol: "" }).success).toBe(false);
    });

    it("rejects a non-boolean isBaseCurrency", () => {
      expect(createCurrencySchema.safeParse({ ...VALID_CREATE, isBaseCurrency: "true" }).success).toBe(
        false
      );
    });

    it("rejects a non-boolean isActive", () => {
      expect(createCurrencySchema.safeParse({ ...VALID_CREATE, isActive: "true" }).success).toBe(false);
    });
  });

  describe("updateCurrencySchema", () => {
    const VALID_UPDATE = { name: "US Dollar", symbol: "$", isActive: true };

    it("accepts a fully valid payload", () => {
      expect(updateCurrencySchema.safeParse(VALID_UPDATE).success).toBe(true);
    });

    it("does not require code or isBaseCurrency", () => {
      const result = updateCurrencySchema.safeParse(VALID_UPDATE);
      expect(result.success).toBe(true);
    });

    it("rejects a missing name", () => {
      expect(updateCurrencySchema.safeParse({ ...VALID_UPDATE, name: "" }).success).toBe(false);
    });
  });
});
