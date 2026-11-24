"use client";

import { useRef, useState } from "react";

export default function ConfirmActionButton({
  label,
  confirmTitle,
  confirmMessage,
  confirmLabel = "Confirmer",
  buttonClassName,
  buttonStyle,
  formAction,
  hiddenInputs = [],
}: {
  label: string;
  confirmTitle: string;
  confirmMessage: string;
  confirmLabel?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  formAction: (formData: FormData) => void | Promise<void>;
  hiddenInputs?: { name: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName}
        style={buttonStyle}
      >
        {label}
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
              <form ref={formRef} action={formAction}>
                {hiddenInputs.map((h) => (
                  <input key={h.name} type="hidden" name={h.name} value={h.value} />
                ))}
                <button
                  type="submit"
                  className="btn-danger-solid"
                  style={{ height: 40, padding: "0 18px", borderRadius: 12, fontSize: 13, width: "auto" }}
                  onClick={() => setOpen(false)}
                >
                  {confirmLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
