-- Fase 2 — Il voto: funzione dei votabili e viste per le classifiche.
-- SQL scritta a mano (migrazione custom): Drizzle gestisce le tabelle,
-- funzioni e viste vivono qui.

-- Giocatori votabili per una partita (PROJECT_RE.md, sezione 4):
-- quelli a referto se il tabellino è disponibile, altrimenti quelli il cui
-- player_stints copre la data della partita. Mai il roster corrente
-- applicato retroattivamente. Ritorna vuoto se il club di casa non gioca.
create or replace function eligible_voters(p_match_id uuid)
returns table (
  player_id uuid,
  first_name text,
  last_name text,
  photo_key text,
  jersey_number text,
  role text,
  from_boxscore boolean
)
language sql stable
as $$
with partita as (
  select m.id,
         (m.starts_at at time zone 'Europe/Rome')::date as giorno,
         case when hc.is_home_club then m.home_team_season_id
              when ac.is_home_club then m.away_team_season_id
         end as ts_casa
  from matches m
  join team_seasons hts on hts.id = m.home_team_season_id
  join clubs hc on hc.id = hts.club_id
  join team_seasons ats on ats.id = m.away_team_season_id
  join clubs ac on ac.id = ats.club_id
  where m.id = p_match_id
),
-- permanenze valide alla data della partita (una riga per giocatore)
permanenze as (
  select distinct on (p.id)
         p.id as player_id, p.first_name, p.last_name, p.photo_key,
         st.jersey_number, st.role
  from partita pa
  join player_stints st on st.team_season_id = pa.ts_casa
  join players p on p.id = st.player_id
  where st.start_date <= pa.giorno
    and (st.end_date is null or st.end_date >= pa.giorno)
  order by p.id, st.start_date desc
),
-- a referto: dal tabellino, limitato ai giocatori del club di casa
-- (in futuro player_match_stats potrà contenere anche gli avversari)
referto as (
  select distinct on (p.id)
         p.id as player_id, p.first_name, p.last_name, p.photo_key,
         st.jersey_number, st.role
  from player_match_stats pms
  join players p on p.id = pms.player_id
  cross join partita pa
  join player_stints st on st.player_id = p.id and st.team_season_id = pa.ts_casa
  where pms.match_id = p_match_id
  order by p.id, st.start_date desc
)
select r.*, true as from_boxscore from referto r
union all
select pe.*, false as from_boxscore from permanenze pe
where not exists (select 1 from referto);
$$;
--> statement-breakpoint

-- Una riga per giocatore × partita pubblicata, con le dimensioni di
-- finestra già pronte (mese, fase, competizione, stagione): le pagine
-- aggregano con WHERE. Espone SOLO partite 'tallied': i conteggi restano
-- invisibili finché la votazione non è chiusa.
create or replace view v_leaderboard_performance as
select vt.player_id,
       p.first_name, p.last_name, p.photo_key,
       m.id as match_id, m.starts_at, m.phase_id,
       (date_trunc('month', m.starts_at at time zone 'Europe/Rome'))::date as mese,
       c.id as competition_id, c.season_year, c.type_code,
       c.name as competition_name,
       vt.best_count, vt.support_count, vt.performance_points
from vote_tallies vt
join matches m on m.id = vt.match_id and m.voting_state = 'tallied'
join competitions c on c.id = m.competition_id
join players p on p.id = vt.player_id;
--> statement-breakpoint

create or replace view v_leaderboard_favorite as
select vt.player_id,
       p.first_name, p.last_name, p.photo_key,
       m.id as match_id, m.starts_at, m.phase_id,
       (date_trunc('month', m.starts_at at time zone 'Europe/Rome'))::date as mese,
       c.id as competition_id, c.season_year, c.type_code,
       c.name as competition_name,
       vt.favorite_count
from vote_tallies vt
join matches m on m.id = vt.match_id and m.voting_state = 'tallied'
join competitions c on c.id = m.competition_id
join players p on p.id = vt.player_id
where vt.favorite_count > 0;
