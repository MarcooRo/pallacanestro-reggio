import Link from "next/link";
import { redirect } from "next/navigation";

import { NotifichePush } from "@/src/components/notifiche-push";
import { esci } from "@/src/lib/auth/actions";
import { getProfilo, getUtente } from "@/src/lib/auth/session";
import { getPuntiUtente } from "@/src/lib/pronostici/queries";

export default async function ProfiloPage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  const utente = await getUtente();
  const { password } = await searchParams;

  if (!utente) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5 px-4 py-10 text-center">
        <h1 className="display text-4xl">Profilo</h1>
        <p className="text-sm text-muted">
          Accedi per votare il migliore in campo e comparire nelle classifiche.
        </p>
        <Link
          href="/accesso"
          className="taglio-sm display bg-brand px-4 py-3 text-xl text-on-brand transition-colors hover:bg-brand-hover"
        >
          Entra
        </Link>
      </main>
    );
  }

  const profilo = await getProfilo();
  if (!profilo) redirect("/benvenuto");

  // I punti sono un dato personale: si leggono qui e in nessun altro posto.
  const punti = await getPuntiUtente(profilo.id);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="display text-4xl">
        {profilo.nickname}
        <span className="text-brand-vivid">.</span>
      </h1>

      {/* Rientro dal recupero password: si dice che è andata */}
      {password && (
        <p className="border-l-2 border-brand-vivid bg-brand-tint px-3 py-2 text-sm text-brand-vivid">
          Password aggiornata.
        </p>
      )}

      <dl className="flex flex-col gap-3 border-l-2 border-brand pl-4">
        <div>
          <dt className="eyebrow">Nickname</dt>
          <dd className="font-bold">{profilo.nickname}</dd>
        </div>
        <div>
          <dt className="eyebrow">Email</dt>
          <dd className="font-bold">{utente.email}</dd>
        </div>
        <div>
          <dt className="eyebrow">Punti</dt>
          <dd className="score text-lg font-bold tabular-nums">{punti}</dd>
        </div>
      </dl>

      <NotifichePush />

      {profilo.role === "admin" && (
        <Link
          href="/admin"
          className="taglio-sm display bg-brand px-4 py-2.5 text-center text-lg text-on-brand transition-colors hover:bg-brand-hover"
        >
          Pannello admin
        </Link>
      )}

      <form action={esci}>
        <button
          type="submit"
          className="taglio-sm w-full border border-border px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-muted transition-colors hover:border-brand hover:text-foreground"
        >
          Esci
        </button>
      </form>
    </main>
  );
}
