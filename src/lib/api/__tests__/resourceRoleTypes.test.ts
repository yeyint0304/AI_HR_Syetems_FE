import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiClient";
import { getResourceRoleTypes } from "../resourceRoleTypes";

describe("resourceRoleTypes API service", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("maps a plain array response to ResourceRoleType models", async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      { Id: "r-1", Name: "Software Engineer", Description: "Full-stack" },
    ]);

    const result = await getResourceRoleTypes();

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/ResourceRoleType/GetAllResourceRoleTypes?page=1&pageSize=100",
    );
    expect(result).toEqual([{ id: "r-1", name: "Software Engineer", description: "Full-stack" }]);
  });

  it("unwraps a paginated { Items: [...] } response", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      Items: [{ Id: "r-2", Name: "QA Engineer", Description: null }],
    });

    const result = await getResourceRoleTypes();

    expect(result).toEqual([{ id: "r-2", name: "QA Engineer", description: null }]);
  });

  it("returns an empty array when the response has no items", async () => {
    vi.mocked(apiFetch).mockResolvedValue({});
    expect(await getResourceRoleTypes()).toEqual([]);
  });
});
