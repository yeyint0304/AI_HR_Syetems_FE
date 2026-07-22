/**
 * Minimal Country reference-data type, following the same minimal-surface
 * convention as `types/currency.types.ts#Currency`: this only backs the
 * read-only "Country" dropdown on the Create User (`Auth/CreateUser`) and
 * Update Profile (`Auth/UpdateProfile`) forms, both of which accept an
 * optional `CountryId`. Sourced from `Country/GetAllCountries`, per
 * `docs/HR_System_BE.postman_collection.json`'s "Reference Data" folder.
 * Full Country CRUD (Administration > Countries) remains a separate,
 * not-yet-implemented module (`lib/constants/navigation.constants.ts`).
 */
export interface Country {
  id: string;
  code: string;
  name: string;
}
