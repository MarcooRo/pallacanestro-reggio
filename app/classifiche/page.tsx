import type { Metadata } from "next";

export const metadata: Metadata = { title: "Classifiche" };

export default function ClassifichePage() {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Classifiche</h1>
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Performance e Preferito, per mese, girone e stagione. Arrivano con la
        Fase 2, insieme al voto.
      </div>
    </main>
  );
}
