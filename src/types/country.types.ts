/**
 * Shared Country domain types (Data Transfer Objects), following the same
 * minimal-surface convention as `types/currency.types.ts#Currency`.
 *
 * Field set is derived from `docs/HR_System_BE.postman_collection.json`'s
 * "Reference Data" folder (`Country/GetAllCountries`, `Country/GetCountryById`,
 * `Country/CreateCountry`, `Country/UpdateCountry`, `Country/DeleteCountry`)
 * and the `/admin/countries` wireframe screen
 * (`docs/HR_System_FE_wireframe.pdf`), which lists countries with COUNTRY /
 * CODE / RATE CARDS / STATUS columns and a "+ Add Country" action.
 *
 * The backend's Country resource has no `IsActive` field of its own (unlike
 * `Currency`) — `Country/DeleteCountry` soft-deletes and the row simply stops
 * appearing in `Country/GetAllCountries`, so every country returned by the
 * list endpoint is implicitly active; `CountriesListView` renders a static
 * "Active" badge for every row rather than reading a field that doesn't
 * exist on the wire (matching the wireframe mock, which only ever shows
 * "Active" countries).
 *
 * This type also continues to back the read-only "Country" dropdown on the
 * Create User / Update Profile / Rate Card forms
 * (`hooks/useCountries.ts#useCountryList`).
 */
export interface Country {
  id: string;
  code: string;
  name: string;
}

/** Matches `Country/CreateCountry` — `code` must be a unique ISO 3166-1 alpha-2 code. */
export interface CreateCountryRequest {
  code: string;
  name: string;
}

/** Matches `Country/UpdateCountry`, which only accepts `Name` — the code is immutable after creation. */
export interface UpdateCountryRequest {
  name: string;
}
