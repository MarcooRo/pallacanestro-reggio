// Sezione classifiche (Performance/Preferito con le finestre temporali),
// server component. Vive dentro /voto: i link dei filtri puntano lì.
// Era la pagina /classifiche, che ora reindirizza.

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import { Pillola } from "@/src/components/pillola";
import { SelettoreStagione } from "@/src/components/selettore-stagione";
import {
  classificaPerformance,
  classificaPreferito,
  competizioniDisponibili,
  mesiDisponibili,
  stagioniConDati,
} from "@/src/lib/classifiche/queries";
import { etichettaStagione, nomeMese } from "@/src/lib/date";

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
  return `/voto?${query.toString()}`;
}

export async function ClassificheSezione({
  sp,
}: {
  sp: Record<string, string | undefined>;
}) {
  const stagioni = await stagioniConDati();

  if (stagioni.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="display text-2xl">Classifiche</h2>
        <p className="taglio-sm card p-4 text-sm text-muted">
          Le classifiche nascono dalle pagelle: appena si chiude la prima
          votazione, qui compaiono Performance e Preferito.
        </p>
      </section>
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

  const massimo = righe.length
    ? Math.max(...righe.map((r) => ("punti" in r ? r.punti : r.preferenze)))
    : 0;

  // Etichetta della finestra temporale scelta: è il titolo del filtro a
  // scomparsa, così da chiuso si sa comunque cosa si sta guardando.
  const periodo = filtri.m
    ? nomeMese(filtri.m)
    : filtri.g === "1"
      ? "Andata"
      : filtri.g === "2"
        ? "Ritorno"
        : "Stagione";
  const periodoRistretto = Boolean(filtri.g || filtri.m);

  return (
    <section className="flex flex-col gap-4">
      {/* La stagione vive sulla riga del titolo: da mobile i filtri
          scendevano a quattro righe */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="display text-2xl">Classifiche</h2>
        {stagioni.length > 1 ? (
          <SelettoreStagione
            attiva={String(stagione)}
            opzioni={stagioni.map((anno) => ({
              valore: String(anno),
              etichetta: etichettaStagione(anno),
              href: urlFiltri(filtri, {
                s: String(anno),
                m: undefined,
                g: undefined,
                c: undefined,
              }),
            }))}
          />
        ) : (
          <span className="eyebrow">{etichettaStagione(stagione)}</span>
        )}
      </div>

      {/* Performance / Preferito */}
      <div className="flex gap-2.5 pl-1">
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

      {/* Finestra temporale a scomparsa: aperta se si sta filtrando,
          chiusa (una riga) nel caso normale "tutta la stagione" */}
      <details open={periodoRistretto} className="group pl-1">
        <summary className="w-fit cursor-pointer list-none -skew-x-[14deg] border border-border px-3 py-1.5 transition-colors hover:border-brand [&::-webkit-details-marker]:hidden">
          <span className="flex skew-x-[14deg] items-center gap-2 text-xs font-black uppercase tracking-wide">
            <span className="text-muted">Periodo</span>
            <span className={periodoRistretto ? "text-brand-vivid" : "text-foreground"}>
              {periodo}
            </span>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-3 w-3 text-muted transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          <Pillola href={urlFiltri(filtri, { g: undefined, m: undefined })} attiva={!filtri.g && !filtri.m}>
            Stagione
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
      </details>

      {competizioni.length > 1 && (
        <div className="flex flex-wrap gap-2.5 pl-1">
          <Pillola href={urlFiltri(filtri, { c: undefined })} attiva={!filtri.c}>
            Tutte
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

      {/* Classifica: la barra rossa è il dato */}
      {righe.length === 0 ? (
        <p className="taglio-sm card p-4 text-sm text-muted">
          Nessuna pagella in questa finestra.
        </p>
      ) : (
        <ol className="flex flex-col">
          {righe.map((r, i) => {
            const valore = "punti" in r ? r.punti : r.preferenze;
            const quota = massimo > 0 ? Math.max(4, (valore / massimo) * 100) : 0;
            return (
              <li
                key={r.player_id}
                className="relative flex items-center gap-3 overflow-hidden border-b border-border py-3 pl-1 last:border-b-0"
              >
                {/* barra proporzionale al punteggio */}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 h-[2px] bg-brand"
                  style={{ width: `${quota}%`, opacity: i === 0 ? 1 : 0.55 }}
                />
                <span
                  className={`score w-6 text-center text-sm ${
                    i === 0 ? "font-bold text-brand-vivid" : "text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <AvatarGiocatore
                  firstName={r.first_name}
                  lastName={r.last_name}
                  photoKey={r.photo_key}
                  dimensione={i === 0 ? 44 : 36}
                />
                <span
                  className={`min-w-0 flex-1 truncate font-bold uppercase tracking-tight ${
                    i === 0 ? "text-lg" : "text-sm"
                  }`}
                >
                  {r.first_name} {r.last_name}
                </span>
                <span className="eyebrow">
                  {"best" in r ? `${r.best}×B · ${r.partite}g` : `${r.partite}g`}
                </span>
                <span
                  className={`score font-bold ${
                    i === 0 ? "text-2xl text-brand-vivid" : "text-base"
                  }`}
                >
                  {valore}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
