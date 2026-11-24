import { requireUser } from "@/lib/auth";

export default async function TableauPage() {
  const user = await requireUser();
  return (
    <div className="flex flex-col gap-[26px]">
      <div>
        <h1 className="scr-title">Tableau de bord</h1>
        <p className="scr-sub">
          Connecté en tant que{" "}
          <span className="font-medium text-accent">{user.role}</span>.
        </p>
      </div>
      <div className="card">
        {user.role === "docteur" ? (
          <p className="text-[#4B5F6B]">
            Votre compte est prêt. Le module Ordonnancier (prescriptions) sera
            disponible prochainement.
          </p>
        ) : (
          <p className="text-[#4B5F6B]">
            Prochaines étapes : réglages, tarifs, création de ticket.
          </p>
        )}
      </div>
    </div>
  );
}
