/**
 * @jest-environment node
 */
import {
  toBackendAssignResourcePayload,
  toBackendChangePasswordPayload,
  toBackendCreateProjectPayload,
  toBackendCreateUserPayload,
  toBackendLoginPayload,
  toBackendLogoutPayload,
  toBackendRefreshTokenPayload,
  toBackendUpdateProfilePayload,
  toBackendUpdateProjectPayload,
} from "@/lib/server/backendPayloadMappers";

describe("backendPayloadMappers", () => {
  it("maps login credentials to PascalCase", () => {
    expect(toBackendLoginPayload({ usernameOrEmail: "jane", password: "Password1!" })).toEqual({
      UsernameOrEmail: "jane",
      Password: "Password1!",
    });
  });

  it("maps a refresh token to PascalCase", () => {
    expect(toBackendRefreshTokenPayload("refresh-abc")).toEqual({ RefreshToken: "refresh-abc" });
  });

  it("maps a logout refresh token to PascalCase", () => {
    expect(toBackendLogoutPayload("refresh-abc")).toEqual({ RefreshToken: "refresh-abc" });
  });

  it("maps a profile update, defaulting a missing countryId to null", () => {
    expect(
      toBackendUpdateProfilePayload({
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      })
    ).toEqual({
      FirstName: "Jane",
      LastName: "Doe",
      Email: "jane@example.com",
      CountryId: null,
    });
  });

  it("maps a profile update, preserving a provided countryId", () => {
    expect(
      toBackendUpdateProfilePayload({
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        countryId: "country-guid",
      })
    ).toEqual(
      expect.objectContaining({
        CountryId: "country-guid",
      })
    );
  });

  it("maps a change-password payload to PascalCase", () => {
    expect(
      toBackendChangePasswordPayload({
        currentPassword: "Old1!aaaa",
        newPassword: "New1!aaaa",
        confirmNewPassword: "New1!aaaa",
      })
    ).toEqual({
      CurrentPassword: "Old1!aaaa",
      NewPassword: "New1!aaaa",
      ConfirmNewPassword: "New1!aaaa",
    });
  });

  it("maps a create-user payload, defaulting missing employeeId/countryId to null", () => {
    expect(
      toBackendCreateUserPayload({
        username: "newuser",
        email: "newuser@example.com",
        password: "Password1!",
        firstName: "New",
        lastName: "User",
        roleId: "role-guid",
      })
    ).toEqual({
      Username: "newuser",
      Email: "newuser@example.com",
      Password: "Password1!",
      FirstName: "New",
      LastName: "User",
      EmployeeId: null,
      CountryId: null,
      RoleId: "role-guid",
    });
  });

  it("maps a create-user payload, preserving a provided employeeId/countryId", () => {
    expect(
      toBackendCreateUserPayload({
        username: "newuser",
        email: "newuser@example.com",
        password: "Password1!",
        firstName: "New",
        lastName: "User",
        employeeId: "EMP-1",
        countryId: "country-guid",
        roleId: "role-guid",
      })
    ).toEqual(
      expect.objectContaining({
        EmployeeId: "EMP-1",
        CountryId: "country-guid",
      })
    );
  });

  it("maps a create-project payload to PascalCase, defaulting a missing description to null", () => {
    expect(
      toBackendCreateProjectPayload({
        code: "PRJ-ALPHA",
        name: "Project Alpha",
        clientName: "Acme Corp",
        clientEmail: "client@acme.com",
        startDate: "2025-01-15",
        endDate: "2025-12-31",
        maxDailyHours: 8,
      })
    ).toEqual({
      Code: "PRJ-ALPHA",
      Name: "Project Alpha",
      Description: null,
      ClientName: "Acme Corp",
      ClientEmail: "client@acme.com",
      StartDate: "2025-01-15",
      EndDate: "2025-12-31",
      MaxDailyHours: 8,
    });
  });

  it("maps an update-project payload, additionally including IsActive", () => {
    expect(
      toBackendUpdateProjectPayload({
        code: "PRJ-ALPHA",
        name: "Project Alpha",
        description: "Updated description",
        clientName: "Acme Corp",
        clientEmail: "client@acme.com",
        startDate: "2025-01-15",
        endDate: "2025-12-31",
        maxDailyHours: 8,
        isActive: false,
      })
    ).toEqual(
      expect.objectContaining({
        Description: "Updated description",
        IsActive: false,
      })
    );
  });

  it("maps an assign-resource payload to PascalCase", () => {
    expect(
      toBackendAssignResourcePayload({
        userId: "user-guid",
        resourceRoleTypeId: "role-type-guid",
      })
    ).toEqual({
      UserId: "user-guid",
      ResourceRoleTypeId: "role-type-guid",
    });
  });
});
