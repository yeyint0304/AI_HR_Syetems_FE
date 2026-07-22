import {
  canManageExchangeRates,
  EXCHANGE_RATE_MANAGER_ROLES,
} from "@/lib/constants/exchangeRate.constants";

describe("exchangeRate.constants", () => {
  describe("canManageExchangeRates", () => {
    it("allows SystemAdmin", () => {
      expect(canManageExchangeRates("SystemAdmin")).toBe(true);
    });

    it("disallows ProjectAdmin", () => {
      expect(canManageExchangeRates("ProjectAdmin")).toBe(false);
    });

    it("disallows a regular User", () => {
      expect(canManageExchangeRates("User")).toBe(false);
    });

    it("disallows a Guest", () => {
      expect(canManageExchangeRates("Guest")).toBe(false);
    });

    it("disallows null/undefined roles", () => {
      expect(canManageExchangeRates(null)).toBe(false);
      expect(canManageExchangeRates(undefined)).toBe(false);
    });
  });

  it("exposes exactly SystemAdmin as the manager role", () => {
    expect(EXCHANGE_RATE_MANAGER_ROLES).toEqual(["SystemAdmin"]);
  });
});
