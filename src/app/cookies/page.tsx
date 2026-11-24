import Link from "next/link";

export default function CookiesPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="card w-full max-w-3xl space-y-4">
        <h1 className="text-2xl font-extrabold text-ink">Politique des cookies</h1>
        <p className="text-sm text-muted">Dernière mise à jour : 24 novembre 2026</p>
        <section className="space-y-2 text-sm leading-relaxed text-ink">
          <h2 className="text-base font-bold">1. Cookies utilisés</h2>
          <p>La plateforme utilise uniquement des cookies techniques nécessaires à son fonctionnement : le cookie de session Supabase, qui permet de maintenir la connexion de l&apos;utilisateur, et des cookies de préférences locales (affichage). Aucun cookie publicitaire ou de suivi tiers n&apos;est déposé.</p>
          <h2 className="text-base font-bold">2. Finalité</h2>
          <p>Ces cookies servent à authentifier l&apos;utilisateur, à sécuriser les échanges et à mémoriser certaines préférences d&apos;interface. Ils sont indispensables à l&apos;utilisation du service.</p>
          <h2 className="text-base font-bold">3. Durée de vie</h2>
          <p>Le cookie de session est conservé pour la durée de la session et supprimé lors de la déconnexion. Les préférences locales peuvent rester sur l&apos;appareil jusqu&apos;à effacement par l&apos;utilisateur.</p>
          <h2 className="text-base font-bold">4. Gestion</h2>
          <p>L&apos;utilisateur peut configurer son navigateur pour refuser ou supprimer les cookies. Le refus des cookies de session empêche la connexion à la plateforme.</p>
          <h2 className="text-base font-bold">5. Contact</h2>
          <p>Pour toute question concernant les cookies, contactez l&apos;administrateur de la plateforme.</p>
        </section>
        <Link href="/inscription" className="btn-secondary inline-flex">Retour à l&apos;accueil</Link>
      </div>
    </main>
  );
}
