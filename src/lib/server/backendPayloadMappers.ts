import "server-only";
import type {
  ChangePasswordRequest,
  CreateUserRequest,
  LoginRequest,
  UpdateProfileRequest,
} from "@/types/auth.types";
import type {
  AssignResourceRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@/types/project.types";

/**
 * The HR System backend is configured with `PropertyNamingPolicy = null`
 * (see docs/HR_System_BE.postman_collection.json), meaning request bodies
 * must use exact PascalCase keys. These mappers translate our idiomatic
 * camelCase TypeScript DTOs into the wire format the backend expects.
 */

export function toBackendLoginPayload(payload: LoginRequest) {
  return {
    UsernameOrEmail: payload.usernameOrEmail,
    Password: payload.password,
  };
}

export function toBackendRefreshTokenPayload(refreshToken: string) {
  return {
    RefreshToken: refreshToken,
  };
}

export function toBackendLogoutPayload(refreshToken: string) {
  return {
    RefreshToken: refreshToken,
  };
}

export function toBackendUpdateProfilePayload(payload: UpdateProfileRequest) {
  return {
    FirstName: payload.firstName,
    LastName: payload.lastName,
    Email: payload.email,
    CountryId: payload.countryId || null,
  };
}

export function toBackendChangePasswordPayload(payload: ChangePasswordRequest) {
  return {
    CurrentPassword: payload.currentPassword,
    NewPassword: payload.newPassword,
    ConfirmNewPassword: payload.confirmNewPassword,
  };
}

export function toBackendCreateUserPayload(payload: CreateUserRequest) {
  return {
    Username: payload.username,
    Email: payload.email,
    Password: payload.password,
    FirstName: payload.firstName,
    LastName: payload.lastName,
    EmployeeId: payload.employeeId || null,
    CountryId: payload.countryId || null,
    RoleId: payload.roleId,
  };
}

/** Matches `Project/CreateProject` (no `IsActive` — new projects always start active). */
export function toBackendCreateProjectPayload(payload: CreateProjectRequest) {
  return {
    Code: payload.code,
    Name: payload.name,
    Description: payload.description || null,
    ClientName: payload.clientName,
    ClientEmail: payload.clientEmail,
    StartDate: payload.startDate,
    EndDate: payload.endDate,
    MaxDailyHours: payload.maxDailyHours,
  };
}

/** Matches `Project/UpdateProject`, which additionally accepts `IsActive`. */
export function toBackendUpdateProjectPayload(payload: UpdateProjectRequest) {
  return {
    ...toBackendCreateProjectPayload(payload),
    IsActive: payload.isActive,
  };
}

/** Matches `Project/AssignResource`. */
export function toBackendAssignResourcePayload(payload: AssignResourceRequest) {
  return {
    UserId: payload.userId,
    ResourceRoleTypeId: payload.resourceRoleTypeId,
  };
}
