"use client";

import { useState } from "react";
import { Info, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { CurrencyForm } from "@/components/currencies/CurrencyForm";
import { TablePagination } from "@/components/ui/TablePagination";
import { useCurrencyList, useDeleteCurrency } from "@/hooks/useCurrencies";
import { useTablePagination } from "@/hooks/useTablePagination";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import type { Currency } from "@/types/currency.types";

type ModalState = { mode: "create" } | { mode: "edit"; currency: Currency } | null;

/**
 * `/admin/currencies` — configure supported currencies; the base currency is
 * used for all rate card and exchange-rate calculations, per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`): a table with CODE/NAME/SYMBOL/BASE
 * CURRENCY/STATUS columns, "+ Add Currency" opening a modal, per-row Edit
 * (pre-filled modal), and an info note at the bottom explaining the base
 * currency. Per the wireframe's "SGD has no Delete button (protected)" note,
 * the base currency's row never renders a Delete action — deleting the
 * currency every rate/rate-card conversion depends on would be destructive,
 * and the backend has no "reassign base currency" flow for this UI to drive.
 * Fetches live data via `useCurrencyList` (TanStack Query -> `lib/api/*.ts`
 * -> this app's own Route Handlers -> the .NET backend).
 */
export function CurrenciesListView() {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [currencyPendingDelete, setCurrencyPendingDelete] = useState<Currency | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    data: currencies,
    isLoading,
    isError,
    error: loadError,
    refetch,
  } = useCurrencyList();
  const deleteMutation = useDeleteCurrency();

  function handleDeleteConfirm() {
    if (!currencyPendingDelete) return;
    setDeleteError(null);
    deleteMutation.mutate(currencyPendingDelete.id, {
      onSuccess: () => setCurrencyPendingDelete(null),
      onError: (mutationError) => {
        setDeleteError(getApiErrorMessage(mutationError, "Unable to delete the currency. Please try again."));
      },
    });
  }

  const baseCurrency = currencies?.find((currency) => currency.isBaseCurrency);
  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedCurrencies,
  } = useTablePagination(currencies ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Currencies</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure supported currencies. Base currency is used for all rate card calculations.
          </p>
        </div>
        <Button type="button" onClick={() => setModalState({ mode: "create" })}>
          + Add Currency
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Loading currencies…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Alert variant="error">{getApiErrorMessage(loadError, "Unable to load currencies.")}</Alert>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </div>
      ) : (
        <>
          {deleteError && <Alert variant="error">{deleteError}</Alert>}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!currencies || currencies.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No currencies yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">List of currencies</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Code
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Name
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Symbol
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Base Currency
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
                    {pagedCurrencies.map((currency) => (
                      <tr key={currency.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{currency.code}</td>
                        <td className="px-4 py-3 text-slate-700">{currency.name}</td>
                        <td className="px-4 py-3 text-slate-500">{currency.symbol}</td>
                        <td className="px-4 py-3">
                          {currency.isBaseCurrency && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              <Star aria-hidden="true" className="h-3 w-3 fill-current" />
                              Base Currency
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              currency.isActive
                                ? "bg-green-50 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {currency.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setModalState({ mode: "edit", currency })}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                            >
                              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            {!currency.isBaseCurrency && (
                              <button
                                type="button"
                                onClick={() => setCurrencyPendingDelete(currency)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                              >
                                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            )}
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
            label="Currencies pagination"
          />

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              {baseCurrency
                ? `The base currency (${baseCurrency.code}) is the reference for all exchange rate conversions and rate card calculations. Only one currency can be the base at a time.`
                : "No base currency is configured yet. Mark a currency as the base currency when creating it."}
            </p>
          </div>

          <Modal
            open={modalState !== null}
            title={modalState?.mode === "edit" ? "Edit currency" : "Add currency"}
            description={
              modalState?.mode === "edit"
                ? "Update the name, symbol, or status for this currency."
                : "Create a new supported currency."
            }
            onClose={() => setModalState(null)}
          >
            <CurrencyForm
              mode={modalState?.mode ?? "create"}
              currency={modalState?.mode === "edit" ? modalState.currency : undefined}
              onSuccess={() => setModalState(null)}
              onCancel={() => setModalState(null)}
            />
          </Modal>

          <ConfirmDialog
            open={currencyPendingDelete !== null}
            title="Delete currency"
            description={`Are you sure you want to delete ${currencyPendingDelete?.code} — ${currencyPendingDelete?.name}? This action cannot be undone.`}
            confirmLabel="Delete"
            isConfirming={deleteMutation.isPending}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setCurrencyPendingDelete(null)}
          />
        </>
      )}
    </div>
  );
}
