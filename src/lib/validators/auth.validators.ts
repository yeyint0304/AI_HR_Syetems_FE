import { z } from "zod";

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
    .union([z.uuid("Enter a valid Country ID (GUID)."), z.literal("")])
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
    .union([z.uuid("Enter a valid Country ID (GUID)."), z.literal("")])
    .optional()
    .nullable(),
  roleId: z.uuid("Select a valid Role ID (GUID)."),
});
export type CreateUserFormValues = z.infer<typeof createUserSchema>;
