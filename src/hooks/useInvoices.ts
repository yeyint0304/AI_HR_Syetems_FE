"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelInvoiceRequest,
  deleteInvoiceRequest,
  generateInvoiceRequest,
  getInvoiceListRequest,
  getInvoiceRequest,
  markInvoicePaidRequest,
  sendInvoiceRequest,
  updateInvoiceRequest,
  voidInvoiceRequest,
} from "@/lib/api/invoice.api";
import type {
  GenerateInvoiceRequest,
  InvoiceListFilters,
  UpdateInvoiceRequest,
} from "@/types/invoice.types";

/**
 * Invoice domain hooks (TanStack Query), following the same `use*` naming
 * convention as `hooks/useTimesheetPeriods.ts`. Components should never call
 * `lib/api/invoice.api` directly.
 */

const INVOICES_QUERY_KEY = ["invoices"] as const;
const invoiceQueryKey = (id: string) => ["invoices", id] as const;
const invoiceListQueryKey = (filters?: InvoiceListFilters) =>
  [...INVOICES_QUERY_KEY, filters ?? {}] as const;

export function useInvoiceList(filters?: InvoiceListFilters) {
  return useQuery({
    queryKey: invoiceListQueryKey(filters),
    queryFn: () => getInvoiceListRequest(filters),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceQueryKey(id),
    queryFn: () => getInvoiceRequest(id),
    enabled: Boolean(id),
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateInvoiceRequest) => generateInvoiceRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
    },
  });
}

export function useUpdateInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateInvoiceRequest) => updateInvoiceRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: invoiceQueryKey(id) });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInvoiceRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
    },
  });
}

export function useSendInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendInvoiceRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: invoiceQueryKey(id) });
    },
  });
}

export function useMarkInvoicePaid(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markInvoicePaidRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: invoiceQueryKey(id) });
    },
  });
}

export function useVoidInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => voidInvoiceRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: invoiceQueryKey(id) });
    },
  });
}

export function useCancelInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelInvoiceRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: invoiceQueryKey(id) });
    },
  });
}
