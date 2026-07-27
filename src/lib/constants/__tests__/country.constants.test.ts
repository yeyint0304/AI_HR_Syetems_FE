import { canManageCountries, COUNTRY_MANAGER_ROLES } from "@/lib/constants/country.constants";

describe("country.constants", () => {
  describe("canManageCountries", () => {
    it("allows SystemAdmin", () => {
      expect(canManageCountries("SystemAdmin")).toBe(true);
    });

    it("disallows ProjectAdmin", () => {
      expect(canManageCountries("ProjectAdmin")).toBe(false);
    });

    it("disallows a regular User", () => {
      expect(canManageCountries("User")).toBe(false);
    });

    it("disallows a Guest", () => {
      expect(canManageCountries("Guest")).toBe(false);
    });

    it("disallows null/undefined roles", () => {
      expect(canManageCountries(null)).toBe(false);
      expect(canManageCountries(undefined)).toBe(false);
    });
  });

  it("exposes exactly SystemAdmin as the manager role", () => {
    expect(COUNTRY_MANAGER_ROLES).toEqual(["SystemAdmin"]);
  });
});
