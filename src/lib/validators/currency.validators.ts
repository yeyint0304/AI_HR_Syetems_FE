import { z } from "zod";

/**
 * Shared Zod schemas for the Currency feature (Administration > Currencies).
 * Used both client-side (via `zodResolver` in React Hook Form) and
 * server-side (Route Handlers re-validate the payload — never trust
 * client-side validation alone), per the same convention as
 * `lib/validators/exchangeRate.validators.ts`.
 */

/** ISO 4217 3-letter currency code (e.g. "USD", "SGD"), per `Currency/CreateCurrency`'s saved example. */
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

const currencySharedFields = {
  name: z.string().min(1, "Name is required.").max(100, "Name is too long."),
  symbol: z.string().min(1, "Symbol is required.").max(10, "Symbol is too long."),
  isActive: z.boolean(),
};

/** Matches `Currency/CreateCurrency`. `code` is auto-uppercased client-side (see `CurrencyForm`'s `setValueAs`) before this pattern is checked. */
export const createCurrencySchema = z.object({
  code: z
    .string()
    .min(1, "Code is required.")
    .regex(CURRENCY_CODE_PATTERN, "Code must be a 3-letter ISO 4217 code (e.g. USD)."),
  isBaseCurrency: z.boolean(),
  ...currencySharedFields,
});
export type CreateCurrencyFormValues = z.infer<typeof createCurrencySchema>;

/** Matches `Currency/UpdateCurrency`, which does not accept `Code`/`IsBaseCurrency` (both immutable after creation). */
export const updateCurrencySchema = z.object(currencySharedFields);
export type UpdateCurrencyFormValues = z.infer<typeof updateCurrencySchema>;
