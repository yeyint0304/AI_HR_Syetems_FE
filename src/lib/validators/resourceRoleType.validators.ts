import { z } from "zod";

/**
 * Shared Zod schemas for the Resource Role Type feature (Administration >
 * Resource Role Types). Used both client-side (via `zodResolver` in React
 * Hook Form) and server-side (Route Handlers re-validate the payload — never
 * trust client-side validation alone), per the same convention as
 * `lib/validators/currency.validators.ts`.
 *
 * `Create`/`Update` share the exact same shape on this backend resource (see
 * `ResourceRoleType/CreateResourceRoleType` /
 * `ResourceRoleType/UpdateResourceRoleType` in
 * `docs/HR_System_BE.postman_collection.json`), unlike Currency/Country/
 * ExchangeRate/RateCard, where the identifying fields are immutable after
 * creation.
 */
const resourceRoleTypeFields = {
  name: z.string().min(1, "Name is required.").max(100, "Name is too long."),
  // Optional free-text description; an empty string is treated the same as
  // "not provided" (mirrors `ProjectForm`'s optional `description` field).
  description: z
    .string()
    .max(500, "Description is too long.")
    .optional()
    .or(z.literal("")),
};

export const createResourceRoleTypeSchema = z.object(resourceRoleTypeFields);
export type CreateResourceRoleTypeFormValues = z.infer<typeof createResourceRoleTypeSchema>;

export const updateResourceRoleTypeSchema = z.object(resourceRoleTypeFields);
export type UpdateResourceRoleTypeFormValues = z.infer<typeof updateResourceRoleTypeSchema>;
