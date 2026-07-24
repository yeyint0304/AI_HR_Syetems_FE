import { act, renderHook } from "@testing-library/react";
import { useTablePagination } from "@/hooks/useTablePagination";

describe("useTablePagination", () => {
  it("returns all items on a single page when items fit within the page size", () => {
    const items = [1, 2, 3];
    const { result } = renderHook(() => useTablePagination(items, 20));

    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.pageItems).toEqual([1, 2, 3]);
  });

  it("slices items across pages using the given page size", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    const { result } = renderHook(() => useTablePagination(items, 20));

    expect(result.current.totalPages).toBe(2);
    expect(result.current.pageItems).toEqual(items.slice(0, 20));

    act(() => {
      result.current.setPage(2);
    });
    expect(result.current.page).toBe(2);
    expect(result.current.pageItems).toEqual(items.slice(20, 25));
  });

  it("clamps the current page back down when the item count shrinks (e.g. after a delete)", () => {
    const { result, rerender } = renderHook(({ items }) => useTablePagination(items, 10), {
      initialProps: { items: Array.from({ length: 25 }, (_, i) => i + 1) },
    });

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    rerender({ items: Array.from({ length: 5 }, (_, i) => i + 1) });
    expect(result.current.totalPages).toBe(1);
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns an empty page (page 1 of 1) for an empty item list", () => {
    const { result } = renderHook(() => useTablePagination([] as number[], 20));

    expect(result.current.totalPages).toBe(1);
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual([]);
  });
});
