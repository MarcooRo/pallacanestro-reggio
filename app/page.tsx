import Link from "next/link";
import { redirect } from "next/navigation";

import { branding } from "@/src/branding";
import { getProfilo, getUtente } from "@/src/lib/auth/session";

export default async function HomePage() {
  const utente = await getUtente();

  // Loggato ma senza nickname: il profilo va completato prima di entrare.
  if (utente) {
    const profilo = await getProfilo();
    if (!profilo) redirect("/benvenuto");

    return (
      <main className="flex flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">Ciao, {profilo.nickname}</h1>
          <p className="mt-1 text-sm text-muted">
            A fine partita si vota il migliore in campo. La pagella della
            curva arriva in Fase 2.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          Qui compariranno la prossima partita e la scheda di voto.
        </div>
      </main>
    );
  }

  // Splash per chi non è loggato. Solo la home fa da vetrina: le pagine
  // pubbliche (pagelle, classifiche) restano apribili dal link condiviso,
  // come da principio "zero attrito" della spec.
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-on-brand">
          {branding.appShortName.slice(0, 1)}
        </span>
        <h1 className="text-3xl font-bold">{branding.appName}</h1>
        <p className="max-w-xs text-balance text-muted">{branding.tagline}</p>
      </div>

      <ul className="flex flex-col gap-2 text-sm text-muted">
        <li>A fine partita voti il migliore in campo</li>
        <li>I voti di tutti diventano la pagella della curva</li>
        <li>Classifiche di mese, girone e stagione</li>
      </ul>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/accesso"
          className="rounded-md bg-brand px-4 py-3 font-semibold text-on-brand hover:bg-brand-hover"
        >
          Accedi o registrati
        </Link>
        <p className="text-xs text-muted">
          Ti basta l&apos;email, niente password.
        </p>
      </div>
    </main>
  );
}
