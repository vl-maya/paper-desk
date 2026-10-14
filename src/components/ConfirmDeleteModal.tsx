"use client";

import { Modal } from "@/components/Modal";

export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title = "Delete?",
  description = "This action cannot be undone.",
  itemLabel,
  confirmLabel = "Delete",
  priority = "top",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemLabel?: string;
  confirmLabel?: string;
  priority?: "normal" | "elevated" | "top";
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="confirm-delete-title"
      priority={priority}
    >
      <h3 id="confirm-delete-title" className="font-serif text-lg pr-8">
        {title}
      </h3>
      <p className="text-sm text-ink-muted mt-2">{description}</p>
      {itemLabel ? (
        <p className="text-sm font-medium mt-2 wrap-break-word">{itemLabel}</p>
      ) : null}
      <div className="flex flex-wrap gap-2 mt-5 justify-end">
        <button
          type="button"
          className="rounded border border-paper-line px-4 py-2 text-sm"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded bg-red-800 px-4 py-2 text-sm text-white hover:bg-red-900"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
