"use client";

import { useMemo, useState } from "react";
import { Info, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ExchangeRateForm } from "@/components/exchangeRates/ExchangeRateForm";
import { TablePagination } from "@/components/ui/TablePagination";
import { useCurrencyList } from "@/hooks/useCurrencies";
import { useDeleteExchangeRate, useExchangeRateList } from "@/hooks/useExchangeRates";
import { useTablePagination } from "@/hooks/useTablePagination";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { formatDisplayDate } from "@/lib/utils/date";
import type { Currency } from "@/types/currency.types";
import type { ExchangeRate } from "@/types/exchangeRate.types";

/** For each non-base currency, the most recent (by effective date) active rate from the base currency to it — backs the wireframe's "currency summary cards" row. */
function latestRateFor(rates: ExchangeRate[], baseCurrencyId: string, targetCurrencyId: string): ExchangeRate | null {
  const candidates = rates.filter(
    (rate) => rate.fromCurrency.id === baseCurrencyId && rate.toCurrency.id === targetCurrencyId
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((latest, candidate) =>
    candidate.effectiveDate > latest.effectiveDate ? candidate : latest
  );
}

type ModalState = { mode: "create" } | { mode: "edit"; exchangeRate: ExchangeRate } | null;

/**
 * `/admin/exchange-rates` — define conversion rates from the base currency to
 * other currencies, per the wireframe (`docs/HR_System_FE_wireframe.pdf`):
 * currency summary cards at the top, a rates table below, "+ Add Rate"
 * opening a modal, and per-row Edit (pre-filled modal) / Delete (confirm
 * modal) actions. Fetches live data via `useCurrencyList` and
 * `useExchangeRateList` (TanStack Query -> `lib/api/*.ts` -> this app's own
 * Route Handlers -> the .NET backend).
 */
export function ExchangeRatesListView() {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [ratePendingDelete, setRatePendingDelete] = useState<ExchangeRate | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    data: currencies,
    isLoading: isLoadingCurrencies,
    isError: isCurrenciesError,
    error: currenciesError,
    refetch: refetchCurrencies,
  } = useCurrencyList();
  const {
    data: exchangeRates,
    isLoading: isLoadingRates,
    isError: isRatesError,
    error: ratesError,
    refetch: refetchRates,
  } = useExchangeRateList();
  const deleteMutation = useDeleteExchangeRate();

  const baseCurrency: Currency | undefined = currencies?.find((currency) => currency.isBaseCurrency);
  const otherCurrencies = useMemo(
    () => (currencies ?? []).filter((currency) => !currency.isBaseCurrency),
    [currencies]
  );

  const isLoading = isLoadingCurrencies || isLoadingRates;
  const isError = isCurrenciesError || isRatesError;
  const loadError = currenciesError ?? ratesError;

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedExchangeRates,
  } = useTablePagination(exchangeRates ?? []);

  function handleRetry() {
    refetchCurrencies();
    refetchRates();
  }

  function handleDeleteConfirm() {
    if (!ratePendingDelete) return;
    setDeleteError(null);
    deleteMutation.mutate(ratePendingDelete.id, {
      onSuccess: () => setRatePendingDelete(null),
      onError: (mutationError) => {
        setDeleteError(
          getApiErrorMessage(mutationError, "Unable to delete the exchange rate. Please try again.")
        );
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Exchange Rates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Define conversion rates from the base currency
            {baseCurrency ? ` (${baseCurrency.code})` : ""} to other currencies.
          </p>
        </div>
        {baseCurrency && otherCurrencies.length > 0 && (
          <Button type="button" onClick={() => setModalState({ mode: "create" })}>
            + Add Rate
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Loading exchange rates…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Alert variant="error">
            {getApiErrorMessage(loadError, "Unable to load exchange rates.")}
          </Alert>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={handleRetry}>
              Try again
            </Button>
          </div>
        </div>
      ) : !baseCurrency ? (
        <Alert variant="info">
          No base currency is configured yet. Set a base currency under Administration &gt;
          Currencies before adding exchange rates.
        </Alert>
      ) : (
        <>
          {otherCurrencies.length === 0 && (
            <Alert variant="info">
              No other active currencies are configured yet. Add a currency under Administration
              &gt; Currencies before adding exchange rates.
            </Alert>
          )}

          {deleteError && <Alert variant="error">{deleteError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">{baseCurrency.code}</span>
                <span className="text-lg text-slate-500">{baseCurrency.symbol}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{baseCurrency.name}</p>
              <p className="mt-2 text-xs font-medium text-blue-700">Base currency</p>
            </div>

            {otherCurrencies.map((currency) => {
              const latest = latestRateFor(exchangeRates ?? [], baseCurrency.id, currency.id);
              return (
                <div key={currency.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{currency.code}</span>
                    <span className="text-lg text-slate-500">{currency.symbol}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{currency.name}</p>
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    {latest
                      ? `1 ${baseCurrency.code} = ${latest.rate} ${currency.code}`
                      : "No rate set"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!exchangeRates || exchangeRates.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No exchange rates yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">List of exchange rates</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        From
                      </th>
                      <th scope="col" className="px-4 py-3">
                        To
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Rate
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
                    {pagedExchangeRates.map((exchangeRate) => (
                      <tr key={exchangeRate.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {exchangeRate.fromCurrency.code}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{exchangeRate.toCurrency.code}</td>
                        <td className="px-4 py-3 text-slate-700">
                          1 {exchangeRate.fromCurrency.code} = {exchangeRate.rate}{" "}
                          {exchangeRate.toCurrency.code}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDisplayDate(exchangeRate.effectiveDate)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setModalState({ mode: "edit", exchangeRate })}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                            >
                              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setRatePendingDelete(exchangeRate)}
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
            label="Exchange rates pagination"
          />

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              Exchange rates are applied when generating invoices in non-base currencies. Rates are
              effective from their specified date and remain active until a newer rate is added for
              the same currency pair.
            </p>
          </div>

          <Modal
            open={modalState !== null}
            title={modalState?.mode === "edit" ? "Edit exchange rate" : "Add exchange rate"}
            description={
              modalState?.mode === "edit"
                ? "Update the rate, effective date, or status for this currency pair."
                : "Create a new conversion rate from the base currency to another currency."
            }
            onClose={() => setModalState(null)}
          >
            <ExchangeRateForm
              mode={modalState?.mode ?? "create"}
              baseCurrency={baseCurrency}
              currencyOptions={otherCurrencies}
              exchangeRate={modalState?.mode === "edit" ? modalState.exchangeRate : undefined}
              onSuccess={() => setModalState(null)}
              onCancel={() => setModalState(null)}
            />
          </Modal>

          <ConfirmDialog
            open={ratePendingDelete !== null}
            title="Delete exchange rate"
            description={`Are you sure you want to delete the ${ratePendingDelete?.fromCurrency.code} → ${ratePendingDelete?.toCurrency.code} rate? This action cannot be undone.`}
            confirmLabel="Delete"
            isConfirming={deleteMutation.isPending}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setRatePendingDelete(null)}
          />
        </>
      )}
    </div>
  );
}
