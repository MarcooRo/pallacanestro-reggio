// I migliori della partita, calcolati sul tabellino di ENTRAMBE le
// squadre: se il migliore è un avversario, tessera all'avversario.

import { TesseraMigliore } from "@/src/components/tessera-migliore";
import type { RigaTabellino } from "@/src/lib/partite/queries";

// In una singola partita una percentuale sotto questa soglia di
// tentativi non dice niente (un 1/1 varrebbe 100%).
const MIN_TENTATIVI = 4;

export function MiglioriPartita({
  righe,
  nomeCasa,
  nomeOspiti,
}: {
  righe: RigaTabellino[];
  nomeCasa: string;
  nomeOspiti: string;
}) {
  const inCampo = righe.filter((r) => Number(r.minutes ?? 0) > 0);
  if (inCampo.length === 0) return null;

  const squadra = (r: RigaTabellino) => (r.lato === "home" ? nomeCasa : nomeOspiti);
  const top = (valore: (r: RigaTabellino) => number) =>
    [...inCampo].sort((a, b) => valore(b) - valore(a))[0];
  const topPercentuale = (fatti: "fg2m" | "fg3m", tentati: "fg2a" | "fg3a") =>
    inCampo
      .filter((r) => (r[tentati] ?? 0) >= MIN_TENTATIVI)
      .sort(
        (a, b) => (b[fatti] ?? 0) / (b[tentati] ?? 1) - (a[fatti] ?? 0) / (a[tentati] ?? 1),
      )[0] ?? null;

  const punti = top((r) => r.points ?? 0);
  const rimbalzi = top((r) => (r.reb_off ?? 0) + (r.reb_def ?? 0));
  const assist = top((r) => r.assists ?? 0);
  const valutazione = top((r) => Number(r.rating ?? 0));
  const tiri2 = topPercentuale("fg2m", "fg2a");
  const tiri3 = topPercentuale("fg3m", "fg3a");

  const pct = (fatti: number | null, tentati: number | null) =>
    `${Math.round(((fatti ?? 0) / (tentati || 1)) * 100)}%`;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="display text-2xl">I migliori</h2>
      <div className="grid grid-cols-3 gap-2.5">
        <TesseraMigliore etichetta="Punti" valore={String(punti.points ?? 0)} firstName={punti.first_name} lastName={punti.last_name} photoKey={punti.photo_key} sotto={squadra(punti)} />
        <TesseraMigliore etichetta="Rimbalzi" valore={String((rimbalzi.reb_off ?? 0) + (rimbalzi.reb_def ?? 0))} firstName={rimbalzi.first_name} lastName={rimbalzi.last_name} photoKey={rimbalzi.photo_key} sotto={squadra(rimbalzi)} />
        <TesseraMigliore etichetta="Assist" valore={String(assist.assists ?? 0)} firstName={assist.first_name} lastName={assist.last_name} photoKey={assist.photo_key} sotto={squadra(assist)} />
        <TesseraMigliore etichetta="Valutazione" valore={String(Number(valutazione.rating ?? 0))} firstName={valutazione.first_name} lastName={valutazione.last_name} photoKey={valutazione.photo_key} sotto={squadra(valutazione)} />
        {tiri2 && (
          <TesseraMigliore etichetta="Tiri da 2" valore={pct(tiri2.fg2m, tiri2.fg2a)} firstName={tiri2.first_name} lastName={tiri2.last_name} photoKey={tiri2.photo_key} sotto={squadra(tiri2)} />
        )}
        {tiri3 && (
          <TesseraMigliore etichetta="Tiri da 3" valore={pct(tiri3.fg3m, tiri3.fg3a)} firstName={tiri3.first_name} lastName={tiri3.last_name} photoKey={tiri3.photo_key} sotto={squadra(tiri3)} />
        )}
      </div>
    </section>
  );
}
