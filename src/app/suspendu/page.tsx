import { connection } from "next/server";
import { requireUser } from "@/lib/auth";

export default async function SuspenduPage() {
  await connection();
  await requireUser();
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="card max-w-md text-center">
        <h1 className="scr-title mb-2">Accès suspendu</h1>
        <p className="scr-sub mb-6">
          Votre structure est suspendue ou son abonnement a expiré. Veuillez contacter
          l&apos;administrateur de la plateforme pour réactiver votre compte.
        </p>
        <form action={async () => {
          "use server";
          const { logout } = await import("@/app/actions/auth");
          await logout();
        }}>
          <button type="submit" className="btn-secondary w-full">
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
