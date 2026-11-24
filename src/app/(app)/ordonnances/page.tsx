import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import ScreenHeader from "../screen-header";

export default async function OrdonnancesPage() {
  await connection();
  const user = await requireUser();
  if (user.role !== "structure_admin" && user.role !== "docteur") redirect("/tableau");
  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <ScreenHeader title="Ordonnances" subtitle="Module en préparation." />
      <section className="card flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="rounded-full bg-accent-light px-5 py-2 text-sm font-bold text-accent-text">
          Bientôt disponible
        </span>
        <h2 className="text-xl font-extrabold text-ink">Le module Ordonnancier arrive prochainement</h2>
        <p className="max-w-lg text-sm text-muted">
          Il permettra de rédiger des ordonnances : recherche de médicaments via une barre de
          recherche, gestion des posologies, des favoris et des protocoles, avec dictée vocale.
          Le module Ticket reste pleinement fonctionnel.
        </p>
      </section>
    </div>
  );
}
