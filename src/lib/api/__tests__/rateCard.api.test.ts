import { apiClient } from "@/lib/api/axiosInstance";
import {
  createRateCardRequest,
  deleteRateCardRequest,
  getRateCardListRequest,
  updateRateCardRequest,
} from "@/lib/api/rateCard.api";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const RATE_CARD = {
  id: "18c16be1-9c69-454a-aa7c-5e6bd01df9bd",
  country: { id: "c1", code: "SG", name: "Singapore" },
  resourceRoleType: { id: "r1", name: "Senior Developer" },
  currency: { id: "cur1", code: "SGD", symbol: "S$" },
  hourlyRate: 25,
  billingRate: 75,
  effectiveDate: "2025-03-01",
  isActive: true,
};

describe("rateCard.api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getRateCardListRequest fetches and unwraps the rate card list", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [RATE_CARD] } });

    const result = await getRateCardListRequest();

    expect(apiClient.get).toHaveBeenCalledWith("/rate-cards", { params: undefined });
    expect(result).toEqual([RATE_CARD]);
  });

  it("getRateCardListRequest forwards filters as query params", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [] } });

    await getRateCardListRequest({ countryId: "c1", isActive: true });

    expect(apiClient.get).toHaveBeenCalledWith("/rate-cards", {
      params: { countryId: "c1", isActive: true },
    });
  });

  it("createRateCardRequest posts the payload and returns the created rate card", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: RATE_CARD } });

    const payload = {
      countryId: "c1",
      resourceRoleTypeId: "r1",
      currencyId: "cur1",
      hourlyRate: 25,
      billingRate: 75,
      effectiveDate: "2025-03-01",
      isActive: true,
    };
    const result = await createRateCardRequest(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/rate-cards", payload);
    expect(result).toEqual(RATE_CARD);
  });

  it("updateRateCardRequest puts the payload to the rate card's id", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: RATE_CARD } });

    const payload = { hourlyRate: 30, billingRate: 80, effectiveDate: "2025-04-01", isActive: true };
    const result = await updateRateCardRequest("18c16be1-9c69-454a-aa7c-5e6bd01df9bd", payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/rate-cards/18c16be1-9c69-454a-aa7c-5e6bd01df9bd",
      payload
    );
    expect(result).toEqual(RATE_CARD);
  });

  it("deleteRateCardRequest deletes the rate card by id", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    await deleteRateCardRequest("18c16be1-9c69-454a-aa7c-5e6bd01df9bd");

    expect(apiClient.delete).toHaveBeenCalledWith("/rate-cards/18c16be1-9c69-454a-aa7c-5e6bd01df9bd");
  });
});
