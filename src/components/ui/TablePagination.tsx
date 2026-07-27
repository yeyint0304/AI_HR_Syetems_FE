import { Button } from "@/components/ui/Button";

export interface TablePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Accessible name for the `<nav>` landmark, e.g. "Currencies pagination". */
  label: string;
  isDisabled?: boolean;
}

/**
 * Previous/Next + "Page X of Y" pagination control, matching the pattern
 * already established by `InvoicesListView`'s inline markup. Renders nothing
 * when there's only one page, so tables with a handful of rows are
 * unaffected.
 */
export function TablePagination({
  page,
  totalPages,
  onPageChange,
  label,
  isDisabled = false,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label={label} className="flex items-center justify-between">
      <Button
        type="button"
        variant="secondary"
        disabled={page <= 1 || isDisabled}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </p>
      <Button
        type="button"
        variant="secondary"
        disabled={page >= totalPages || isDisabled}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
