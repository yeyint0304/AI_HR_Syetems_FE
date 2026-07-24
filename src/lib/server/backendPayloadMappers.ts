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
import type { CreateTimesheetPeriodRequest } from "@/types/timesheetPeriod.types";
import type {
  CreateTimesheetEntryRequest,
  UpdateTimesheetEntryRequest,
} from "@/types/timesheetEntry.types";
import type { GenerateInvoiceRequest, UpdateInvoiceRequest } from "@/types/invoice.types";
import type {
  CreateExchangeRateRequest,
  UpdateExchangeRateRequest,
} from "@/types/exchangeRate.types";
import type { CreateRateCardRequest, UpdateRateCardRequest } from "@/types/rateCard.types";
import type { CreateCurrencyRequest, UpdateCurrencyRequest } from "@/types/currency.types";
import type { CreateCountryRequest, UpdateCountryRequest } from "@/types/country.types";
import type {
  CreateResourceRoleTypeRequest,
  UpdateResourceRoleTypeRequest,
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

/** Matches `TimesheetPeriod/CreateTimesheetPeriod` (dates are sent as `YYYY-MM-DD` strings). */
export function toBackendCreateTimesheetPeriodPayload(payload: CreateTimesheetPeriodRequest) {
  return {
    PeriodStart: payload.periodStart,
    PeriodEnd: payload.periodEnd,
  };
}

/**
 * Matches `TimesheetEntry/CreateTimesheetEntry`. `UserId` is intentionally
 * never included here — the backend infers the owning user from the bearer
 * token, so a client can never create an entry "as" another user.
 */
export function toBackendCreateTimesheetEntryPayload(payload: CreateTimesheetEntryRequest) {
  return {
    ProjectId: payload.projectId,
    TimesheetPeriodId: payload.timesheetPeriodId,
    EntryDate: payload.entryDate,
    Hours: payload.hours,
    TaskDescription: payload.taskDescription,
  };
}

/** Matches `TimesheetEntry/UpdateTimesheetEntry`, which only accepts `Hours`/`TaskDescription`. */
export function toBackendUpdateTimesheetEntryPayload(payload: UpdateTimesheetEntryRequest) {
  return {
    Hours: payload.hours,
    TaskDescription: payload.taskDescription,
  };
}

/**
 * Matches `Invoice/GenerateInvoice`. `ClientEmail`/`IssuedDate`/`DueDate`/`Notes`
 * are documented as optional — `undefined` (rather than an empty string) is
 * forwarded when omitted so the backend applies its own defaults/auto-generation
 * (e.g. the invoice number) instead of receiving an empty-string override.
 */
export function toBackendGenerateInvoicePayload(payload: GenerateInvoiceRequest) {
  return {
    ProjectId: payload.projectId,
    BillingPeriodStart: payload.billingPeriodStart,
    BillingPeriodEnd: payload.billingPeriodEnd,
    CurrencyId: payload.currencyId,
    ClientName: payload.clientName,
    ClientEmail: payload.clientEmail || undefined,
    IssuedDate: payload.issuedDate || undefined,
    DueDate: payload.dueDate || undefined,
    Notes: payload.notes || undefined,
  };
}

/** Matches `Invoice/UpdateInvoice` — every field is optional; only `Draft` invoices may be updated. */
export function toBackendUpdateInvoicePayload(payload: UpdateInvoiceRequest) {
  return {
    CurrencyId: payload.currencyId || undefined,
    ClientName: payload.clientName || undefined,
    ClientEmail: payload.clientEmail || undefined,
    IssuedDate: payload.issuedDate || undefined,
    DueDate: payload.dueDate || undefined,
    Notes: payload.notes || undefined,
  };
}

/** Matches `ExchangeRate/CreateExchangeRate`. */
export function toBackendCreateExchangeRatePayload(payload: CreateExchangeRateRequest) {
  return {
    FromCurrencyId: payload.fromCurrencyId,
    ToCurrencyId: payload.toCurrencyId,
    Rate: payload.rate,
    EffectiveDate: payload.effectiveDate,
    IsActive: payload.isActive,
  };
}

/** Matches `ExchangeRate/UpdateExchangeRate`, which only accepts Rate/EffectiveDate/IsActive (the currency pair is immutable after creation). */
export function toBackendUpdateExchangeRatePayload(payload: UpdateExchangeRateRequest) {
  return {
    Rate: payload.rate,
    EffectiveDate: payload.effectiveDate,
    IsActive: payload.isActive,
  };
}

/** Matches `RateCard/CreateRateCard`. */
export function toBackendCreateRateCardPayload(payload: CreateRateCardRequest) {
  return {
    CountryId: payload.countryId,
    ResourceRoleTypeId: payload.resourceRoleTypeId,
    CurrencyId: payload.currencyId,
    HourlyRate: payload.hourlyRate,
    BillingRate: payload.billingRate,
    EffectiveDate: payload.effectiveDate,
    IsActive: payload.isActive,
  };
}

/** Matches `RateCard/UpdateRateCard`, which only accepts rates/effective date/active status (country/role/currency are immutable after creation). */
export function toBackendUpdateRateCardPayload(payload: UpdateRateCardRequest) {
  return {
    HourlyRate: payload.hourlyRate,
    BillingRate: payload.billingRate,
    EffectiveDate: payload.effectiveDate,
    IsActive: payload.isActive,
  };
}

/** Matches `Currency/CreateCurrency`. */
export function toBackendCreateCurrencyPayload(payload: CreateCurrencyRequest) {
  return {
    Code: payload.code,
    Name: payload.name,
    Symbol: payload.symbol,
    IsBaseCurrency: payload.isBaseCurrency,
    IsActive: payload.isActive,
  };
}

/** Matches `Currency/UpdateCurrency`, which only accepts Name/Symbol/IsActive (the code and base-currency flag are immutable after creation). */
export function toBackendUpdateCurrencyPayload(payload: UpdateCurrencyRequest) {
  return {
    Name: payload.name,
    Symbol: payload.symbol,
    IsActive: payload.isActive,
  };
}

/** Matches `Country/CreateCountry`. */
export function toBackendCreateCountryPayload(payload: CreateCountryRequest) {
  return {
    Code: payload.code,
    Name: payload.name,
  };
}

/** Matches `Country/UpdateCountry`, which only accepts Name (the code is immutable after creation). */
export function toBackendUpdateCountryPayload(payload: UpdateCountryRequest) {
  return {
    Name: payload.name,
  };
}

/** Matches `ResourceRoleType/CreateResourceRoleType`. */
export function toBackendCreateResourceRoleTypePayload(payload: CreateResourceRoleTypeRequest) {
  return {
    Name: payload.name,
    Description: payload.description || null,
  };
}

/** Matches `ResourceRoleType/UpdateResourceRoleType` (same shape as create — both fields may be changed). */
export function toBackendUpdateResourceRoleTypePayload(payload: UpdateResourceRoleTypeRequest) {
  return {
    Name: payload.name,
    Description: payload.description || null,
  };
}
