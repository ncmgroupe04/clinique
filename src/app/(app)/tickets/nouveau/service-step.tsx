"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Service = { id: string; name: string; price: number };

function fcfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} F`;
}

// One soft tint per service card (cycled), with a matching darker price color.
const PALETTE = [
  { bg: "#E6F0FA", border: "#C6DCF2", price: "#1D4E89" },
  { bg: "#FFF4DA", border: "#F2E0B0", price: "#6B4A00" },
  { bg: "#FBE9EC", border: "#F1CBD2", price: "#8C2F3D" },
  { bg: "#EFE9FA", border: "#DCD1F1", price: "#4B3B7A" },
  { bg: "#E4F5F8", border: "#BFE7EE", price: "#0E5A66" },
];

export default function ServiceStep({ services }: { services: Service[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [otherLabel, setOtherLabel] = useState("");
  const [otherPrice, setOtherPrice] = useState("");

  const other = selectedId === "__other__";
  const selected = services.find((s) => s.id === selectedId) ?? null;
  const otherValid = otherLabel.trim().length > 0 && Number(otherPrice) >= 0 && otherPrice !== "";
  const canContinue = other ? otherValid : selected !== null;

  const continueToStep2 = () => {
    if (!canContinue) return;
    if (other) {
      const params = new URLSearchParams({
        autre: "1",
        nom: otherLabel.trim(),
        prix: String(Number(otherPrice)),
      });
      router.push(`/tickets/nouveau?${params.toString()}`);
      return;
    }
    if (selected) router.push(`/tickets/nouveau?service=${selected.id}`);
  };

  return (
    <>
      <div className="grid flex-1 content-start gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {services.map((s, index) => {
          const on = selectedId === s.id;
          const tone = PALETTE[index % PALETTE.length];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              aria-pressed={on}
              className={`relative flex h-[150px] flex-col justify-between rounded-3xl border-2 p-5 text-left ${
                on ? "border-accent bg-accent-light" : ""
              }`}
              style={on ? undefined : { background: tone.bg, borderColor: tone.border }}
            >
              <span className="text-lg font-extrabold leading-tight">{s.name}</span>
              <span
                className="text-[26px] font-extrabold tracking-[-0.5px]"
                style={{ color: on ? "#0B5F54" : tone.price }}
              >
                {fcfa(s.price)}
              </span>
              {on && (
                <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-accent">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setSelectedId("__other__")}
          aria-pressed={other}
          className={`relative flex h-[150px] flex-col justify-between rounded-3xl border-2 p-5 text-left ${
            other
              ? "border-accent bg-accent-light"
              : "border-dashed border-[#B9C7CF] bg-transparent"
          }`}
        >
          <span className="text-lg font-extrabold leading-tight">Autre service</span>
          <span className={`text-base font-semibold ${other ? "text-accent-text" : "text-muted"}`}>
            {other && otherValid ? fcfa(Number(otherPrice)) : "Prix à saisir"}
          </span>
          {other && (
            <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
          )}
        </button>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 px-7 py-[18px]">
        {other ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-[2]">
              <label className="lbl" htmlFor="other-label">
                Libellé du service
              </label>
              <input
                id="other-label"
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
                className="in"
              />
            </div>
            <div style={{ width: 170 }}>
              <label className="lbl" htmlFor="other-price">
                Prix (F CFA)
              </label>
              <input
                id="other-price"
                type="number"
                min={0}
                step={1}
                value={otherPrice}
                onChange={(e) => setOtherPrice(e.target.value)}
                className="in"
              />
            </div>
          </div>
        ) : (
          <div>
            <span className="text-[13px] font-semibold text-muted">Service choisi</span>
            <div className={selected ? "text-xl font-extrabold" : "text-[15px] font-medium text-muted"}>
              {selected ? `${selected.name} · ${fcfa(selected.price)}` : "Aucun service sélectionné"}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={continueToStep2}
          disabled={!canContinue}
          className="go"
          style={{
            width: "auto",
            padding: "0 48px",
            ...(canContinue ? {} : { background: "#C9D6DA", cursor: "not-allowed", opacity: 1 }),
          }}
        >
          Continuer
        </button>
      </div>
    </>
  );
}
