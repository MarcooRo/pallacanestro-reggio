import Link from "next/link";

import { InstallaApp } from "@/src/components/installa-app";
import { NotifichePush } from "@/src/components/notifiche-push";
import { isAdmin } from "@/src/lib/identita/admin";
import { aggiornaNickname } from "@/src/lib/identita/azioni";
import { getProfilo } from "@/src/lib/identita/sessione";
import { getPuntiUtente } from "@/src/lib/pronostici/queries";

// Il profilo dell'identità anonima: nessun account, nessuna email. Il
// nickname è facoltativo e serve solo a comparire con un nome nelle
// classifiche; i punti sono un dato personale e si leggono solo qui.

export default async function ProfiloPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  const [profilo, admin] = await Promise.all([getProfilo(), isAdmin()]);
  const { errore } = await searchParams;
  const punti = profilo ? await getPuntiUtente(profilo.id) : 0;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="display text-4xl">
        {profilo?.nickname ?? "Il tuo profilo"}
        <span className="text-brand-vivid">.</span>
      </h1>

      <p className="text-sm text-muted">
        Qui non c&apos;è nessun account: questo dispositivo è la tua identità.
        Voti e pronostici restano privati, si vedono solo gli aggregati — e il
        nickname compare in classifica solo se lo scegli. I dettagli sono
        nella pagina{" "}
        <Link href="/privacy" className="text-brand-vivid underline">
          privacy
        </Link>
        .
      </p>

      {errore && (
        <p className="border-l-2 border-brand-vivid bg-brand-tint px-3 py-2 text-sm text-brand-vivid">
          {errore}
        </p>
      )}

      <form action={aggiornaNickname} className="flex flex-col gap-3">
        <label className="eyebrow" htmlFor="nickname">
          Nickname
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          required
          minLength={3}
          maxLength={20}
          autoComplete="off"
          defaultValue={profilo?.nickname ?? ""}
          placeholder="Come vuoi comparire in classifica"
          className="taglio-sm border border-border-strong bg-surface-2 px-3 py-3 outline-none transition-colors focus:border-brand-vivid"
        />
        <button
          type="submit"
          className="taglio-sm display bg-brand px-4 py-3 text-xl text-on-brand transition-colors hover:bg-brand-hover"
        >
          {profilo?.nickname ? "Cambia" : "Salva"}
        </button>
      </form>

      {profilo && (
        <dl className="flex flex-col gap-3 border-l-2 border-brand pl-4">
          <div>
            <dt className="eyebrow">Punti</dt>
            <dd className="score text-lg font-bold tabular-nums">{punti}</dd>
          </div>
        </dl>
      )}

      {/* Prima l'installazione, poi le notifiche: su iPhone le push
          esistono solo dentro l'app aggiunta alla Home */}
      <InstallaApp />

      <NotifichePush />

      {admin && (
        <Link
          href="/admin"
          className="taglio-sm display bg-brand px-4 py-2.5 text-center text-lg text-on-brand transition-colors hover:bg-brand-hover"
        >
          Pannello admin
        </Link>
      )}
    </main>
  );
}
