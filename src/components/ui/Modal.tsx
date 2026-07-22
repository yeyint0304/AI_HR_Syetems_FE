"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Accessible modal dialog for forms (Add/Edit), used by the Exchange Rates
 * screen per the wireframe's "Add -> modal; Edit -> pre-filled modal"
 * pattern (`docs/HR_System_FE_wireframe.pdf`). Distinct from
 * `ConfirmDialog` (`role="alertdialog"`, reserved for destructive
 * confirmations): this is a general-purpose `role="dialog"` container for
 * arbitrary form content.
 */
export function Modal({ open, title, description, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6">
      <button
        type="button"
        aria-label="Dismiss dialog"
        className="fixed inset-0 bg-slate-950/60"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl focus:outline-none"
      >
        <h2 id="modal-title" className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        {description && (
          <p id="modal-description" className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
