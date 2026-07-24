"use client";

import { useMemo, useState } from "react";
import { Info, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { RateCardForm } from "@/components/rateCards/RateCardForm";
import { TablePagination } from "@/components/ui/TablePagination";
import { useCountryList } from "@/hooks/useCountries";
import { useCurrencyList } from "@/hooks/useCurrencies";
import { useResourceRoleTypes } from "@/hooks/useResourceRoleTypes";
import { useDeleteRateCard, useRateCardList } from "@/hooks/useRateCards";
import { useTablePagination } from "@/hooks/useTablePagination";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { formatDisplayDate } from "@/lib/utils/date";
import { filterSelectableCurrencies } from "@/lib/utils/currency";
import type { RateCard } from "@/types/rateCard.types";

type ModalState = { mode: "create" } | { mode: "edit"; rateCard: RateCard } | null;

/** Groups active rate cards by country for the summary cards row, matching the wireframe's "Singapore — 2 roles · SGD 400-700/day" style cards. */
function summarizeByCountry(rateCards: RateCard[]) {
  const map = new Map<
    string,
    { countryId: string; countryName: string; countryCode: string; roleCount: number; min: number; max: number; currencyCode: string }
  >();
  for (const rateCard of rateCards) {
    if (!rateCard.isActive) continue;
    const existing = map.get(rateCard.country.id);
    if (!existing) {
      map.set(rateCard.country.id, {
        countryId: rateCard.country.id,
        countryName: rateCard.country.name,
        countryCode: rateCard.country.code,
        roleCount: 1,
        min: rateCard.billingRate,
        max: rateCard.billingRate,
        currencyCode: rateCard.currency.code,
      });
    } else {
      existing.roleCount += 1;
      existing.min = Math.min(existing.min, rateCard.billingRate);
      existing.max = Math.max(existing.max, rateCard.billingRate);
    }
  }
  return [...map.values()].sort((a, b) => a.countryName.localeCompare(b.countryName));
}

/**
 * `/admin/rate-cards` — daily billing rates by country and resource role,
 * used in cost/invoice calculations, per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`): country summary cards at the top, a
 * "Filter by country" dropdown, a rates table below, "+ Add Rate Card"
 * opening a modal, and per-row Edit (pre-filled modal) / Delete (confirm
 * modal) actions — the same layout convention as
 * `components/exchangeRates/ExchangeRatesListView.tsx`. Fetches live data
 * via `useCountryList`/`useResourceRoleTypes`/`useCurrencyList`/
 * `useRateCardList` (TanStack Query -> `lib/api/*.ts` -> this app's own
 * Route Handlers -> the .NET backend).
 */
export function RateCardsListView() {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [rateCardPendingDelete, setRateCardPendingDelete] = useState<RateCard | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>("");

  const {
    data: countries,
    isLoading: isCountriesLoading,
    isError: isCountriesError,
    error: countriesError,
    refetch: refetchCountries,
  } = useCountryList();
  const {
    data: resourceRoleTypes,
    isLoading: isRoleTypesLoading,
    isError: isRoleTypesError,
    error: roleTypesError,
    refetch: refetchRoleTypes,
  } = useResourceRoleTypes();
  const {
    data: currencies,
    isLoading: isCurrenciesLoading,
    isError: isCurrenciesError,
    error: currenciesError,
    refetch: refetchCurrencies,
  } = useCurrencyList();
  const {
    data: rateCards,
    isLoading: isRateCardsLoading,
    isError: isRateCardsError,
    error: rateCardsError,
    refetch: refetchRateCards,
  } = useRateCardList();
  const deleteMutation = useDeleteRateCard();

  const isLoading = isCountriesLoading || isRoleTypesLoading || isCurrenciesLoading || isRateCardsLoading;
  const isError = isCountriesError || isRoleTypesError || isCurrenciesError || isRateCardsError;
  const loadError = countriesError ?? roleTypesError ?? currenciesError ?? rateCardsError;

  const countrySummaries = useMemo(() => summarizeByCountry(rateCards ?? []), [rateCards]);

  // Retired currencies must not be offered as a selection for a *new* rate
  // card — see `lib/utils/currency.ts`'s docblock. (In edit mode
  // `RateCardForm` renders the currency as read-only text, not this list, so
  // no "keep the current selection" exception is needed here.)
  const selectableCurrencies = useMemo(
    () => filterSelectableCurrencies(currencies ?? []),
    [currencies]
  );

  const visibleRateCards = useMemo(() => {
    const list = rateCards ?? [];
    if (!countryFilter) return list;
    return list.filter((rateCard) => rateCard.country.id === countryFilter);
  }, [rateCards, countryFilter]);

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedRateCards,
  } = useTablePagination(visibleRateCards);

  function handleRetry() {
    refetchCountries();
    refetchRoleTypes();
    refetchCurrencies();
    refetchRateCards();
  }

  function handleDeleteConfirm() {
    if (!rateCardPendingDelete) return;
    setDeleteError(null);
    deleteMutation.mutate(rateCardPendingDelete.id, {
      onSuccess: () => setRateCardPendingDelete(null),
      onError: (mutationError) => {
        setDeleteError(getApiErrorMessage(mutationError, "Unable to delete the rate card. Please try again."));
      },
    });
  }

  const canAddRateCard =
    (countries?.length ?? 0) > 0 && (resourceRoleTypes?.length ?? 0) > 0 && selectableCurrencies.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Rate Cards</h1>
          <p className="mt-1 text-sm text-slate-500">
            Daily billing rates by country and role. Used in cost and invoice calculations.
          </p>
        </div>
        {canAddRateCard && (
          <Button type="button" onClick={() => setModalState({ mode: "create" })}>
            + Add Rate Card
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Loading rate cards…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Alert variant="error">{getApiErrorMessage(loadError, "Unable to load rate cards.")}</Alert>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={handleRetry}>
              Try again
            </Button>
          </div>
        </div>
      ) : !canAddRateCard ? (
        <Alert variant="info">
          Set up at least one country, resource role, and currency under Administration before adding rate
          cards.
        </Alert>
      ) : (
        <>
          {deleteError && <Alert variant="error">{deleteError}</Alert>}

          {countrySummaries.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {countrySummaries.map((summary) => (
                <button
                  key={summary.countryId}
                  type="button"
                  onClick={() =>
                    setCountryFilter((current) => (current === summary.countryId ? "" : summary.countryId))
                  }
                  aria-pressed={countryFilter === summary.countryId}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    countryFilter === summary.countryId
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{summary.countryName}</span>
                    <span className="text-xs font-medium text-slate-400">{summary.countryCode}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {summary.roleCount} {summary.roleCount === 1 ? "role" : "roles"}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {summary.currencyCode} {summary.min}
                    {summary.max !== summary.min ? `–${summary.max}` : ""}/day
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="max-w-xs">
            <SelectField
              label="Filter by country"
              value={countryFilter}
              onChange={(event) => setCountryFilter(event.target.value)}
              placeholder="All Countries"
              options={(countries ?? []).map((country) => ({
                value: country.id,
                label: `${country.name} (${country.code})`,
              }))}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {visibleRateCards.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                {countryFilter ? "No rate cards match this country." : "No rate cards yet."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">List of rate cards</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Country
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Role
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Daily Rate
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Currency
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Effective Date
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedRateCards.map((rateCard) => (
                      <tr key={rateCard.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{rateCard.country.name}</td>
                        <td className="px-4 py-3 text-slate-700">{rateCard.resourceRoleType.name}</td>
                        <td className="px-4 py-3 text-slate-700">{rateCard.billingRate}</td>
                        <td className="px-4 py-3 text-slate-500">{rateCard.currency.code}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDisplayDate(rateCard.effectiveDate)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setModalState({ mode: "edit", rateCard })}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                            >
                              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setRateCardPendingDelete(rateCard)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                            >
                              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            label="Rate cards pagination"
          />

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              Rate cards are applied when calculating project costs and generating invoices. Rates are
              effective from their specified date and remain active until a newer rate is added for the same
              country/role combination.
            </p>
          </div>

          <Modal
            open={modalState !== null}
            title={modalState?.mode === "edit" ? "Edit rate card" : "Add rate card"}
            description={
              modalState?.mode === "edit"
                ? "Update the rates, effective date, or status for this rate card."
                : "Create a new daily billing rate for a country and resource role."
            }
            onClose={() => setModalState(null)}
          >
            <RateCardForm
              mode={modalState?.mode ?? "create"}
              countries={countries ?? []}
              resourceRoleTypes={resourceRoleTypes ?? []}
              currencies={selectableCurrencies}
              rateCard={modalState?.mode === "edit" ? modalState.rateCard : undefined}
              onSuccess={() => setModalState(null)}
              onCancel={() => setModalState(null)}
            />
          </Modal>

          <ConfirmDialog
            open={rateCardPendingDelete !== null}
            title="Delete rate card"
            description={`Are you sure you want to delete the ${rateCardPendingDelete?.country.name} — ${rateCardPendingDelete?.resourceRoleType.name} rate card? This action cannot be undone.`}
            confirmLabel="Delete"
            isConfirming={deleteMutation.isPending}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setRateCardPendingDelete(null)}
          />
        </>
      )}
    </div>
  );
}
