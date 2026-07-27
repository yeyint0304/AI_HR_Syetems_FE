import { apiClient } from "@/lib/api/axiosInstance";
import {
  createCurrencyRequest,
  deleteCurrencyRequest,
  getCurrencyListRequest,
  updateCurrencyRequest,
} from "@/lib/api/currency.api";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const CURRENCY = {
  id: "33333333-3333-3333-3333-333333333301",
  code: "SGD",
  name: "Singapore Dollar",
  symbol: "S$",
  isBaseCurrency: true,
  isActive: true,
};

describe("currency.api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getCurrencyListRequest fetches and unwraps the currency list", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [CURRENCY] } });

    const result = await getCurrencyListRequest();

    expect(apiClient.get).toHaveBeenCalledWith("/currencies");
    expect(result).toEqual([CURRENCY]);
  });

  it("createCurrencyRequest posts the payload and returns the created currency", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: CURRENCY } });

    const payload = {
      code: "SGD",
      name: "Singapore Dollar",
      symbol: "S$",
      isBaseCurrency: true,
      isActive: true,
    };
    const result = await createCurrencyRequest(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/currencies", payload);
    expect(result).toEqual(CURRENCY);
  });

  it("updateCurrencyRequest puts the payload to the currency's id", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: CURRENCY } });

    const payload = { name: "Singapore Dollar", symbol: "SGD", isActive: true };
    const result = await updateCurrencyRequest("33333333-3333-3333-3333-333333333301", payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/currencies/33333333-3333-3333-3333-333333333301",
      payload
    );
    expect(result).toEqual(CURRENCY);
  });

  it("deleteCurrencyRequest deletes the currency by id", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    await deleteCurrencyRequest("33333333-3333-3333-3333-333333333301");

    expect(apiClient.delete).toHaveBeenCalledWith("/currencies/33333333-3333-3333-3333-333333333301");
  });
});
