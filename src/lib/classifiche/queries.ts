// Classifiche Performance e Preferito su finestra arbitraria
// (PROJECT_RE.md, sezione 4): aggregano le viste v_leaderboard_*.

import { sql, type SQL } from "drizzle-orm";

import { db } from "@/src/db";

export interface FiltroClassifica {
  seasonYear: number;
  typeCode?: string; // 'RS' | 'PO' | ... (competizione)
  phaseId?: number; // 1 = andata, 2 = ritorno (girone)
  mese?: string; // 'yyyy-mm-01'
}

export type RigaClassificaPerformance = {
  player_id: string;
  first_name: string;
  last_name: string;
  photo_key: string | null;
  punti: number;
  best: number;
  support: number;
  partite: number;
}

export type RigaClassificaPreferito = {
  player_id: string;
  first_name: string;
  last_name: string;
  photo_key: string | null;
  preferenze: number;
  partite: number;
}

function condizioni(vista: string, f: FiltroClassifica): SQL {
  const clausole = [sql`season_year = ${f.seasonYear}`];
  if (f.typeCode) clausole.push(sql`type_code = ${f.typeCode}`);
  if (f.phaseId) clausole.push(sql`phase_id = ${f.phaseId}`);
  if (f.mese) clausole.push(sql`mese = ${f.mese}::date`);
  return sql.join(clausole, sql` and `);
}

export async function classificaPerformance(
  f: FiltroClassifica,
): Promise<RigaClassificaPerformance[]> {
  const righe = await db.execute<RigaClassificaPerformance>(sql`
    select player_id, first_name, last_name, photo_key,
           sum(performance_points)::int as punti,
           sum(best_count)::int as best,
           sum(support_count)::int as support,
           count(distinct match_id)::int as partite
    from v_leaderboard_performance
    where ${condizioni("performance", f)}
    group by player_id, first_name, last_name, photo_key
    -- parità (sezione 4): più punti, poi più Best, poi più voti totali
    order by punti desc, best desc, (sum(best_count) + sum(support_count)) desc
  `);
  return [...righe];
}

export async function classificaPreferito(
  f: FiltroClassifica,
): Promise<RigaClassificaPreferito[]> {
  const righe = await db.execute<RigaClassificaPreferito>(sql`
    select player_id, first_name, last_name, photo_key,
           sum(favorite_count)::int as preferenze,
           count(distinct match_id)::int as partite
    from v_leaderboard_favorite
    where ${condizioni("favorite", f)}
    group by player_id, first_name, last_name, photo_key
    order by preferenze desc
  `);
  return [...righe];
}

// I mesi con almeno una pagella pubblicata, per il filtro.
export async function mesiDisponibili(seasonYear: number): Promise<string[]> {
  const righe = await db.execute<{ mese: string }>(sql`
    select distinct mese::text as mese from v_leaderboard_performance
    where season_year = ${seasonYear} order by mese
  `);
  return [...righe].map((r) => r.mese);
}

// Le stagioni con almeno una pagella pubblicata.
export async function stagioniConDati(): Promise<number[]> {
  const righe = await db.execute<{ season_year: number }>(sql`
    select distinct season_year from v_leaderboard_performance
    order by season_year desc
  `);
  return [...righe].map((r) => r.season_year);
}

// Le competizioni con pagelle nella stagione, per il filtro.
export async function competizioniDisponibili(
  seasonYear: number,
): Promise<{ typeCode: string; name: string }[]> {
  const righe = await db.execute<{ type_code: string; name: string }>(sql`
    select distinct type_code, competition_name as name
    from v_leaderboard_performance
    where season_year = ${seasonYear}
    order by name
  `);
  return [...righe].map((r) => ({ typeCode: r.type_code, name: r.name }));
}
