import type { ReactNode } from "react";

type AlertVariant = "error" | "success" | "info";

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: "bg-red-50 text-red-700 border-red-200",
  success: "bg-green-50 text-green-700 border-green-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

/** Accessible, live-region status/error banner used across auth forms. */
export function Alert({ variant = "info", children }: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`rounded-lg border px-4 py-3 text-sm ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </div>
  );
}
