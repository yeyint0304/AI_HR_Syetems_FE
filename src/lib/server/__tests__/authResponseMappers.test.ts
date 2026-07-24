import {
  mapBackendUnassignedUser,
  mapBackendUnassignedUserList,
  mapBackendUnassignedUserPage,
  mapBackendUserListItem,
  mapBackendUserListPage,
} from "@/lib/server/authResponseMappers";

const RAW_USER = {
  UserId: "u1",
  Username: "jsmith",
  Email: "jsmith@hrsystem.com",
  FirstName: "Jamie",
  LastName: "Smith",
  EmployeeId: "EMP-001",
};

describe("mapBackendUnassignedUser", () => {
  it("maps a raw backend user, tolerating PascalCase field names", () => {
    expect(mapBackendUnassignedUser(RAW_USER)).toEqual({
      id: "u1",
      username: "jsmith",
      email: "jsmith@hrsystem.com",
      firstName: "Jamie",
      lastName: "Smith",
      employeeId: "EMP-001",
    });
  });

  it("returns null when required fields are missing", () => {
    expect(mapBackendUnassignedUser({ Username: "jsmith" })).toBeNull();
    expect(mapBackendUnassignedUser(null)).toBeNull();
  });
});

describe("mapBackendUnassignedUserList", () => {
  it("unwraps a bare-array envelope", () => {
    expect(
      mapBackendUnassignedUserList({ StatusCode: 200, IsSuccess: true, Data: [RAW_USER] })
    ).toEqual([
      {
        id: "u1",
        username: "jsmith",
        email: "jsmith@hrsystem.com",
        firstName: "Jamie",
        lastName: "Smith",
        employeeId: "EMP-001",
      },
    ]);
  });

  it("unwraps a paginated { Items } envelope", () => {
    expect(
      mapBackendUnassignedUserList({
        StatusCode: 200,
        IsSuccess: true,
        Data: { TotalCount: 1, PageNo: 1, PageSize: 10, Items: [RAW_USER] },
      })
    ).toHaveLength(1);
  });
});

describe("mapBackendUnassignedUserPage", () => {
  it("treats a bare-array Data as a single, complete page", () => {
    const result = mapBackendUnassignedUserPage(
      { StatusCode: 200, IsSuccess: true, Data: [RAW_USER] },
      1,
      20
    );

    expect(result).toEqual({
      items: [
        {
          id: "u1",
          username: "jsmith",
          email: "jsmith@hrsystem.com",
          firstName: "Jamie",
          lastName: "Smith",
          employeeId: "EMP-001",
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      hasMore: false,
    });
  });

  it("derives hasMore from a paginated { TotalCount, PageNo, PageSize, Items } shape", () => {
    const result = mapBackendUnassignedUserPage(
      {
        StatusCode: 200,
        IsSuccess: true,
        Data: { TotalCount: 45, PageNo: 2, PageSize: 20, Items: [RAW_USER] },
      },
      2,
      20
    );

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
    expect(result.totalCount).toBe(45);
    expect(result.hasMore).toBe(true);
  });

  it("hasMore is false once the last page has been reached", () => {
    const result = mapBackendUnassignedUserPage(
      {
        StatusCode: 200,
        IsSuccess: true,
        Data: { TotalCount: 21, PageNo: 2, PageSize: 20, Items: [RAW_USER] },
      },
      2,
      20
    );

    expect(result.hasMore).toBe(false);
  });

  it("hasMore is false when the page came back empty, even if the reported total suggests more", () => {
    const result = mapBackendUnassignedUserPage(
      {
        StatusCode: 200,
        IsSuccess: true,
        Data: { TotalCount: 45, PageNo: 3, PageSize: 20, Items: [] },
      },
      3,
      20
    );

    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it("falls back to the requested page/pageSize when the backend omits them", () => {
    const result = mapBackendUnassignedUserPage(
      { StatusCode: 200, IsSuccess: true, Data: { Items: [RAW_USER] } },
      4,
      15
    );

    expect(result.page).toBe(4);
    expect(result.pageSize).toBe(15);
  });
});

const RAW_USER_LIST_ITEM = {
  UserId: "u1",
  Username: "jsmith",
  Email: "jsmith@hrsystem.com",
  FirstName: "Jamie",
  LastName: "Smith",
  EmployeeId: "EMP-001",
  RoleName: "ProjectAdmin",
  CountryId: "22222222-2222-2222-2222-222222222201",
  CountryCode: "SG",
  CountryName: "Singapore",
};

describe("mapBackendUserListItem", () => {
  it("maps a raw backend user, tolerating PascalCase field names, including role/country", () => {
    expect(mapBackendUserListItem(RAW_USER_LIST_ITEM)).toEqual({
      id: "u1",
      username: "jsmith",
      email: "jsmith@hrsystem.com",
      firstName: "Jamie",
      lastName: "Smith",
      employeeId: "EMP-001",
      roleName: "ProjectAdmin",
      countryId: "22222222-2222-2222-2222-222222222201",
      countryCode: "SG",
      countryName: "Singapore",
      isActive: true,
    });
  });

  it("defaults isActive to true when the field is absent (per the saved GetUserList example)", () => {
    const result = mapBackendUserListItem(RAW_USER_LIST_ITEM);
    expect(result?.isActive).toBe(true);
  });

  it("respects an explicit IsActive: false", () => {
    const result = mapBackendUserListItem({ ...RAW_USER_LIST_ITEM, IsActive: false });
    expect(result?.isActive).toBe(false);
  });

  it("returns null when required fields are missing", () => {
    expect(mapBackendUserListItem({ Username: "jsmith" })).toBeNull();
    expect(mapBackendUserListItem(null)).toBeNull();
  });
});

describe("mapBackendUserListPage", () => {
  it("unwraps the real backend's paginated { TotalCount, PageNo, PageSize, Items } shape", () => {
    const result = mapBackendUserListPage(
      {
        StatusCode: 200,
        IsSuccess: true,
        Data: { TotalCount: 5, PageNo: 1, PageSize: 10, Items: [RAW_USER_LIST_ITEM] },
      },
      1,
      10
    );

    expect(result.items).toEqual([
      expect.objectContaining({ id: "u1", roleName: "ProjectAdmin", countryCode: "SG" }),
    ]);
    expect(result.totalCount).toBe(5);
    expect(result.hasMore).toBe(false);
  });

  it("treats a bare-array Data as a single, complete page", () => {
    const result = mapBackendUserListPage(
      { StatusCode: 200, IsSuccess: true, Data: [RAW_USER_LIST_ITEM] },
      1,
      20
    );

    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(false);
  });
});
