import { canManageRateCards, RATE_CARD_MANAGER_ROLES } from "@/lib/constants/rateCard.constants";

describe("rateCard.constants", () => {
  describe("canManageRateCards", () => {
    it("allows SystemAdmin", () => {
      expect(canManageRateCards("SystemAdmin")).toBe(true);
    });

    it("disallows ProjectAdmin", () => {
      expect(canManageRateCards("ProjectAdmin")).toBe(false);
    });

    it("disallows a regular User", () => {
      expect(canManageRateCards("User")).toBe(false);
    });

    it("disallows a Guest", () => {
      expect(canManageRateCards("Guest")).toBe(false);
    });

    it("disallows null/undefined roles", () => {
      expect(canManageRateCards(null)).toBe(false);
      expect(canManageRateCards(undefined)).toBe(false);
    });
  });

  it("exposes exactly SystemAdmin as the manager role", () => {
    expect(RATE_CARD_MANAGER_ROLES).toEqual(["SystemAdmin"]);
  });
});
