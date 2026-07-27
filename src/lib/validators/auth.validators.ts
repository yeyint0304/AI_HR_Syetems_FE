import { z } from "zod";
import { guidSchema } from "@/lib/validators/shared.validators";

/**
 * Shared Zod schemas for the Auth feature. Used both client-side (via
 * `zodResolver` in React Hook Form) and server-side (Route Handlers
 * re-validate the payload — never trust client-side validation alone).
 */

const passwordRules = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character.");

export const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1, "Username or email is required."),
  password: z.string().min(1, "Password is required."),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100, "First name is too long."),
  lastName: z.string().trim().min(1, "Last name is required.").max(100, "Last name is too long."),
  email: z.email("Enter a valid email address."),
  countryId: z
    .union([guidSchema("Enter a valid Country ID (GUID)."), z.literal("")])
    .optional()
    .nullable(),
});
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordRules,
    confirmNewPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const createUserSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters.").max(50, "Username is too long."),
  email: z.email("Enter a valid email address."),
  password: passwordRules,
  firstName: z.string().trim().min(1, "First name is required.").max(100, "First name is too long."),
  lastName: z.string().trim().min(1, "Last name is required.").max(100, "Last name is too long."),
  employeeId: z.string().trim().max(50, "Employee ID is too long.").optional().or(z.literal("")),
  countryId: z
    .union([guidSchema("Enter a valid Country ID (GUID)."), z.literal("")])
    .optional()
    .nullable(),
  roleId: guidSchema("Select a role."),
});
export type CreateUserFormValues = z.infer<typeof createUserSchema>;

/**
 * Backs `EditUserForm` (the `/admin/users` "Edit" modal). Mirrors
 * `createUserSchema` minus `password` (`Auth/UpdateUser` accepts no password
 * field) and adds `isActive`/`roleId` — `roleId` is optional/nullable since
 * leaving it blank means "keep the user's current role" (see
 * `types/auth.types.ts#UpdateUserRequest`'s doc comment for why).
 */
export const updateUserSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters.").max(50, "Username is too long."),
  email: z.email("Enter a valid email address."),
  firstName: z.string().trim().min(1, "First name is required.").max(100, "First name is too long."),
  lastName: z.string().trim().min(1, "Last name is required.").max(100, "Last name is too long."),
  employeeId: z.string().trim().max(50, "Employee ID is too long.").optional().or(z.literal("")),
  countryId: z
    .union([guidSchema("Enter a valid Country ID (GUID)."), z.literal("")])
    .optional()
    .nullable(),
  isActive: z.boolean(),
  roleId: z
    .union([guidSchema("Select a valid role."), z.literal("")])
    .optional()
    .nullable(),
});
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

/**
 * Server-side query schema for `GET /api/auth/unassigned-users`, backing the
 * scroll-paginated, searchable "User" combobox on the Project Assignments
 * screen. `Auth/GetUserList` itself documents no query parameters in
 * `docs/HR_System_BE.postman_collection.json`, so these are applied
 * optimistically/defensively rather than as a confirmed backend contract —
 * see the route handler for the full rationale.
 */
export const unassignedUserQuerySchema = z.object({
  search: z.string().trim().max(100, "Search term is too long.").optional(),
  page: z.coerce.number("page must be a number.").int().min(1).optional(),
  pageSize: z.coerce.number("pageSize must be a number.").int().min(1).max(50).optional(),
});
export type UnassignedUserQuery = z.infer<typeof unassignedUserQuerySchema>;

/**
 * Server-side query schema for `GET /api/auth/users`, backing the
 * `/admin/users` "User Management" list page. Same shape/rationale as
 * `unassignedUserQuerySchema` above — `Auth/GetUserList` documents no query
 * parameters at all in `docs/HR_System_BE.postman_collection.json`.
 */
export const userListQuerySchema = z.object({
  search: z.string().trim().max(100, "Search term is too long.").optional(),
  page: z.coerce.number("page must be a number.").int().min(1).optional(),
  pageSize: z.coerce.number("pageSize must be a number.").int().min(1).max(100).optional(),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
