import type { Metadata } from "next";

export const metadata: Metadata = { title: "Giocatori" };

export default function GiocatoriPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Giocatori</h1>
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Il roster comparirà qui dopo il seed. Le schede complete con le
        statistiche arrivano in Fase 3.
      </div>
    </main>
  );
}
