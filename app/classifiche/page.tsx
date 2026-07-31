import type { Metadata } from "next";
import Link from "next/link";

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import {
  classificaPerformance,
  classificaPreferito,
  competizioniDisponibili,
  mesiDisponibili,
  stagioniConDati,
} from "@/src/lib/classifiche/queries";
import { etichettaStagione, nomeMese } from "@/src/lib/date";

export const metadata: Metadata = { title: "Classifiche" };

interface Filtri {
  tab: "performance" | "preferito";
  s?: string;
  c?: string;
  g?: string;
  m?: string;
}

// Link di filtro che preserva gli altri parametri.
function urlFiltri(f: Filtri, patch: Partial<Filtri>): string {
  const query = new URLSearchParams();
  const finale = { ...f, ...patch };
  for (const [k, v] of Object.entries(finale)) {
    if (v) query.set(k, String(v));
  }
  return `/classifiche?${query.toString()}`;
}

function Pillola({
  href,
  attiva,
  children,
}: {
  href: string;
  attiva: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm font-semibold ${
        attiva
          ? "bg-brand text-on-brand"
          : "border border-border text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function ClassifichePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const stagioni = await stagioniConDati();

  if (stagioni.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-bold">Classifiche</h1>
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          Le classifiche nascono dalle pagelle: appena si chiude la prima
          votazione, qui compaiono Performance e Preferito.
        </p>
      </main>
    );
  }

  const filtri: Filtri = {
    tab: sp.tab === "preferito" ? "preferito" : "performance",
    s: sp.s,
    c: sp.c,
    g: sp.g,
    m: sp.m,
  };
  const stagione = stagioni.includes(Number(filtri.s)) ? Number(filtri.s) : stagioni[0];

  const [competizioni, mesi] = await Promise.all([
    competizioniDisponibili(stagione),
    mesiDisponibili(stagione),
  ]);

  const filtro = {
    seasonYear: stagione,
    typeCode: filtri.c || undefined,
    phaseId: filtri.g ? Number(filtri.g) : undefined,
    mese: filtri.m || undefined,
  };

  const righe =
    filtri.tab === "preferito"
      ? await classificaPreferito(filtro)
      : await classificaPerformance(filtro);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Classifiche</h1>

      {/* Performance / Preferito */}
      <div className="flex gap-2">
        <Pillola
          href={urlFiltri(filtri, { tab: "performance" })}
          attiva={filtri.tab === "performance"}
        >
          Performance
        </Pillola>
        <Pillola
          href={urlFiltri(filtri, { tab: "preferito" })}
          attiva={filtri.tab === "preferito"}
        >
          Preferito
        </Pillola>
      </div>

      {/* Finestre */}
      <div className="flex flex-wrap gap-2">
        {stagioni.map((anno) => (
          <Pillola
            key={anno}
            href={urlFiltri(filtri, { s: String(anno), m: undefined, g: undefined, c: undefined })}
            attiva={anno === stagione}
          >
            {etichettaStagione(anno)}
          </Pillola>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Pillola href={urlFiltri(filtri, { g: undefined, m: undefined })} attiva={!filtri.g && !filtri.m}>
          Tutta la stagione
        </Pillola>
        <Pillola href={urlFiltri(filtri, { g: "1", m: undefined })} attiva={filtri.g === "1"}>
          Andata
        </Pillola>
        <Pillola href={urlFiltri(filtri, { g: "2", m: undefined })} attiva={filtri.g === "2"}>
          Ritorno
        </Pillola>
        {mesi.map((mese) => (
          <Pillola
            key={mese}
            href={urlFiltri(filtri, { m: mese, g: undefined })}
            attiva={filtri.m === mese}
          >
            {nomeMese(mese)}
          </Pillola>
        ))}
      </div>
      {competizioni.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Pillola href={urlFiltri(filtri, { c: undefined })} attiva={!filtri.c}>
            Tutte le competizioni
          </Pillola>
          {competizioni.map((c) => (
            <Pillola
              key={c.typeCode}
              href={urlFiltri(filtri, { c: c.typeCode })}
              attiva={filtri.c === c.typeCode}
            >
              {c.name}
            </Pillola>
          ))}
        </div>
      )}

      {/* Classifica */}
      {righe.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          Nessuna pagella in questa finestra.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {righe.map((r, i) => (
            <li
              key={r.player_id}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                i === 0 ? "border-brand bg-brand-tint" : "border-border"
              }`}
            >
              <span className="w-5 text-center text-sm font-bold text-muted">{i + 1}</span>
              <AvatarGiocatore
                firstName={r.first_name}
                lastName={r.last_name}
                photoKey={r.photo_key}
              />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {r.first_name} {r.last_name}
              </span>
              <span className="text-xs text-muted">
                {"best" in r
                  ? `${r.best}× migliore · ${r.partite} partite`
                  : `${r.partite} partite`}
              </span>
              <span className="text-lg font-bold tabular-nums text-brand">
                {"punti" in r ? r.punti : r.preferenze}
              </span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
