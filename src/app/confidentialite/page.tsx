import Link from "next/link";

export default function ConfidentialitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="card w-full max-w-3xl space-y-4">
        <h1 className="text-2xl font-extrabold text-ink">Politique de confidentialité et de protection des données</h1>
        <p className="text-sm text-muted">Dernière mise à jour : 24 novembre 2026</p>
        <section className="space-y-2 text-sm leading-relaxed text-ink">
          <h2 className="text-base font-bold">1. Données collectées</h2>
          <p>Nous collectons les informations de la structure (nom, adresse, téléphone), les comptes utilisateurs (nom, e-mail) et les données de facturation nécessaires au service : nom du patient, service ou soin, montant, avance, reste, numéro de reçu et date. Aucune donnée de santé superflue n&apos;est demandée.</p>
          <h2 className="text-base font-bold">2. Finalités</h2>
          <p>Les données servent exclusivement à l&apos;édition des tickets et factures, à la tenue de l&apos;historique, au calcul des totaux journaliers et à la gestion des abonnements. Elles ne sont pas utilisées à des fins publicitaires et ne font l&apos;objet d&apos;aucun analytics tiers.</p>
          <h2 className="text-base font-bold">3. Isolation entre structures</h2>
          <p>Chaque structure dispose d&apos;un espace strictement séparé. Le contrôle d&apos;accès (Row Level Security) garantit qu&apos;un utilisateur ne peut jamais consulter les données d&apos;une autre structure.</p>
          <h2 className="text-base font-bold">4. Hébergement et sécurité</h2>
          <p>Les données sont hébergées dans la région Europe chez Supabase. Les mots de passe sont gérés par Supabase Auth et ne sont jamais stockés en clair. Les accès sensibles sont journalisés.</p>
          <h2 className="text-base font-bold">5. Conservation et suppression</h2>
          <p>Les tickets et factures annulés restent visibles avec leur motif pour la traçabilité financière. Une structure peut demander la suppression de ses données dans le respect des obligations légales de conservation.</p>
          <h2 className="text-base font-bold">6. Droits</h2>
          <p>Conformément à la loi sénégalaise sur la protection des données personnelles, toute personne peut demander l&apos;accès, la rectification ou la suppression des données la concernant en s&apos;adressant à la structure qui a saisi les données.</p>
        </section>
        <Link href="/inscription" className="btn-secondary inline-flex">Retour à l&apos;accueil</Link>
      </div>
    </main>
  );
}
