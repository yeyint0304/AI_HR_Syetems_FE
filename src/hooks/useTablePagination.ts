"use client";

import { useMemo, useState } from "react";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/pagination.constants";

export interface UseTablePaginationResult<T> {
  /** The current page, clamped to `[1, totalPages]` (auto-corrects if `items` shrinks, e.g. after a delete or filter change). */
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  /** The slice of `items` to render for the current page. */
  pageItems: T[];
}

/**
 * Client-side pagination for list/table views whose data-fetching hook
 * (`useCurrencyList`, `useCountryList`, `useResourceRoleTypes`,
 * `useExchangeRateList`, `useProjectList`, `useRateCardList`,
 * `useTimesheetPeriodList`, etc.) already loads the full reference-data set
 * in one request. Pairs with `components/ui/TablePagination.tsx` for the
 * Previous/Next controls.
 *
 * Views with genuinely large, server-paginated result sets
 * (`InvoicesListView`, `TimesheetReportView`) manage `page`/`pageSize`
 * themselves via their own query params instead — this hook is only for
 * paginating an already-fetched, in-memory array.
 */
export function useTablePagination<T>(
  items: T[],
  pageSize: number = DEFAULT_TABLE_PAGE_SIZE
): UseTablePaginationResult<T> {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return { page: currentPage, setPage, totalPages, pageItems };
}
