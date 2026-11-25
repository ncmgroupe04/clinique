import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import ScreenHeader from "../screen-header";
import PrintAgentCard from "./print-agent-card";
import TestPrint from "./test-print";

export default async function AideImpressionPage() {
  await connection();
  await requireUser();

  return (
    <div className="flex flex-1 flex-col gap-[26px]">
      <div className="no-print flex flex-col gap-[26px]">
        <ScreenHeader
          title="Aide à l'impression"
          subtitle="Deux façons d'imprimer les tickets : l'agent local (recommandé) ou l'impression navigateur."
        />

        <PrintAgentCard />

        <section className="card space-y-4 text-sm leading-relaxed">
          <div>
            <h2 className="text-lg font-extrabold">Impression via le navigateur</h2>
            <p className="mt-1 text-muted">
              Utilisée automatiquement quand l&apos;agent n&apos;est pas démarré. Elle dépend du
              pilote installé sur le PC : il doit s&apos;agir d&apos;un pilote <strong>ESC/POS</strong>.
            </p>
          </div>

          <div>
            <h3 className="text-base font-extrabold">Le ticket imprime des caractères bizarres ?</h3>
            <p className="mt-1 text-muted">
              Des lignes du type <code>BITMAP 201,379,26,32,1,</code>, des caractères chinois ou une
              bande de papier interminable signifient que le pilote installé n&apos;est pas un pilote
              <strong> ESC/POS</strong> : c&apos;est souvent un pilote d&apos;étiquettes (TSPL, ZPL,
              4BARCODE…). L&apos;agent local corrige ce problème sans toucher au pilote.
            </p>
          </div>

          <div>
            <h3 className="text-base font-extrabold">Corriger le pilote sous Windows</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                Ouvrir <strong>Paramètres → Bluetooth et appareils → Imprimantes et scanners</strong>.
              </li>
              <li>
                Sélectionner l&apos;imprimante → <strong>Gestion de l&apos;imprimante</strong> →{" "}
                <strong>Propriétés de l&apos;imprimante</strong> → onglet <strong>Avancé</strong>.
              </li>
              <li>
                Vérifier le champ <strong>Pilote</strong>. Il doit s&apos;agir d&apos;un pilote{" "}
                <strong>ESC/POS</strong> (POS-80, Epson, Winpal…). S&apos;il indique 4BARCODE, TSPL ou ZPL,
                c&apos;est la cause du problème.
              </li>
              <li>
                Cliquer sur <strong>Nouveau pilote</strong> et choisir le pilote ESC/POS fourni par le
                fabricant de l&apos;imprimante.
              </li>
              <li>
                Dans <strong>Préférences d&apos;impression</strong>, régler la largeur du papier
                (<strong>80 mm</strong> ou <strong>58 mm</strong>) et les marges sur <strong>aucune</strong>.
              </li>
            </ol>
          </div>

          <div>
            <h3 className="text-base font-extrabold">Dans le dialogue d&apos;impression</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Choisir la bonne imprimante.</li>
              <li>Régler les marges sur <strong>Aucune</strong>.</li>
              <li>Laisser l&apos;échelle à <strong>100 %</strong>.</li>
            </ul>
          </div>

          <p>
            La largeur du papier se configure aussi dans{" "}
            <Link href="/reglages" className="font-semibold text-accent underline underline-offset-2">
              Réglages
            </Link>{" "}
            (58 mm, 80 mm ou A6).
          </p>
        </section>

        <p className="text-sm font-semibold text-muted">
          Imprimez le ticket de test ci-dessous après avoir changé le pilote :
        </p>
      </div>

      <TestPrint />
    </div>
  );
}
