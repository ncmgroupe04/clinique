"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoUpload({ structureId, initialPath }: { structureId: string; initialPath: string }) {
  const [path, setPath] = useState(initialPath);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!path) { setUrl(null); return; }
    const supabase = createClient();
    const { data } = supabase.storage.from("structure-logos").getPublicUrl(path);
    setUrl(data.publicUrl);
  }, [path]);

  async function upload(file: File) {
    setError("");
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/logo", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { path?: string; url?: string; error?: string };
    if (!res.ok || !data.path) {
      setError(data.error ?? "Téléversement impossible.");
      setBusy(false);
      return;
    }
    setPath(data.path);
    if (data.url) setUrl(data.url);
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/logo", { method: "DELETE" });
    setPath("");
    setUrl(null);
    setBusy(false);
  }

  return (
    <div className="rounded-[14px] bg-[#F2F5F7] px-[18px] py-3.5">
      <span className="lbl">Logo de la structure</span>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-input-border bg-white">
          {url ? <img src={url} alt="Logo de la structure" className="h-full w-full object-contain" /> : <span className="text-xs text-muted">Aucun</span>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="go cursor-pointer" style={{ height: 40, padding: "0 16px" }}>
            {busy ? "Envoi…" : "Téléverser un logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          </label>
          {path && <button type="button" onClick={() => void remove()} className="text-xs font-semibold text-danger">Retirer le logo</button>}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <p className="mt-2 text-xs text-muted">PNG, JPEG ou WebP · 2 Mo max. Le logo apparaît sur l’ordonnance, la facture et le ticket.</p>
    </div>
  );
}