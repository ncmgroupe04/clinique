import { requireUser } from "@/lib/auth";

export default async function TableauPage() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1F2A]">Tableau de bord</h1>
        <p className="text-sm text-[#4B5F6B]">
          Connecté en tant que{" "}
          <span className="font-medium text-[#0B7A6B]">{user.role}</span>.
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
