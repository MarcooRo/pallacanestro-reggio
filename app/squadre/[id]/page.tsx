import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import { CampoQuintetto } from "@/src/components/campo-quintetto";
import { TornaIndietro } from "@/src/components/torna-indietro";
import { getClassificaCampionato } from "@/src/lib/classifica/campionato";
import { etichettaStagione } from "@/src/lib/date";
import { fotoUrl } from "@/src/lib/immagini";
import { getQuintettoSquadra } from "@/src/lib/partite/quintetti";
import { getRosterLive, getSquadra } from "@/src/lib/squadre/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const squadra = await getSquadra(Number((await params).id));
  return squadra ? { title: squadra.displayName } : {};
}

// Scheda squadra generica (dalla classifica o dal match). Reggio ha la
// sua pagina ricca: qui si atterra solo per le avversarie.
export default async function SquadraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const lbaTeamId = Number((await params).id);
  if (!Number.isInteger(lbaTeamId)) notFound();

  const squadra = await getSquadra(lbaTeamId);
  if (!squadra) notFound();
  if (squadra.isReggio) redirect("/giocatori");

  const [roster, classifica, quintetto] = await Promise.all([
    getRosterLive(lbaTeamId),
    getClassificaCampionato(),
    getQuintettoSquadra(lbaTeamId),
  ]);
  const posizione = classifica?.righe.find((r) => r.lbaTeamId === lbaTeamId);
  const logo = fotoUrl(squadra.logoKey, "thumb");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6 lg:max-w-2xl">
      <TornaIndietro fallback="/classifica" etichetta="Classifica" />

      <header className="flex items-center gap-3">
        {logo && (
          <Image
            src={logo}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 object-contain"
          />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="display text-2xl">{squadra.displayName}</h1>
          <p className="eyebrow">
            {etichettaStagione(squadra.seasonYear)}
            {posizione
              ? ` · ${posizione.position}ª in classifica · ${posizione.points} pt · ${posizione.wins}V ${posizione.defeats}S`
              : ""}
          </p>
        </div>
      </header>

      {/* Stessa struttura della pagina di Reggio: prima il campo con
          l'ultimo quintetto, poi il roster */}
      {quintetto && (
        <section className="flex flex-col gap-2">
          <h2 className="display text-2xl">L&apos;ultimo quintetto</h2>
          <p className="eyebrow">{quintetto.fonte}</p>
          <div className="taglio-sm border border-border-strong">
            <CampoQuintetto titolari={quintetto.titolari} />
          </div>
        </section>
      )}

      <h2 className="display mt-2 text-2xl">Roster</h2>

      {roster.length === 0 ? (
        <p className="taglio-sm card p-4 text-sm text-muted">
          Roster non disponibile ora: la fonte non risponde, riprova tra poco.
        </p>
      ) : (
        <ul className="flex flex-col">
          {roster.map((g) => (
            <li
              key={g.lbaPlayerId}
              className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
            >
              <span className="display w-10 text-center text-2xl text-brand">
                {g.jerseyNumber ?? "–"}
              </span>
              <AvatarGiocatore
                firstName={g.firstName}
                lastName={g.lastName}
                photoKey={g.photoKey}
                dimensione={44}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-bold uppercase tracking-tight">
                  {g.firstName} {g.lastName}
                </span>
                <span className="eyebrow mt-0.5">
                  {[g.role, g.nationality].filter(Boolean).join(" · ")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
