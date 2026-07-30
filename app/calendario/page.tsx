import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendario" };

export default function CalendarioPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Calendario</h1>
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Partite e risultati arriveranno qui dopo il seed del calendario.
      </div>
    </main>
  );
}
