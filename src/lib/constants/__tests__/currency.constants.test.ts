import { canManageCurrencies, CURRENCY_MANAGER_ROLES } from "@/lib/constants/currency.constants";

describe("currency.constants", () => {
  describe("canManageCurrencies", () => {
    it("allows SystemAdmin", () => {
      expect(canManageCurrencies("SystemAdmin")).toBe(true);
    });

    it("disallows ProjectAdmin", () => {
      expect(canManageCurrencies("ProjectAdmin")).toBe(false);
    });

    it("disallows a regular User", () => {
      expect(canManageCurrencies("User")).toBe(false);
    });

    it("disallows a Guest", () => {
      expect(canManageCurrencies("Guest")).toBe(false);
    });

    it("disallows null/undefined roles", () => {
      expect(canManageCurrencies(null)).toBe(false);
      expect(canManageCurrencies(undefined)).toBe(false);
    });
  });

  it("exposes exactly SystemAdmin as the manager role", () => {
    expect(CURRENCY_MANAGER_ROLES).toEqual(["SystemAdmin"]);
  });
});
