"use client";

import { useMemo, useState } from "react";
import {
  SearchableSelectField,
  type SearchableSelectOption,
} from "@/components/ui/SearchableSelectField";
import type { Country } from "@/types/country.types";

export interface CountrySelectFieldProps {
  label?: string;
  /** Full country reference-data list (`useCountryList()`) — already fetched in one page, so search here is a client-side filter, not a new paginated request. */
  countries: Country[];
  /** The selected country's id, or `""`/`null`/`undefined` when none is selected. */
  value: string | null | undefined;
  onChange: (countryId: string) => void;
  onBlur?: () => void;
  name?: string;
  isLoading?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
}

function toOption(country: Country): SearchableSelectOption {
  return { value: country.id, label: `${country.name} (${country.code})` };
}

/**
 * Searchable "Country" combobox, built on `SearchableSelectField` — per the
 * `bugs/exchange-rate` feature request ("country select box need also
 * search"), every Country dropdown in the app (Create User, Update Profile,
 * Rate Cards) should support typing to filter, not just scrolling a plain
 * `<select>` of every country. Unlike the "User" combobox
 * (`hooks/useAuth.ts#useUnassignedUsersInfinite`), `Country/GetAllCountries`
 * reference data is small and already fetched in full via `useCountryList()`,
 * so filtering happens entirely client-side here — no server-side search/
 * pagination round trip is needed.
 */
export function CountrySelectField({
  label = "Country",
  countries,
  value,
  onChange,
  onBlur,
  name,
  isLoading = false,
  disabled = false,
  error,
  hint,
  placeholder,
}: CountrySelectFieldProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const selectedOption = useMemo(() => {
    const match = countries.find((country) => country.id === value);
    return match ? toOption(match) : null;
  }, [countries, value]);

  const filteredOptions = useMemo(() => {
    const options = countries.map(toOption);
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [countries, searchTerm]);

  const isDisabled = disabled || (isLoading && countries.length === 0);

  return (
    <div className="flex flex-col gap-1.5">
      <SearchableSelectField
        label={label}
        name={name}
        placeholder={
          isLoading
            ? "Loading countries…"
            : countries.length === 0
              ? "No countries available"
              : (placeholder ?? "Search countries…")
        }
        selectedOption={selectedOption}
        onSelect={(option) => {
          onChange(option.value);
          onBlur?.();
        }}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        options={filteredOptions}
        isLoading={isLoading}
        disabled={isDisabled}
        error={error}
        emptyMessage={countries.length === 0 ? "No countries available." : "No matching countries."}
      />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
