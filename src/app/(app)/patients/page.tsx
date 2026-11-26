import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ScreenHeader from "../screen-header";
import PatientsClient, { type PatientDocument, type PatientRow } from "./patients-client";

type RawTicket = {
  id: string;
  year: number;
  number: number;
  patient_name: string;
  service_name: string;
  total: number | null;
  remaining: number | null;
  status: string;
  created_at: string;
};

type RawInvoice = {
  id: string;
  year: number;
  number: number;
  patient_name: string;
  total: number | null;
  remaining: number | null;
  status: string;
  created_at: string;
};

type RawPrescription = {
  id: string;
  patient_name: string;
  patient_age: string | null;
  status: string;
  created_at: string;
};

type RawPatient = {
  id: string;
  full_name: string;
  phone: string | null;
  patient_age: string | null;
  notes: string | null;
  created_at: string;
};

type PatientAcc = {
  key: string;
  spellings: Map<string, { count: number; latest: string }>;
  documents: PatientDocument[];
  ticketCount: number;
  invoiceCount: number;
  prescriptionCount: number;
  totalBilled: number;
  totalRemaining: number;
  lastDate: string;
  phone: string | null;
  age: string | null;
  notes: string | null;
  hasFiche: boolean;
};

function normalize(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function displayName(acc: PatientAcc): string {
  let best = "";
  let bestCount = -1;
  let bestLatest = "";
  for (const [name, spelling] of acc.spellings) {
    if (spelling.count > bestCount || (spelling.count === bestCount && spelling.latest > bestLatest)) {
      best = name;
      bestCount = spelling.count;
      bestLatest = spelling.latest;
    }
  }
  return best || "Patient";
}

export default async function PatientsPage() {
  await connection();
  const user = await requireUser();
  if (user.role === "platform_admin") redirect("/tableau");
  if (!user.structureId) redirect("/tableau");

  const supabase = await createClient();
  const [ticketsRes, invoicesRes, prescriptionsRes, patientsRes] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, year, number, patient_name, service_name, total, remaining, status, created_at")
      .eq("structure_id", user.structureId)
      .eq("status", "actif")
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, year, number, patient_name, total, remaining, status, created_at")
      .eq("structure_id", user.structureId)
      .eq("status", "actif")
      .order("created_at", { ascending: false }),
    supabase
      .from("prescriptions")
      .select("id, patient_name, patient_age, status, created_at")
      .eq("structure_id", user.structureId)
      .eq("status", "actif")
      .order("created_at", { ascending: false }),
    supabase
      .from("patients")
      .select("id, full_name, phone, patient_age, notes, created_at")
      .eq("structure_id", user.structureId)
      .order("created_at", { ascending: false }),
  ]);

  const accs = new Map<string, PatientAcc>();

  function getAcc(rawName: string, createdAt: string): PatientAcc {
    const name = rawName.trim().replace(/\s+/g, " ") || "Patient";
    const key = normalize(name);
    let acc = accs.get(key);
    if (!acc) {
      acc = {
        key,
        spellings: new Map(),
        documents: [],
        ticketCount: 0,
        invoiceCount: 0,
        prescriptionCount: 0,
        totalBilled: 0,
        totalRemaining: 0,
        lastDate: "",
        phone: null,
        age: null,
        notes: null,
        hasFiche: false,
      };
      accs.set(key, acc);
    }
    const spelling = acc.spellings.get(name) ?? { count: 0, latest: "" };
    spelling.count += 1;
    if (createdAt > spelling.latest) spelling.latest = createdAt;
    acc.spellings.set(name, spelling);
    if (createdAt > acc.lastDate) acc.lastDate = createdAt;
    return acc;
  }

  for (const ticket of (ticketsRes.data ?? []) as RawTicket[]) {
    if (ticket.status !== "actif") continue;
    const total = Number(ticket.total ?? 0);
    const remaining = Number(ticket.remaining ?? 0);
    const acc = getAcc(ticket.patient_name, ticket.created_at);
    acc.ticketCount += 1;
    acc.totalBilled += total;
    acc.totalRemaining += remaining;
    acc.documents.push({
      id: ticket.id,
      type: "ticket",
      reference: `Ticket ${ticket.year}-${String(ticket.number).padStart(4, "0")}`,
      date: ticket.created_at,
      amount: total,
      remaining,
      status: ticket.status,
      info: ticket.service_name || null,
    });
  }

  for (const invoice of (invoicesRes.data ?? []) as RawInvoice[]) {
    if (invoice.status !== "actif") continue;
    const total = Number(invoice.total ?? 0);
    const remaining = Number(invoice.remaining ?? 0);
    const acc = getAcc(invoice.patient_name, invoice.created_at);
    acc.invoiceCount += 1;
    acc.totalBilled += total;
    acc.totalRemaining += remaining;
    acc.documents.push({
      id: invoice.id,
      type: "facture",
      reference: `Facture ${invoice.year}-${String(invoice.number).padStart(4, "0")}`,
      date: invoice.created_at,
      amount: total,
      remaining,
      status: invoice.status,
      info: null,
    });
  }

  for (const prescription of (prescriptionsRes.data ?? []) as RawPrescription[]) {
    if (prescription.status !== "actif") continue;
    const acc = getAcc(prescription.patient_name, prescription.created_at);
    acc.prescriptionCount += 1;
    acc.documents.push({
      id: prescription.id,
      type: "ordonnance",
      reference: "Ordonnance",
      date: prescription.created_at,
      amount: 0,
      remaining: 0,
      status: prescription.status,
      info: prescription.patient_age ? `Âge : ${prescription.patient_age}` : null,
    });
  }

  for (const fiche of (patientsRes.data ?? []) as RawPatient[]) {
    const acc = getAcc(fiche.full_name, fiche.created_at);
    acc.hasFiche = true;
    if (fiche.phone) acc.phone = fiche.phone;
    if (fiche.patient_age) acc.age = fiche.patient_age;
    if (fiche.notes) acc.notes = fiche.notes;
  }

  const patients: PatientRow[] = Array.from(accs.values())
    .map((acc) => ({
      key: acc.key,
      name: displayName(acc),
      ticketCount: acc.ticketCount,
      invoiceCount: acc.invoiceCount,
      prescriptionCount: acc.prescriptionCount,
      lastDate: acc.lastDate,
      totalBilled: acc.totalBilled,
      totalRemaining: acc.totalRemaining,
      phone: acc.phone,
      age: acc.age,
      notes: acc.notes,
      hasFiche: acc.hasFiche,
      documents: acc.documents.sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader
        title="Patients"
        subtitle="Dossiers patients reconstitués à partir des documents de la structure."
      />
      <PatientsClient patients={patients} />
    </div>
  );
}
