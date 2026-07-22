import { apiClient } from "@/lib/api/axiosInstance";
import {
  createExchangeRateRequest,
  deleteExchangeRateRequest,
  getExchangeRateListRequest,
  updateExchangeRateRequest,
} from "@/lib/api/exchangeRate.api";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const EXCHANGE_RATE = {
  id: "80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
  fromCurrency: { id: "f1", code: "SGD", symbol: "S$" },
  toCurrency: { id: "t1", code: "USD", symbol: "$" },
  rate: 1.25,
  effectiveDate: "2026-06-22",
  isActive: true,
};

describe("exchangeRate.api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getExchangeRateListRequest fetches and unwraps the exchange rate list", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [EXCHANGE_RATE] } });

    const result = await getExchangeRateListRequest();

    expect(apiClient.get).toHaveBeenCalledWith("/exchange-rates");
    expect(result).toEqual([EXCHANGE_RATE]);
  });

  it("createExchangeRateRequest posts the payload and returns the created exchange rate", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: EXCHANGE_RATE } });

    const payload = {
      fromCurrencyId: "f1",
      toCurrencyId: "t1",
      rate: 1.25,
      effectiveDate: "2026-06-22",
      isActive: true,
    };
    const result = await createExchangeRateRequest(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/exchange-rates", payload);
    expect(result).toEqual(EXCHANGE_RATE);
  });

  it("updateExchangeRateRequest puts the payload to the exchange rate's id", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: EXCHANGE_RATE } });

    const payload = { rate: 1.3, effectiveDate: "2026-06-22", isActive: true };
    const result = await updateExchangeRateRequest("80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c", payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/exchange-rates/80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c",
      payload
    );
    expect(result).toEqual(EXCHANGE_RATE);
  });

  it("deleteExchangeRateRequest deletes the exchange rate by id", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    await deleteExchangeRateRequest("80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c");

    expect(apiClient.delete).toHaveBeenCalledWith(
      "/exchange-rates/80e3d86f-b3cb-40e8-bc28-f75bc89f4d4c"
    );
  });
});
