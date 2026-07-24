"use client";

import { useMemo, useState } from "react";
import { Globe, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { CountryForm } from "@/components/countries/CountryForm";
import { TablePagination } from "@/components/ui/TablePagination";
import { useCountryList, useDeleteCountry } from "@/hooks/useCountries";
import { useRateCardList } from "@/hooks/useRateCards";
import { useTablePagination } from "@/hooks/useTablePagination";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import type { Country } from "@/types/country.types";

type ModalState = { mode: "create" } | { mode: "edit"; country: Country } | null;

/** Counts every rate card (active or inactive) linked to each country id, keyed by country id — backs the wireframe's "RATE CARDS" column ("2 rate cards" / "No rate cards"). */
function countRateCardsByCountry(rateCards: { country: { id: string } }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const rateCard of rateCards) {
    counts.set(rateCard.country.id, (counts.get(rateCard.country.id) ?? 0) + 1);
  }
  return counts;
}

/**
 * `/admin/countries` — manage supported countries for user assignments and
 * rate cards, per the wireframe (`docs/HR_System_FE_wireframe.pdf`): a table
 * with COUNTRY (globe icon) / CODE / RATE CARDS / STATUS columns, "+ Add
 * Country" opening a modal, and per-row Edit (pre-filled modal). Every
 * country returned by `Country/GetAllCountries` is implicitly active (see
 * `types/country.types.ts`'s docblock), so the Status column always renders
 * "Active".
 *
 * Per the wireframe's "Delete Singapore -> blocked with warning toast" /
 * "Delete country with rate cards -> modal explains why, single OK button"
 * notes, a country still referenced by rate cards cannot be deleted: rather
 * than only discovering that after a failed request, the linked rate-card
 * count (cross-referenced from `useRateCardList`, mirroring
 * `RateCardsListView`'s country-summary computation) is checked client-side
 * first, and an explanatory single-button `Modal` is shown instead of the
 * normal `ConfirmDialog` (this codebase has no toast system — every
 * error/explanation surfaces inline, via `Alert` or `Modal`, per the existing
 * Exchange Rates / Rate Cards screens). A country the backend still rejects
 * for another reason (e.g. assigned users) falls back to the same inline
 * `Alert` pattern used everywhere else.
 */
export function CountriesListView() {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [countryPendingDelete, setCountryPendingDelete] = useState<Country | null>(null);
  const [blockedDelete, setBlockedDelete] = useState<{ country: Country; rateCardCount: number } | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    data: countries,
    isLoading: isCountriesLoading,
    isError: isCountriesError,
    error: countriesError,
    refetch: refetchCountries,
  } = useCountryList();
  const {
    data: rateCards,
    isLoading: isRateCardsLoading,
    isError: isRateCardsError,
    error: rateCardsError,
    refetch: refetchRateCards,
  } = useRateCardList();
  const deleteMutation = useDeleteCountry();

  const isLoading = isCountriesLoading || isRateCardsLoading;
  const isError = isCountriesError || isRateCardsError;
  const loadError = countriesError ?? rateCardsError;

  const rateCardCounts = useMemo(() => countRateCardsByCountry(rateCards ?? []), [rateCards]);
  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedCountries,
  } = useTablePagination(countries ?? []);

  function handleRetry() {
    refetchCountries();
    refetchRateCards();
  }

  function handleDeleteClick(country: Country) {
    const rateCardCount = rateCardCounts.get(country.id) ?? 0;
    if (rateCardCount > 0) {
      setBlockedDelete({ country, rateCardCount });
      return;
    }
    setCountryPendingDelete(country);
  }

  function handleDeleteConfirm() {
    if (!countryPendingDelete) return;
    setDeleteError(null);
    deleteMutation.mutate(countryPendingDelete.id, {
      onSuccess: () => setCountryPendingDelete(null),
      onError: (mutationError) => {
        setDeleteError(getApiErrorMessage(mutationError, "Unable to delete the country. Please try again."));
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Countries</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage supported countries for user assignments and rate cards.
          </p>
        </div>
        <Button type="button" onClick={() => setModalState({ mode: "create" })}>
          + Add Country
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Loading countries…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Alert variant="error">{getApiErrorMessage(loadError, "Unable to load countries.")}</Alert>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={handleRetry}>
              Try again
            </Button>
          </div>
        </div>
      ) : (
        <>
          {deleteError && <Alert variant="error">{deleteError}</Alert>}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!countries || countries.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No countries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">List of countries</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Country
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Code
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Rate Cards
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedCountries.map((country) => {
                      const rateCardCount = rateCardCounts.get(country.id) ?? 0;
                      return (
                        <tr key={country.id}>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                              <Globe aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                              {country.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{country.code}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {rateCardCount > 0
                              ? `${rateCardCount} rate card${rateCardCount === 1 ? "" : "s"}`
                              : "No rate cards"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                              Active
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => setModalState({ mode: "edit", country })}
                                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                              >
                                <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(country)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                              >
                                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            label="Countries pagination"
          />

          <Modal
            open={modalState !== null}
            title={modalState?.mode === "edit" ? "Edit country" : "Add country"}
            description={
              modalState?.mode === "edit"
                ? "Update the name for this country."
                : "Create a new supported country."
            }
            onClose={() => setModalState(null)}
          >
            <CountryForm
              mode={modalState?.mode ?? "create"}
              country={modalState?.mode === "edit" ? modalState.country : undefined}
              onSuccess={() => setModalState(null)}
              onCancel={() => setModalState(null)}
            />
          </Modal>

          <ConfirmDialog
            open={countryPendingDelete !== null}
            title="Delete country"
            description={`Are you sure you want to delete ${countryPendingDelete?.name}? This action cannot be undone.`}
            confirmLabel="Delete"
            isConfirming={deleteMutation.isPending}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setCountryPendingDelete(null)}
          />

          <Modal
            open={blockedDelete !== null}
            title="Cannot delete country"
            onClose={() => setBlockedDelete(null)}
          >
            <p className="text-sm text-slate-600">
              {blockedDelete?.country.name} cannot be deleted because it has {blockedDelete?.rateCardCount}{" "}
              linked rate card{blockedDelete?.rateCardCount === 1 ? "" : "s"}. Remove those rate cards under
              Administration &gt; Rate Cards first, then try again.
            </p>
            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={() => setBlockedDelete(null)}>
                OK
              </Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
