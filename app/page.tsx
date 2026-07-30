import { branding } from "@/src/branding";
import { getProfilo } from "@/src/lib/auth/session";

export default async function HomePage() {
  const profilo = await getProfilo();

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">
          {profilo ? `Ciao, ${profilo.nickname}` : branding.tagline}
        </h1>
        <p className="mt-1 text-sm text-muted">
          A fine partita si vota il migliore in campo. La pagella della curva
          arriva in Fase 2.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Qui compariranno la prossima partita e la scheda di voto.
      </div>
    </main>
  );
}
