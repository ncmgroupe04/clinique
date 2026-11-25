"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoUpload({ structureId, initialPath }: { structureId: string; initialPath: string }) {
  const [path, setPath] = useState(initialPath);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!path) { setUrl(null); return; }
    const supabase = createClient();
    const { data } = supabase.storage.from("structure-logos").getPublicUrl(path);
    setUrl(data.publicUrl);
  }, [path]);

  async function upload(file: File) {
    setError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Format accepté : PNG, JPEG ou WebP."); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Taille maximale : 2 Mo."); return;
    }
    setBusy(true);
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const newPath = `${structureId}/logo.${ext}`;
    const { error: upErr } = await supabase.storage.from("structure-logos").upload(newPath, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setError(
        upErr.message.toLowerCase().includes("bucket")
          ? "Stockage des logos non configuré : appliquez la migration 0027_structure_logo.sql dans Supabase."
          : upErr.message,
      );
      setBusy(false);
      return;
    }
    const { error: dbErr } = await supabase.from("structures").update({ logo_path: newPath }).eq("id", structureId);
    if (dbErr) { setError(dbErr.message); setBusy(false); return; }
    setPath(newPath);
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    const supabase = createClient();
    if (path) await supabase.storage.from("structure-logos").remove([path]);
    await supabase.from("structures").update({ logo_path: null }).eq("id", structureId);
    setPath("");
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