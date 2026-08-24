// Gli articoli nostri: lista raggruppata per stato, bozze in cima.
// Chi non è admin riceve 404, non 403: la pagina non deve nemmeno
// dichiarare di esistere.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { richiediAdmin } from "@/src/lib/identita/admin";
import { dataOra } from "@/src/lib/date";
import { numeroParole } from "@/src/lib/news/blocchi";
import {
  NOME_STATO_ARTICOLO,
  ORDINE_STATI_ARTICOLO,
} from "@/src/lib/news/etichette";
import { elencaArticoli, type Articolo } from "@/src/lib/news/redazione";

export const metadata: Metadata = { title: "Admin · Articoli" };

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ esito?: string }>;
}) {
  await richiediAdmin();

  const { esito } = await searchParams;
  const articoli = await elencaArticoli();
  const perStato = new Map<string, Articolo[]>();
  for (const a of articoli) {
    const lista = perStato.get(a.status) ?? [];
    lista.push(a);
    perStato.set(a.status, lista);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 lg:max-w-2xl">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Admin · Articoli</h1>
        <Link href="/admin" className="text-sm font-semibold text-muted hover:text-brand">
          ← Admin
        </Link>
      </div>
      <p className="text-sm text-muted">
        Gli articoli scritti dall&apos;AI arrivano qui come bozze: si leggono,
        si correggono e si pubblicano da questa pagina, mai da fuori. In pagina
        portano la nota «Generato in parte con AI».
      </p>

      {esito && (
        <p className="rounded-md bg-brand-tint px-3 py-2 text-sm font-semibold text-brand">
          {esito}
        </p>
      )}

      {articoli.length === 0 && (
        <p className="rounded-md border border-border p-4 text-sm text-muted">
          Nessun articolo nostro, per ora.
        </p>
      )}

      {ORDINE_STATI_ARTICOLO.filter((s) => perStato.has(s)).map((stato) => (
        <section key={stato} className="flex flex-col gap-2">
          <h2 className="text-sm font-black uppercase tracking-wide">
            {NOME_STATO_ARTICOLO[stato]}
          </h2>
          <div className="flex flex-col gap-2">
            {perStato.get(stato)!.map((a) => (
              <RigaArticolo key={a.id} articolo={a} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function RigaArticolo({ articolo }: { articolo: Articolo }) {
  return (
    <Link
      href={`/admin/news/${articolo.id}`}
      className="flex items-center gap-3 rounded-md border border-border p-2 hover:bg-surface"
    >
      {articolo.imageUrl ? (
        <Image
          src={articolo.imageUrl}
          alt=""
          width={72}
          height={54}
          className="h-[54px] w-[72px] shrink-0 rounded-sm border border-border object-cover"
        />
      ) : (
        <div className="flex h-[54px] w-[72px] shrink-0 items-center justify-center rounded-sm border border-border text-xs text-muted">
          —
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* titolo intero a capo, mai troncato coi puntini */}
        <p className="text-sm leading-snug font-semibold">{articolo.title}</p>
        <p className="text-xs text-muted">
          {articolo.category ? `${articolo.category} · ` : ""}
          {articolo.body ? `${numeroParole(articolo.body)} parole` : "senza corpo"}
          {articolo.isPinned ? " · in evidenza" : ""}
          {` · ${dataOra(articolo.updatedAt)}`}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted">{articolo.status}</span>
    </Link>
  );
}
