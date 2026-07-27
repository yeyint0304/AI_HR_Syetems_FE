import type { Currency } from "@/types/currency.types";

/**
 * `GET /api/currencies` intentionally no longer filters `isActive`
 * server-side (see `app/api/currencies/route.ts`'s docblock) since it also
 * backs the Administration > Currencies CRUD screen, which must show (and
 * let a SystemAdmin re-activate) inactive/retired currencies too.
 *
 * Every *other* consumer of `useCurrencyList()` — the "Invoice Currency"
 * dropdown (`InvoiceGenerateForm`/`InvoiceEditForm`) and the Rate Card
 * "Currency" dropdown (`RateCardForm` via `RateCardsListView`) — must not
 * offer a retired currency as a new selection, so this helper re-applies
 * that `isActive` filter client-side.
 *
 * `keepCurrencyId` preserves an already-selected currency even if it has
 * since been deactivated, so editing an existing record (an invoice or a
 * rate card) whose currency was retired after the fact doesn't silently
 * drop the option out from under the form.
 */
export function filterSelectableCurrencies(
  currencies: Currency[],
  keepCurrencyId?: string
): Currency[] {
  return currencies.filter(
    (currency) => currency.isActive || (!!keepCurrencyId && currency.id === keepCurrencyId)
  );
}
