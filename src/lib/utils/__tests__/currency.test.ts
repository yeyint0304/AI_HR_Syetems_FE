import { filterSelectableCurrencies } from "@/lib/utils/currency";
import type { Currency } from "@/types/currency.types";

const SGD: Currency = { id: "c1", code: "SGD", name: "Singapore Dollar", symbol: "S$", isBaseCurrency: true, isActive: true };
const USD: Currency = { id: "c2", code: "USD", name: "US Dollar", symbol: "$", isBaseCurrency: false, isActive: true };
const MMK_INACTIVE: Currency = {
  id: "c3",
  code: "MMK",
  name: "Myanmar Kyats",
  symbol: "K",
  isBaseCurrency: false,
  isActive: false,
};

describe("filterSelectableCurrencies", () => {
  it("excludes inactive/retired currencies by default", () => {
    expect(filterSelectableCurrencies([SGD, USD, MMK_INACTIVE])).toEqual([SGD, USD]);
  });

  it("keeps an already-selected currency even if it has since been deactivated", () => {
    expect(filterSelectableCurrencies([SGD, USD, MMK_INACTIVE], "c3")).toEqual([SGD, USD, MMK_INACTIVE]);
  });

  it("does not accidentally re-include an unrelated inactive currency", () => {
    expect(filterSelectableCurrencies([SGD, USD, MMK_INACTIVE], "c1")).toEqual([SGD, USD]);
  });

  it("returns an empty array when given no currencies", () => {
    expect(filterSelectableCurrencies([])).toEqual([]);
  });
});
