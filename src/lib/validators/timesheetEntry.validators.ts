import { z } from "zod";
import {
  MAX_ENTRY_HOURS,
  MIN_ENTRY_HOURS,
} from "@/lib/constants/timesheetEntry.constants";
import { guidSchema } from "@/lib/validators/shared.validators";

/**
 * Shared Zod schemas for the Timesheet Entry feature. Used both client-side
 * (validating each grid cell before it is submitted) and server-side (Route
 * Handlers re-validate the payload — never trust client-side validation
 * alone), per the same convention as `lib/validators/timesheetPeriod.validators.ts`.
 */

/** Matches the backend's documented `YYYY-MM-DD` date-only format for `EntryDate`. */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const hoursField = z
  .number("Hours must be a number.")
  .min(MIN_ENTRY_HOURS, `Hours must be at least ${MIN_ENTRY_HOURS}.`)
  .max(MAX_ENTRY_HOURS, `Hours cannot exceed ${MAX_ENTRY_HOURS} in a single day.`);

const taskDescriptionField = z
  .string()
  .trim()
  .min(1, "Task description is required.")
  .max(500, "Task description is too long.");

/** Matches `TimesheetEntry/CreateTimesheetEntry`. */
export const createTimesheetEntrySchema = z.object({
  projectId: z.uuid("Select a project."),
  timesheetPeriodId: z.uuid("Select a timesheet period."),
  entryDate: z
    .string()
    .min(1, "Entry date is required.")
    .regex(DATE_ONLY_PATTERN, "Use the YYYY-MM-DD date format."),
  hours: hoursField,
  taskDescription: taskDescriptionField,
});
export type CreateTimesheetEntryFormValues = z.infer<typeof createTimesheetEntrySchema>;

/** Matches `TimesheetEntry/UpdateTimesheetEntry`, which only accepts `Hours`/`TaskDescription`. */
export const updateTimesheetEntrySchema = z.object({
  hours: hoursField,
  taskDescription: taskDescriptionField,
});
export type UpdateTimesheetEntryFormValues = z.infer<typeof updateTimesheetEntrySchema>;

/**
 * Matches the optional query params documented on `TimesheetEntry/GetAllTimesheetEntries`
 * ("All query params are optional — enable to filter."). Used server-side (Route Handler)
 * to validate/normalize incoming `URLSearchParams` before forwarding them to the backend.
 *
 * Uses the lenient `guidSchema` (not `z.uuid()`) because `userId` here is
 * frequently the signed-in user's own JWT `sub` claim (see
 * `MyTimesheetView`/`TimesheetHistoryView`'s `currentUserId` prop) — and the
 * backend's seeded `SystemAdmin` account id
 * (`00000000-0000-0000-0000-000000000001`, per
 * `docs/HR_System_BE.postman_collection.json`) fails `z.uuid()`'s stricter
 * RFC 9562/4122 variant check, which was surfacing as a 400 ("Invalid filter
 * parameters.") on both of those screens for that account.
 */
export const timesheetEntryListQuerySchema = z.object({
  userId: guidSchema("Enter a valid user ID.").optional(),
  projectId: guidSchema("Enter a valid project ID.").optional(),
  timesheetPeriodId: guidSchema("Enter a valid timesheet period ID.").optional(),
  isApproved: z.enum(["true", "false"]).optional(),
  // Server-side pagination for `feature/timesheets-pagination` — see
  // `types/timesheetEntry.types.ts#TimesheetEntryListFilters`. Bounds mirror
  // `lib/validators/invoice.validators.ts`'s own `page`/`pageSize` fields.
  page: z.coerce.number("page must be a number.").int().min(1).optional(),
  pageSize: z.coerce.number("pageSize must be a number.").int().min(1).max(200).optional(),
});
export type TimesheetEntryListQuery = z.infer<typeof timesheetEntryListQuerySchema>;

/**
 * Query filter for `TimesheetEntry/GetProjectAdminTimesheetSummary`
 * (`app/api/timesheet-entries/project-admin-summary/route.ts`). `projectId`
 * is optional — see `ProjectAdminTimesheetSummaryFilters`
 * (`types/timesheetEntry.types.ts`) for why — but is validated with the same
 * lenient `guidSchema` as `timesheetEntryListQuerySchema.projectId` when present.
 */
export const projectAdminTimesheetSummaryQuerySchema = z.object({
  projectId: guidSchema("Enter a valid project ID.").optional(),
  // Mirrors `timesheetEntryListQuerySchema`'s own `page`/`pageSize` fields —
  // see that schema's doc comment.
  page: z.coerce.number("page must be a number.").int().min(1).optional(),
  pageSize: z.coerce.number("pageSize must be a number.").int().min(1).max(200).optional(),
});
export type ProjectAdminTimesheetSummaryQuery = z.infer<
  typeof projectAdminTimesheetSummaryQuerySchema
>;

/**
 * Client-side-only validation for the "Timesheet History" (`/timesheets/history`)
 * Date From/Date To filter bar (`docs/HR_System_FE_wireframe.pdf`). The backend's
 * `TimesheetEntry/GetAllTimesheetEntries` has no date-range query param, so this
 * range is applied to the already-fetched entries in the component — this schema
 * only guards against an inverted/malformed range before that filtering runs.
 * Empty strings are allowed (an unset bound simply means "no lower/upper limit").
 */
export const timesheetHistoryFilterSchema = z
  .object({
    dateFrom: z
      .string()
      .regex(DATE_ONLY_PATTERN, "Use the YYYY-MM-DD date format.")
      .optional()
      .or(z.literal("")),
    dateTo: z
      .string()
      .regex(DATE_ONLY_PATTERN, "Use the YYYY-MM-DD date format.")
      .optional()
      .or(z.literal("")),
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    message: "Date From must be on or before Date To.",
    path: ["dateTo"],
  });
export type TimesheetHistoryFilterValues = z.infer<typeof timesheetHistoryFilterSchema>;
