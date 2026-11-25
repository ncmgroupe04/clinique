"use client";

import { useTransition, useState } from "react";

export default function ConfirmActionButton({
  label,
  confirmTitle,
  confirmMessage,
  confirmLabel = "Confirmer",
  confirmClassName = "btn-danger-solid",
  buttonClassName,
  buttonStyle,
  formAction,
  hiddenInputs = [],
  children,
}: {
  label: string;
  confirmTitle: string;
  confirmMessage: string;
  confirmLabel?: string;
  confirmClassName?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  formAction: (formData: FormData) => void | Promise<void>;
  hiddenInputs?: { name: string; value: string }[];
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    const fd = new FormData();
    hiddenInputs.forEach((h) => fd.set(h.name, h.value));
    startTransition(async () => {
      await formAction(fd);
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName}
        style={buttonStyle}
      >
        {children ?? label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(11, 31, 42, 0.55)" }}
          onClick={() => setOpen(false)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-ink">{confirmTitle}</h3>
            <p className="mt-2 text-sm text-muted">{confirmMessage}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary"
                style={{ height: 40, padding: "0 18px", borderRadius: 12, fontSize: 13 }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={pending}
                className={confirmClassName}
                style={{ height: 40, padding: "0 18px", borderRadius: 12, fontSize: 13, width: "auto" }}
                onClick={confirm}
              >
                {pending ? "…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
