/**
 * Minimal Currency reference-data type, following the same minimal-surface
 * convention as `types/project.types.ts#ResourceRoleType`: this only backs
 * the read-only "Invoice Currency" dropdown on the Generate Invoice form
 * (`Currency/GetAllCurrencies`, per `docs/HR_System_BE.postman_collection.json`
 * — "Reference Data - Currency" folder). Full Currency CRUD (Administration >
 * Currencies) remains a separate, not-yet-implemented module
 * (`lib/constants/navigation.constants.ts`).
 */
export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBaseCurrency: boolean;
  isActive: boolean;
}
