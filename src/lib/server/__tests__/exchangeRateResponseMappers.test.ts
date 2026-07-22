/**
 * @jest-environment node
 */
import {
  mapBackendExchangeRate,
  mapBackendExchangeRateList,
} from "@/lib/server/exchangeRateResponseMappers";

describe("exchangeRateResponseMappers", () => {
  describe("mapBackendExchangeRate", () => {
    it("maps a PascalCase exchange rate with nested currency refs (GetAllExchangeRates/GetExchangeRateById shape)", () => {
      expect(
        mapBackendExchangeRate({
          Id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
          FromCurrency: { Id: "33333333-3333-3333-3333-333333333301", Code: "SGD", Symbol: "S$" },
          ToCurrency: { Id: "33333333-3333-3333-3333-333333333302", Code: "USD", Symbol: "$" },
          Rate: 1.25,
          EffectiveDate: "2026-06-22",
          IsActive: true,
          CreatedAt: "2026-06-22T12:44:02Z",
        })
      ).toEqual({
        id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
        fromCurrency: { id: "33333333-3333-3333-3333-333333333301", code: "SGD", symbol: "S$" },
        toCurrency: { id: "33333333-3333-3333-3333-333333333302", code: "USD", symbol: "$" },
        rate: 1.25,
        effectiveDate: "2026-06-22",
        isActive: true,
      });
    });

    it("maps the flat FromCurrencyId/ToCurrencyId shape returned by Create/UpdateExchangeRate, defaulting code/symbol to empty strings", () => {
      expect(
        mapBackendExchangeRate({
          Id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
          FromCurrencyId: "33333333-3333-3333-3333-333333333301",
          ToCurrencyId: "33333333-3333-3333-3333-333333333302",
          Rate: 1.25,
          EffectiveDate: "2026-06-22",
          IsActive: true,
          CreatedAt: "2026-06-22T12:44:01Z",
        })
      ).toEqual({
        id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
        fromCurrency: { id: "33333333-3333-3333-3333-333333333301", code: "", symbol: "" },
        toCurrency: { id: "33333333-3333-3333-3333-333333333302", code: "", symbol: "" },
        rate: 1.25,
        effectiveDate: "2026-06-22",
        isActive: true,
      });
    });

    it("maps a camelCase exchange rate", () => {
      expect(
        mapBackendExchangeRate({
          id: "1",
          fromCurrency: { id: "f1", code: "SGD", symbol: "S$" },
          toCurrency: { id: "t1", code: "USD", symbol: "$" },
          rate: 0.74,
          effectiveDate: "2025-01-01",
          isActive: true,
        })
      ).toEqual(
        expect.objectContaining({ id: "1", rate: 0.74, effectiveDate: "2025-01-01", isActive: true })
      );
    });

    it("returns null when required fields are missing", () => {
      expect(mapBackendExchangeRate({ Rate: 1.25 })).toBeNull();
      expect(mapBackendExchangeRate(null)).toBeNull();
      expect(mapBackendExchangeRate("not-an-object")).toBeNull();
    });

    it("unwraps the real backend's Data envelope (per the saved CreateExchangeRate example)", () => {
      expect(
        mapBackendExchangeRate({
          StatusCode: 200,
          IsSuccess: true,
          Message: "Exchange rate created.",
          Data: {
            Id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
            FromCurrencyId: "33333333-3333-3333-3333-333333333301",
            ToCurrencyId: "33333333-3333-3333-3333-333333333302",
            Rate: 1.25,
            EffectiveDate: "2026-06-22",
            IsActive: true,
            CreatedAt: "2026-06-22T12:44:01Z",
          },
        })
      ).toEqual(
        expect.objectContaining({
          id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
          rate: 1.25,
          effectiveDate: "2026-06-22",
          isActive: true,
        })
      );
    });

    it("returns null when the envelope reports a logical failure (IsSuccess: false)", () => {
      expect(
        mapBackendExchangeRate({ StatusCode: 404, IsSuccess: false, Message: "Not found.", Data: null })
      ).toBeNull();
    });
  });

  describe("mapBackendExchangeRateList", () => {
    it("extracts a bare array", () => {
      const result = mapBackendExchangeRateList([
        { Id: "1", FromCurrency: { Id: "f1", Code: "SGD" }, ToCurrency: { Id: "t1", Code: "USD" }, Rate: 1, EffectiveDate: "2025-01-01" },
      ]);
      expect(result).toHaveLength(1);
    });

    it("unwraps the real backend's paginated Data.Items envelope (per the saved GetAllExchangeRates example)", () => {
      const result = mapBackendExchangeRateList({
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Items: [
            {
              Id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
              FromCurrency: { Id: "33333333-3333-3333-3333-333333333301", Code: "SGD", Symbol: "S$" },
              ToCurrency: { Id: "33333333-3333-3333-3333-333333333302", Code: "USD", Symbol: "$" },
              Rate: 1.25,
              EffectiveDate: "2026-06-22",
              IsActive: true,
              CreatedAt: "2026-06-22T12:44:02Z",
            },
          ],
          TotalCount: 1,
          Page: 1,
          PageSize: 20,
        },
      });

      expect(result).toEqual([
        {
          id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
          fromCurrency: { id: "33333333-3333-3333-3333-333333333301", code: "SGD", symbol: "S$" },
          toCurrency: { id: "33333333-3333-3333-3333-333333333302", code: "USD", symbol: "$" },
          rate: 1.25,
          effectiveDate: "2026-06-22",
          isActive: true,
        },
      ]);
    });

    it("returns an empty array for an unrecognized shape", () => {
      expect(mapBackendExchangeRateList({ unexpected: true })).toEqual([]);
    });
  });
});
