"use client";

import { useEffect, useState } from "react";

/**
 * Returns `value`, only propagating a change once `delayMs` has passed
 * without a further update. Used by `SearchableSelectField` consumers (e.g.
 * `hooks/useAuth.ts#useUnassignedUsersInfinite`) to avoid firing a network
 * request on every keystroke while the user types into a search box.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}
