"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SearchableSelectFieldProps {
  label: string;
  id?: string;
  name?: string;
  placeholder?: string;
  /** The currently selected option, or `null` if nothing is selected yet. */
  selectedOption: SearchableSelectOption | null;
  onSelect: (option: SearchableSelectOption) => void;
  /** Raw (not-yet-debounced) search box text — owned by the parent so it can be debounced before triggering a fetch. */
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  /** Already-fetched options to render (e.g. every page loaded so far by an infinite query). */
  options: SearchableSelectOption[];
  /** True while the *first* page of results for the current search is loading. */
  isLoading?: boolean;
  /** True while an additional (scroll-triggered) page is loading. */
  isFetchingMore?: boolean;
  /** Whether scrolling to the bottom of the list should trigger `onLoadMore`. */
  hasMore?: boolean;
  onLoadMore?: () => void;
  /** Non-null when the most recent fetch failed. */
  loadError?: string | null;
  onRetryLoad?: () => void;
  /** Field-level validation error (e.g. from `react-hook-form`/Zod). */
  error?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

const SCROLL_THRESHOLD_PX = 48;

/**
 * Accessible, searchable, scroll-paginated combobox (ARIA 1.2 "combobox with
 * list popup" pattern: `role="combobox"` input + `role="listbox"` popup,
 * `aria-activedescendant` tracking the highlighted option). Built for the
 * Project Assignments "User" field
 * (`components/projects/ProjectAssignmentsView.tsx`), which previously used
 * a plain `<SelectField>` — with hundreds of unassigned users, a native
 * `<select>` populated from a single unpaginated fetch doesn't scale, so this
 * combines a debounced text search with "load more on scroll" pagination
 * (`hooks/useAuth.ts#useUnassignedUsersInfinite`) instead of one giant
 * `<option>` list.
 *
 * Distinct from `SelectField` (plain native `<select>`, still used
 * elsewhere for small, fully-loaded option lists like "Resource role").
 */
export function SearchableSelectField({
  label,
  id,
  name,
  placeholder = "Search…",
  selectedOption,
  onSelect,
  searchTerm,
  onSearchTermChange,
  options,
  isLoading = false,
  isFetchingMore = false,
  hasMore = false,
  onLoadMore,
  loadError = null,
  onRetryLoad,
  error,
  disabled = false,
  emptyMessage = "No results found.",
}: SearchableSelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const listboxId = `${fieldId}-listbox`;
  const errorId = `${fieldId}-error`;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(options.length > 0 ? 0 : -1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  // Re-highlight the first option whenever the `options` list itself changes
  // (new search results, a fresh page appended, etc.) — adjusting state
  // during render (rather than in an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes,
  // since setting state directly inside an effect body causes an extra,
  // avoidable render pass.
  const [prevOptions, setPrevOptions] = useState(options);
  if (options !== prevOptions) {
    setPrevOptions(options);
    setHighlightedIndex(options.length > 0 ? 0 : -1);
  }

  function openList() {
    if (disabled) return;
    setIsOpen(true);
  }

  function commitSelection(option: SearchableSelectOption) {
    onSelect(option);
    onSearchTermChange("");
    setIsOpen(false);
  }

  function handleInputChange(nextValue: string) {
    onSearchTermChange(nextValue);
    if (!isOpen) setIsOpen(true);
  }

  function handleScroll() {
    const el = listboxRef.current;
    if (!el || !hasMore || isFetchingMore || !onLoadMore) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= SCROLL_THRESHOLD_PX) {
      onLoadMore();
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          return;
        }
        setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        if (!isOpen) return;
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      case "Enter": {
        if (!isOpen) return;
        event.preventDefault();
        const option = options[highlightedIndex];
        if (option) commitSelection(option);
        return;
      }
      case "Escape": {
        if (!isOpen) return;
        event.preventDefault();
        setIsOpen(false);
        return;
      }
      default:
        return;
    }
  }

  const displayValue = isOpen ? searchTerm : (selectedOption?.label ?? searchTerm);
  const activeDescendant =
    isOpen && highlightedIndex >= 0 && options[highlightedIndex]
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        ref={inputRef}
        id={fieldId}
        name={name}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={displayValue}
        onFocus={openList}
        onClick={openList}
        onChange={(event) => handleInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          error ? "border-red-400" : "border-slate-300"
        }`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <ul
            ref={listboxRef}
            role="listbox"
            id={listboxId}
            aria-label={label}
            onScroll={handleScroll}
            className="max-h-60 overflow-y-auto py-1"
          >
            {isLoading ? (
              <li className="px-3 py-2 text-sm text-slate-500" role="status">
                Loading…
              </li>
            ) : loadError ? (
              <li className="px-3 py-2 text-sm text-red-600" role="alert">
                {loadError}
                {onRetryLoad && (
                  <button
                    type="button"
                    onClick={onRetryLoad}
                    className="ml-2 font-medium text-blue-600 underline hover:text-blue-700"
                  >
                    Try again
                  </button>
                )}
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">{emptyMessage}</li>
            ) : (
              options.map((option, index) => (
                <li
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={option.value === selectedOption?.value}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commitSelection(option)}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    index === highlightedIndex ? "bg-blue-50 text-blue-700" : "text-slate-700"
                  } ${option.value === selectedOption?.value ? "font-semibold" : ""}`}
                >
                  {option.label}
                  {option.description && (
                    <span className="block text-xs text-slate-400">{option.description}</span>
                  )}
                </li>
              ))
            )}
            {isFetchingMore && (
              <li className="px-3 py-2 text-xs text-slate-400" role="status">
                Loading more…
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
