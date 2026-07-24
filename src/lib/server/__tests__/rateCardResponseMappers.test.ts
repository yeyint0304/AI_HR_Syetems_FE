/**
 * @jest-environment node
 */
import { mapBackendRateCard, mapBackendRateCardList } from "@/lib/server/rateCardResponseMappers";

describe("rateCardResponseMappers", () => {
  describe("mapBackendRateCard", () => {
    it("maps a PascalCase rate card with nested refs (GetAllRateCards/GetRateCardById shape)", () => {
      expect(
        mapBackendRateCard({
          Id: "18c16be1-9c69-454a-aa7c-5e6bd01df9bd",
          Country: { Id: "22222222-2222-2222-2222-222222222201", Code: "SG", Name: "Singapore" },
          ResourceRoleType: { Id: "44444444-4444-4444-4444-444444444401", Name: "Senior Developer" },
          Currency: { Id: "33333333-3333-3333-3333-333333333301", Code: "SGD", Symbol: "S$" },
          HourlyRate: 25,
          BillingRate: 75,
          EffectiveDate: "2025-03-01",
          IsActive: true,
          CreatedAt: "2026-06-22T13:54:06Z",
        })
      ).toEqual({
        id: "18c16be1-9c69-454a-aa7c-5e6bd01df9bd",
        country: { id: "22222222-2222-2222-2222-222222222201", code: "SG", name: "Singapore" },
        resourceRoleType: { id: "44444444-4444-4444-4444-444444444401", name: "Senior Developer" },
        currency: { id: "33333333-3333-3333-3333-333333333301", code: "SGD", symbol: "S$" },
        hourlyRate: 25,
        billingRate: 75,
        effectiveDate: "2025-03-01",
        isActive: true,
      });
    });

    it("maps the flat CountryId/ResourceRoleTypeId/CurrencyId shape returned by Create/UpdateRateCard, defaulting names/codes to empty strings", () => {
      expect(
        mapBackendRateCard({
          Id: "18c16be1-9c69-454a-aa7c-5e6bd01df9bd",
          CountryId: "22222222-2222-2222-2222-222222222201",
          ResourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
          CurrencyId: "33333333-3333-3333-3333-333333333301",
          HourlyRate: 25,
          BillingRate: 75,
          EffectiveDate: "2025-03-01",
          IsActive: true,
        })
      ).toEqual({
        id: "18c16be1-9c69-454a-aa7c-5e6bd01df9bd",
        country: { id: "22222222-2222-2222-2222-222222222201", code: "", name: "" },
        resourceRoleType: { id: "44444444-4444-4444-4444-444444444401", name: "" },
        currency: { id: "33333333-3333-3333-3333-333333333301", code: "", symbol: "" },
        hourlyRate: 25,
        billingRate: 75,
        effectiveDate: "2025-03-01",
        isActive: true,
      });
    });

    it("maps a camelCase rate card", () => {
      expect(
        mapBackendRateCard({
          id: "1",
          country: { id: "c1", code: "SG", name: "Singapore" },
          resourceRoleType: { id: "r1", name: "Senior Developer" },
          currency: { id: "cur1", code: "SGD", symbol: "S$" },
          hourlyRate: 25,
          billingRate: 75,
          effectiveDate: "2025-03-01",
          isActive: true,
        })
      ).toEqual(
        expect.objectContaining({ id: "1", hourlyRate: 25, billingRate: 75, effectiveDate: "2025-03-01" })
      );
    });

    it("returns null when required fields are missing", () => {
      expect(mapBackendRateCard({ HourlyRate: 25 })).toBeNull();
      expect(mapBackendRateCard(null)).toBeNull();
      expect(mapBackendRateCard("not-an-object")).toBeNull();
    });

    it("unwraps the real backend's Data envelope (per the saved CreateRateCard example)", () => {
      expect(
        mapBackendRateCard({
          StatusCode: 200,
          IsSuccess: true,
          Message: "Rate card created.",
          Data: {
            Id: "5c5a0c0c-3663-4add-bdb9-b82bdc4e02cc",
            CountryId: "22222222-2222-2222-2222-222222222201",
            ResourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
            CurrencyId: "33333333-3333-3333-3333-333333333301",
            HourlyRate: 25,
            BillingRate: 75,
            EffectiveDate: "2025-03-01",
            IsActive: true,
            CreatedAt: "2026-06-22T08:43:41Z",
          },
        })
      ).toEqual(
        expect.objectContaining({
          id: "5c5a0c0c-3663-4add-bdb9-b82bdc4e02cc",
          hourlyRate: 25,
          billingRate: 75,
          effectiveDate: "2025-03-01",
        })
      );
    });

    it("returns null when the envelope reports a logical failure (IsSuccess: false)", () => {
      expect(
        mapBackendRateCard({ StatusCode: 404, IsSuccess: false, Message: "Not found.", Data: null })
      ).toBeNull();
    });
  });

  describe("mapBackendRateCardList", () => {
    it("extracts a bare array", () => {
      const result = mapBackendRateCardList([
        {
          Id: "1",
          Country: { Id: "c1", Code: "SG" },
          ResourceRoleType: { Id: "r1", Name: "Junior Developer" },
          Currency: { Id: "cur1", Code: "SGD" },
          HourlyRate: 20,
          BillingRate: 60,
          EffectiveDate: "2025-01-01",
        },
      ]);
      expect(result).toHaveLength(1);
    });

    it("unwraps the real backend's paginated Data.Items envelope (per the saved GetAllRateCards example)", () => {
      const result = mapBackendRateCardList({
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Items: [
            {
              Id: "fcd2b1cc-7c5d-4626-80af-9766e4ebd62b",
              Country: { Id: "22222222-2222-2222-2222-222222222201", Code: "SG", Name: "Singapore" },
              ResourceRoleType: { Id: "44444444-4444-4444-4444-444444444402", Name: "Junior Developer" },
              Currency: { Id: "33333333-3333-3333-3333-333333333301", Code: "SGD", Symbol: "S$" },
              HourlyRate: 25,
              BillingRate: 75,
              EffectiveDate: "2025-03-01",
              IsActive: true,
              CreatedAt: "2026-06-22T13:55:31Z",
            },
          ],
          TotalCount: 1,
          Page: 1,
          PageSize: 20,
        },
      });

      expect(result).toEqual([
        {
          id: "fcd2b1cc-7c5d-4626-80af-9766e4ebd62b",
          country: { id: "22222222-2222-2222-2222-222222222201", code: "SG", name: "Singapore" },
          resourceRoleType: { id: "44444444-4444-4444-4444-444444444402", name: "Junior Developer" },
          currency: { id: "33333333-3333-3333-3333-333333333301", code: "SGD", symbol: "S$" },
          hourlyRate: 25,
          billingRate: 75,
          effectiveDate: "2025-03-01",
          isActive: true,
        },
      ]);
    });

    it("returns an empty array for an unrecognized shape", () => {
      expect(mapBackendRateCardList({ unexpected: true })).toEqual([]);
    });
  });
});
