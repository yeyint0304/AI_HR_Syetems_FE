import { z } from "zod";
import { guidSchema } from "@/lib/validators/shared.validators";

/**
 * Shared Zod schemas for the Exchange Rate feature. Used both client-side
 * (via `zodResolver` in React Hook Form) and server-side (Route Handlers
 * re-validate the payload — never trust client-side validation alone), per
 * the same convention as `lib/validators/project.validators.ts`.
 */

const exchangeRateSharedFields = {
  // Plain `z.number()` (not `z.coerce.number()`): the number input's raw
  // string value is converted client-side via React Hook Form's
  // `valueAsNumber` register option, matching `project.validators.ts#maxDailyHours`.
  rate: z
    .number("Rate must be a number.")
    .positive("Rate must be greater than 0.")
    .max(1_000_000, "Rate is too large."),
  effectiveDate: z.string().min(1, "Effective date is required."),
  isActive: z.boolean(),
};

/** Matches `ExchangeRate/CreateExchangeRate`. */
export const createExchangeRateSchema = z
  .object({
    fromCurrencyId: guidSchema("Select a source currency."),
    toCurrencyId: guidSchema("Select a target currency."),
    ...exchangeRateSharedFields,
  })
  .refine((data) => data.fromCurrencyId !== data.toCurrencyId, {
    message: "From and To currencies must be different.",
    path: ["toCurrencyId"],
  });
export type CreateExchangeRateFormValues = z.infer<typeof createExchangeRateSchema>;

/** Matches `ExchangeRate/UpdateExchangeRate`, which does not accept currency ids (the pair is immutable after creation). */
export const updateExchangeRateSchema = z.object(exchangeRateSharedFields);
export type UpdateExchangeRateFormValues = z.infer<typeof updateExchangeRateSchema>;
