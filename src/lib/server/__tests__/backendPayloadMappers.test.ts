/**
 * @jest-environment node
 */
import {
  toBackendAssignResourcePayload,
  toBackendChangePasswordPayload,
  toBackendCreateExchangeRatePayload,
  toBackendCreateProjectPayload,
  toBackendCreateTimesheetEntryPayload,
  toBackendCreateTimesheetPeriodPayload,
  toBackendCreateUserPayload,
  toBackendLoginPayload,
  toBackendLogoutPayload,
  toBackendRefreshTokenPayload,
  toBackendUpdateExchangeRatePayload,
  toBackendUpdateProfilePayload,
  toBackendUpdateProjectPayload,
  toBackendUpdateTimesheetEntryPayload,
  toBackendUpdateUserPayload,
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

  it("maps an update-user payload, defaulting missing employeeId/countryId/roleId to null", () => {
    expect(
      toBackendUpdateUserPayload({
        username: "testeredited",
        email: "test@d3-sg.com",
        firstName: "Lin Thit",
        lastName: "Htoo",
        isActive: true,
      })
    ).toEqual({
      Username: "testeredited",
      Email: "test@d3-sg.com",
      FirstName: "Lin Thit",
      LastName: "Htoo",
      EmployeeId: null,
      CountryId: null,
      IsActive: true,
      RoleId: null,
    });
  });

  it("maps an update-user payload, preserving a provided employeeId/countryId/roleId and isActive: false", () => {
    expect(
      toBackendUpdateUserPayload({
        username: "testeredited",
        email: "test@d3-sg.com",
        firstName: "Lin Thit",
        lastName: "Htoo",
        employeeId: "EMP002",
        countryId: "country-guid",
        isActive: false,
        roleId: "role-guid",
      })
    ).toEqual(
      expect.objectContaining({
        EmployeeId: "EMP002",
        CountryId: "country-guid",
        IsActive: false,
        RoleId: "role-guid",
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

  it("maps a create-timesheet-period payload to PascalCase", () => {
    expect(
      toBackendCreateTimesheetPeriodPayload({
        periodStart: "2026-03-01",
        periodEnd: "2026-05-15",
      })
    ).toEqual({
      PeriodStart: "2026-03-01",
      PeriodEnd: "2026-05-15",
    });
  });

  it("maps a create-timesheet-entry payload to PascalCase", () => {
    expect(
      toBackendCreateTimesheetEntryPayload({
        projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
        timesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
        entryDate: "2026-03-07",
        hours: 8,
        taskDescription: "Worked on feature implementation",
      })
    ).toEqual({
      ProjectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
      TimesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
      EntryDate: "2026-03-07",
      Hours: 8,
      TaskDescription: "Worked on feature implementation",
    });
  });

  it("maps an update-timesheet-entry payload to PascalCase", () => {
    expect(
      toBackendUpdateTimesheetEntryPayload({
        hours: 6,
        taskDescription: "Updated task description",
      })
    ).toEqual({
      Hours: 6,
      TaskDescription: "Updated task description",
    });
  });

  it("maps a create-exchange-rate payload to PascalCase", () => {
    expect(
      toBackendCreateExchangeRatePayload({
        fromCurrencyId: "33333333-3333-3333-3333-333333333301",
        toCurrencyId: "33333333-3333-3333-3333-333333333302",
        rate: 1.25,
        effectiveDate: "2026-06-22",
        isActive: true,
      })
    ).toEqual({
      FromCurrencyId: "33333333-3333-3333-3333-333333333301",
      ToCurrencyId: "33333333-3333-3333-3333-333333333302",
      Rate: 1.25,
      EffectiveDate: "2026-06-22",
      IsActive: true,
    });
  });

  it("maps an update-exchange-rate payload to PascalCase, without currency ids", () => {
    expect(
      toBackendUpdateExchangeRatePayload({
        rate: 1.3,
        effectiveDate: "2026-06-22",
        isActive: false,
      })
    ).toEqual({
      Rate: 1.3,
      EffectiveDate: "2026-06-22",
      IsActive: false,
    });
  });
});
