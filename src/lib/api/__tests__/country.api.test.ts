import { apiClient } from "@/lib/api/axiosInstance";
import {
  createCountryRequest,
  deleteCountryRequest,
  getCountryListRequest,
  updateCountryRequest,
} from "@/lib/api/country.api";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const COUNTRY = {
  id: "22222222-2222-2222-2222-222222222201",
  code: "SG",
  name: "Singapore",
};

describe("country.api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getCountryListRequest fetches and unwraps the country list", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [COUNTRY] } });

    const result = await getCountryListRequest();

    expect(apiClient.get).toHaveBeenCalledWith("/countries");
    expect(result).toEqual([COUNTRY]);
  });

  it("createCountryRequest posts the payload and returns the created country", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: COUNTRY } });

    const payload = { code: "SG", name: "Singapore" };
    const result = await createCountryRequest(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/countries", payload);
    expect(result).toEqual(COUNTRY);
  });

  it("updateCountryRequest puts the payload to the country's id", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: COUNTRY } });

    const payload = { name: "Republic of Singapore" };
    const result = await updateCountryRequest("22222222-2222-2222-2222-222222222201", payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/countries/22222222-2222-2222-2222-222222222201",
      payload
    );
    expect(result).toEqual(COUNTRY);
  });

  it("deleteCountryRequest deletes the country by id", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    await deleteCountryRequest("22222222-2222-2222-2222-222222222201");

    expect(apiClient.delete).toHaveBeenCalledWith("/countries/22222222-2222-2222-2222-222222222201");
  });
});
