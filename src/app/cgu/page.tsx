import Link from "next/link";

export default function CguPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="card w-full max-w-3xl space-y-4">
        <h1 className="text-2xl font-extrabold text-ink">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-sm text-muted">Dernière mise à jour : 24 novembre 2026</p>
        <section className="space-y-2 text-sm leading-relaxed text-ink">
          <h2 className="text-base font-bold">1. Objet</h2>
          <p>La plateforme permet aux structures de santé (cliniques, hôpitaux, pharmacies) de créer, imprimer et gérer leurs tickets de caisse et factures, ainsi que leurs abonnements. L&apos;utilisation du service implique l&apos;acceptation des présentes CGU.</p>
          <h2 className="text-base font-bold">2. Comptes et accès</h2>
          <p>Chaque structure dispose d&apos;un compte administrateur qui gère ses utilisateurs, ses tarifs, ses soins et ses réglages. Les accès sont personnels et ne doivent pas être partagés. L&apos;administrateur est responsable des actions réalisées depuis son compte.</p>
          <h2 className="text-base font-bold">3. Abonnement</h2>
          <p>L&apos;accès au service est soumis à un abonnement mensuel de 25 000 F CFA et à des frais d&apos;inscription uniques de 50 000 F CFA. Le paiement est validé par l&apos;administrateur de la plateforme après réception du virement. Un retard de paiement peut entraîner la suspension du compte.</p>
          <h2 className="text-base font-bold">4. Utilisation acceptable</h2>
          <p>L&apos;utilisateur s&apos;engage à utiliser le service conformément à la loi, à ne pas tenter d&apos;accéder aux données d&apos;une autre structure et à ne pas contourner les mécanismes de sécurité. Toute anomalie doit être signalée au support.</p>
          <h2 className="text-base font-bold">5. Responsabilité</h2>
          <p>Les données saisies (noms des patients, montants, soins) relèvent de la responsabilité de la structure utilisatrice. La plateforme fournit les outils de saisie, d&apos;impression et d&apos;historisation, sans se substituer aux obligations légales de la structure.</p>
          <h2 className="text-base font-bold">6. Résiliation</h2>
          <p>Une structure peut cesser d&apos;utiliser le service à tout moment. Les données restent conservées pendant la durée légale requise, puis supprimées sur demande.</p>
          <h2 className="text-base font-bold">7. Contact</h2>
          <p>Pour toute question relative aux présentes CGU, contactez l&apos;administrateur de la plateforme.</p>
        </section>
        <Link href="/inscription" className="btn-secondary inline-flex">Retour à l&apos;accueil</Link>
      </div>
    </main>
  );
}
