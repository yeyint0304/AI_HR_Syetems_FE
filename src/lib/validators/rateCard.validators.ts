import { z } from "zod";
import { guidSchema } from "@/lib/validators/shared.validators";

/**
 * Shared Zod schemas for the Rate Card feature. Used both client-side (via
 * `zodResolver` in React Hook Form) and server-side (Route Handlers
 * re-validate the payload — never trust client-side validation alone), per
 * the same convention as `lib/validators/exchangeRate.validators.ts`.
 */

const rateCardSharedFields = {
  // Plain `z.number()` (not `z.coerce.number()`): the number input's raw
  // string value is converted client-side via React Hook Form's
  // `valueAsNumber` register option, matching `exchangeRate.validators.ts#rate`.
  hourlyRate: z
    .number("Hourly rate must be a number.")
    .positive("Hourly rate must be greater than 0.")
    .max(1_000_000, "Hourly rate is too large."),
  billingRate: z
    .number("Billing rate must be a number.")
    .min(0, "Billing rate cannot be negative.")
    .max(1_000_000, "Billing rate is too large."),
  effectiveDate: z.string().min(1, "Effective date is required."),
  isActive: z.boolean(),
};

/** Matches `RateCard/CreateRateCard`. */
export const createRateCardSchema = z.object({
  countryId: guidSchema("Select a country."),
  resourceRoleTypeId: guidSchema("Select a resource role."),
  currencyId: guidSchema("Select a currency."),
  ...rateCardSharedFields,
});
export type CreateRateCardFormValues = z.infer<typeof createRateCardSchema>;

/** Matches `RateCard/UpdateRateCard`, which does not accept country/role/currency ids (immutable after creation). */
export const updateRateCardSchema = z.object(rateCardSharedFields);
export type UpdateRateCardFormValues = z.infer<typeof updateRateCardSchema>;

/**
 * Server-side query schema for `GET /api/rate-cards`, mirroring
 * `RateCard/GetAllRateCards`'s optional filters (all query params optional
 * per `docs/HR_System_BE.postman_collection.json`).
 */
export const rateCardListQuerySchema = z.object({
  countryId: z.union([guidSchema("Enter a valid Country ID (GUID)."), z.literal("")]).optional(),
  resourceRoleTypeId: z
    .union([guidSchema("Enter a valid Resource Role Type ID (GUID)."), z.literal("")])
    .optional(),
  currencyId: z.union([guidSchema("Enter a valid Currency ID (GUID)."), z.literal("")]).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});
export type RateCardListQuery = z.infer<typeof rateCardListQuerySchema>;
