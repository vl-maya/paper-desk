"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  priority = "normal",
  maxWidthClass = "max-w-lg",
  maxHeightClass = "max-h-[min(90vh,720px)]",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  /** Use elevated or top when stacking above another modal (e.g. nested modal, delete confirm). */
  priority?: "normal" | "elevated" | "top";
  maxWidthClass?: string;
  maxHeightClass?: string;
}) {
  const zBackdrop =
    priority === "top"
      ? "z-[400]"
      : priority === "elevated"
        ? "z-[300]"
        : "z-[200]";
  const zPanel =
    priority === "top"
      ? "z-[401]"
      : priority === "elevated"
        ? "z-[301]"
        : "z-[201]";
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zBackdrop} flex items-center justify-center p-4 sm:p-6`}
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative ${zPanel} w-full ${maxWidthClass} ${maxHeightClass} overflow-y-auto paper-card p-4 sm:p-5 shadow-xl ring-1 ring-paper-line`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-3 right-3 text-ink-muted hover:text-ink text-lg leading-none px-1"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
