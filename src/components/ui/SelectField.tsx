import { forwardRef, useId, type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  /**
   * Whether the `placeholder` option is rendered as `disabled` (the default,
   * `true`). Required-selection fields (e.g. "Role") should keep the default
   * so the placeholder can only ever be the *initial* value, never one the
   * user can deliberately re-select.
   *
   * Filter selects whose empty value is itself a meaningful, permanent
   * choice (e.g. "All Projects"/"All Statuses") should pass `false` here —
   * otherwise, once the user picks a specific option, the native `<select>`
   * makes the disabled placeholder option unreachable again, permanently
   * trapping them away from "All ..." for the lifetime of the component.
   */
  placeholderDisabled?: boolean;
}

/** Accessible `<select>` field, styled to match `TextField`. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, id, className = "", options, placeholder, placeholderDisabled = true, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          error ? "border-red-400" : "border-slate-300"
        } ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled={placeholderDisabled}>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
