import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_BYTES = 2 * 1024 * 1024;

function detectType(buf: Uint8Array): "png" | "jpeg" | "webp" | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "webp";
  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "structure_admin" && user.role !== "platform_admin")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (!user.structureId) return NextResponse.json({ error: "Aucune structure." }, { status: 400 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Taille maximale : 2 Mo." }, { status: 400 });

  const buf = new Uint8Array(await file.arrayBuffer());
  const type = detectType(buf);
  if (!type) return NextResponse.json({ error: "Format accepté : PNG, JPEG ou WebP." }, { status: 400 });

  const ext = type === "jpeg" ? "jpg" : type;
  const admin = createServiceClient();
  const newPath = `${user.structureId}/logo.${ext}`;

  const { error: upErr } = await admin.storage
    .from("structure-logos")
    .upload(newPath, buf, { upsert: true, contentType: `image/${type === "jpeg" ? "jpeg" : type}` });
  if (upErr) return NextResponse.json({ error: "Téléversement impossible." }, { status: 400 });

  const { error: dbErr } = await admin.from("structures").update({ logo_path: newPath }).eq("id", user.structureId);
  if (dbErr) return NextResponse.json({ error: "Mise à jour impossible." }, { status: 400 });

  const { data } = admin.storage.from("structure-logos").getPublicUrl(newPath);
  return NextResponse.json({ path: newPath, url: data.publicUrl });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "structure_admin" && user.role !== "platform_admin")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (!user.structureId) return NextResponse.json({ error: "Aucune structure." }, { status: 400 });
  const admin = createServiceClient();
  const { data: s } = await admin.from("structures").select("logo_path").eq("id", user.structureId).maybeSingle();
  if (s?.logo_path) await admin.storage.from("structure-logos").remove([s.logo_path]);
  await admin.from("structures").update({ logo_path: null }).eq("id", user.structureId);
  return NextResponse.json({ ok: true });
}
