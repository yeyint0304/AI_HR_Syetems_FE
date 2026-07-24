import { apiClient } from "@/lib/api/axiosInstance";
import {
  createResourceRoleTypeRequest,
  deleteResourceRoleTypeRequest,
  getResourceRoleTypesRequest,
  updateResourceRoleTypeRequest,
} from "@/lib/api/resourceRoleType.api";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const RESOURCE_ROLE_TYPE = {
  id: "33f724ff-c089-4691-8fe1-5d3ecc41ba1b",
  name: "Software Engineer",
  description: "Full-stack software engineer role",
};

describe("resourceRoleType.api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getResourceRoleTypesRequest fetches and unwraps the resource role type list", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [RESOURCE_ROLE_TYPE] } });

    const result = await getResourceRoleTypesRequest();

    expect(apiClient.get).toHaveBeenCalledWith("/resource-role-types");
    expect(result).toEqual([RESOURCE_ROLE_TYPE]);
  });

  it("createResourceRoleTypeRequest posts the payload and returns the created resource role type", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: RESOURCE_ROLE_TYPE } });

    const payload = { name: "Software Engineer", description: "Full-stack software engineer role" };
    const result = await createResourceRoleTypeRequest(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/resource-role-types", payload);
    expect(result).toEqual(RESOURCE_ROLE_TYPE);
  });

  it("updateResourceRoleTypeRequest puts the payload to the resource role type's id", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: RESOURCE_ROLE_TYPE } });

    const payload = { name: "Senior Software Engineer", description: "Senior full-stack role" };
    const result = await updateResourceRoleTypeRequest(
      "33f724ff-c089-4691-8fe1-5d3ecc41ba1b",
      payload
    );

    expect(apiClient.put).toHaveBeenCalledWith(
      "/resource-role-types/33f724ff-c089-4691-8fe1-5d3ecc41ba1b",
      payload
    );
    expect(result).toEqual(RESOURCE_ROLE_TYPE);
  });

  it("deleteResourceRoleTypeRequest deletes the resource role type by id", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

    await deleteResourceRoleTypeRequest("33f724ff-c089-4691-8fe1-5d3ecc41ba1b");

    expect(apiClient.delete).toHaveBeenCalledWith(
      "/resource-role-types/33f724ff-c089-4691-8fe1-5d3ecc41ba1b"
    );
  });
});
