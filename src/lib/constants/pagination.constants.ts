/**
 * Shared client-side pagination default for admin/list tables that fetch
 * their full reference-data set in one request (e.g. `useCurrencyList`,
 * `useCountryList`, `useResourceRoleTypes`, `useExchangeRateList`,
 * `useProjectList`, `useRateCardList`, `useTimesheetPeriodList`) and paginate
 * the rendered `<table>` client-side via `hooks/useTablePagination.ts` +
 * `components/ui/TablePagination.tsx`, rather than round-tripping to the
 * backend per page.
 *
 * `20` mirrors the backend's own default `pageSize` for the equivalent
 * `GetAll*` endpoints documented in
 * `docs/HR_System_BE.postman_collection.json` (e.g.
 * `Country/GetAllCountries?page=1&pageSize=20`,
 * `Currency/GetAllCurrencies?page=1&pageSize=20`,
 * `ResourceRoleType/GetAllResourceRoleTypes?page=1&pageSize=20`,
 * `RateCard/GetAllRateCards?...&page=1&pageSize=20`,
 * `ExchangeRate/GetAllExchangeRates?...&page=1&pageSize=20`).
 *
 * Views that already paginate server-side (`InvoicesListView`,
 * `TimesheetReportView`) keep their own domain-specific page-size constant
 * (`DEFAULT_INVOICE_PAGE_SIZE`, `DEFAULT_TIMESHEET_REPORT_PAGE_SIZE`) and
 * don't use this one.
 */
export const DEFAULT_TABLE_PAGE_SIZE = 20;
