"use client";

import { CloseIcon } from "@/components/icons";
import type { ReactNode } from "react";
import { useEffect } from "react";

export const inputClass =
  "h-12 w-full rounded-xl border border-[#dfe7e1] bg-white px-3.5 text-[15px] outline-none transition focus:border-[#1f6a46] focus:ring-3 focus:ring-[#1f6a46]/10";

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#102017]/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`safe-bottom max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-[#fbfcf9] shadow-2xl sm:rounded-[28px] ${
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        }`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e7ece8] bg-[#fbfcf9]/95 px-5 py-4 backdrop-blur">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full bg-[#eef2ee] transition hover:bg-[#e2e9e3]"
            aria-label="Close"
          >
            <CloseIcon className="size-5" />
          </button>
        </header>
        <div className="p-5 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#34443a]">
      {label}
      {children}
      {hint && <span className="font-normal text-[#718078]">{hint}</span>}
    </label>
  );
}

export function EmptyState({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-[#cfd9d1] bg-white/60 px-5 py-10 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-[#eef4ef] text-[#1f6a46]">
        {icon}
      </div>
      <strong>{title}</strong>
      <p className="mt-1 max-w-sm text-sm text-[#65736b]">{text}</p>
    </div>
  );
}
