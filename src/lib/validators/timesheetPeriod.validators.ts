import { z } from "zod";

/**
 * Shared Zod schemas for the Timesheet Period feature. Used both client-side
 * (via `zodResolver` in React Hook Form) and server-side (Route Handlers
 * re-validate the payload — never trust client-side validation alone), per
 * the same convention as `lib/validators/project.validators.ts`.
 */

/** Matches the backend's documented `YYYY-MM-DD` date-only format for Timesheet Period requests. */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const timesheetPeriodFields = {
  periodStart: z
    .string()
    .min(1, "Period start date is required.")
    .regex(DATE_ONLY_PATTERN, "Use the YYYY-MM-DD date format."),
  periodEnd: z
    .string()
    .min(1, "Period end date is required.")
    .regex(DATE_ONLY_PATTERN, "Use the YYYY-MM-DD date format."),
};

/** Matches `TimesheetPeriod/CreateTimesheetPeriod`. */
export const createTimesheetPeriodSchema = z
  .object(timesheetPeriodFields)
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: "Period end date must be on or after the period start date.",
    path: ["periodEnd"],
  });
export type CreateTimesheetPeriodFormValues = z.infer<typeof createTimesheetPeriodSchema>;

/**
 * Matches the optional query params documented on `TimesheetPeriod/GetAllTimesheetPeriods`
 * ("All query params are optional — enable to filter."). Used server-side (Route Handler)
 * to validate/normalize incoming `URLSearchParams` before forwarding them to the backend.
 */
export const timesheetPeriodListQuerySchema = z.object({
  isLocked: z.enum(["true", "false"]).optional(),
  year: z.coerce.number("Year must be a number.").int().min(1900).max(2100).optional(),
  month: z.coerce.number("Month must be a number.").int().min(1).max(12).optional(),
});
export type TimesheetPeriodListQuery = z.infer<typeof timesheetPeriodListQuerySchema>;
