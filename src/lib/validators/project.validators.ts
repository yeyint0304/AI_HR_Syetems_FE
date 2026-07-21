import { z } from "zod";
import { guidSchema } from "@/lib/validators/shared.validators";

/**
 * Shared Zod schemas for the Project feature. Used both client-side (via
 * `zodResolver` in React Hook Form) and server-side (Route Handlers
 * re-validate the payload — never trust client-side validation alone), per
 * the same convention as `lib/validators/auth.validators.ts`.
 */

const PROJECT_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/;

const projectFields = {
  name: z.string().trim().min(1, "Project name is required.").max(150, "Project name is too long."),
  code: z
    .string()
    .trim()
    .min(2, "Project code must be at least 2 characters.")
    .max(20, "Project code is too long.")
    .regex(PROJECT_CODE_PATTERN, "Use uppercase letters, numbers, and hyphens only (e.g. PRJ-001)."),
  clientName: z.string().trim().min(1, "Client name is required.").max(150, "Client name is too long."),
  clientEmail: z.email("Enter a valid client email address."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  // Plain `z.number()` (not `z.coerce.number()`): the number input's raw
  // string value is converted client-side via React Hook Form's
  // `valueAsNumber` register option, keeping the form's input/output types
  // identical (avoids a `z.coerce` input/output type mismatch with
  // `zodResolver`).
  maxDailyHours: z
    .number("Max daily hours must be a number.")
    .min(1, "Max daily hours must be at least 1.")
    .max(24, "Max daily hours cannot exceed 24."),
  description: z.string().trim().max(1000, "Description is too long.").optional().or(z.literal("")),
};

/** Matches `Project/CreateProject`, which does not accept `IsActive` (new projects always start active). */
export const createProjectSchema = z.object(projectFields).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be on or after the start date.",
  path: ["endDate"],
});
export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

/** Matches `Project/UpdateProject`, which additionally accepts `IsActive`. */
export const updateProjectSchema = z
  .object({ ...projectFields, isActive: z.boolean() })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });
export type UpdateProjectFormValues = z.infer<typeof updateProjectSchema>;

/**
 * Matches `Project/AssignResource`.
 *
 * Uses the lenient `guidSchema` (not `z.uuid()`) for the same reason
 * documented on `lib/validators/shared.validators.ts`: the backend's seeded
 * `ResourceRoleType` ids (`docs/HR_System_BE.postman_collection.json`, e.g.
 * `44444444-4444-4444-4444-444444444401`) don't satisfy `z.uuid()`'s RFC
 * 9562/4122 variant-nibble check, which was turning a valid "Resource role"
 * selection on the Project Assignments screen into a 400 ("Please correct
 * the highlighted fields.") both client-side (react-hook-form validation)
 * and server-side (`POST /api/projects/[id]/assignments` re-validates with
 * this same schema) — the exact class of bug already fixed for
 * `createUserSchema.roleId` and `timesheetEntryListQuerySchema`.
 */
export const assignResourceSchema = z.object({
  userId: guidSchema("Select a user."),
  resourceRoleTypeId: guidSchema("Select a resource role."),
});
export type AssignResourceFormValues = z.infer<typeof assignResourceSchema>;
