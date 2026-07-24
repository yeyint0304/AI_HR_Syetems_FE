import { z } from "zod";

/**
 * Shared Zod schemas for the Country feature (Administration > Countries).
 * Used both client-side (via `zodResolver` in React Hook Form) and
 * server-side (Route Handlers re-validate the payload — never trust
 * client-side validation alone), per the same convention as
 * `lib/validators/currency.validators.ts`.
 */

/** ISO 3166-1 alpha-2 country code (e.g. "SG", "MY"), per `Country/CreateCountry`'s saved example. */
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

/** Matches `Country/CreateCountry`. `code` is auto-uppercased client-side (see `CountryForm`'s `setValueAs`) before this pattern is checked. */
export const createCountrySchema = z.object({
  code: z
    .string()
    .min(1, "Code is required.")
    .regex(COUNTRY_CODE_PATTERN, "Code must be a 2-letter ISO 3166-1 code (e.g. SG)."),
  name: z.string().min(1, "Name is required.").max(100, "Name is too long."),
});
export type CreateCountryFormValues = z.infer<typeof createCountrySchema>;

/** Matches `Country/UpdateCountry`, which only accepts `Name` — the code is immutable after creation. */
export const updateCountrySchema = z.object({
  name: z.string().min(1, "Name is required.").max(100, "Name is too long."),
});
export type UpdateCountryFormValues = z.infer<typeof updateCountrySchema>;
