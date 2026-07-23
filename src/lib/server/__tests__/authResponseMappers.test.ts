import {
  mapBackendUnassignedUser,
  mapBackendUnassignedUserList,
  mapBackendUnassignedUserPage,
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
