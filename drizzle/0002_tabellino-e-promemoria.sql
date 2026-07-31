ALTER TABLE "matches" ADD COLUMN "vote_closing_notified_at" timestamp with time zone;--> statement-breakpoint
-- Statistiche di stagione derivate da player_match_stats: unica fonte di
-- verità una volta ingerito il tabellino (la scheda giocatore usa questa
-- vista e ricade sull'API live solo se vuota).
create or replace view v_player_season_stats as
select pms.player_id,
       c.season_year,
       c.type_code,
       c.id as competition_id,
       count(*)::int as partite,
       count(*) filter (where pms.starter)::int as quintetti,
       coalesce(sum(pms.points), 0)::int as punti,
       coalesce(sum(pms.minutes), 0)::numeric(6,1) as minuti,
       coalesce(sum(pms.fg2m), 0)::int as fg2m,
       coalesce(sum(pms.fg2a), 0)::int as fg2a,
       coalesce(sum(pms.fg3m), 0)::int as fg3m,
       coalesce(sum(pms.fg3a), 0)::int as fg3a,
       coalesce(sum(pms.ftm), 0)::int as ftm,
       coalesce(sum(pms.fta), 0)::int as fta,
       coalesce(sum(pms.dunks), 0)::int as dunks,
       coalesce(sum(pms.reb_off), 0)::int as reb_off,
       coalesce(sum(pms.reb_def), 0)::int as reb_def,
       coalesce(sum(pms.assists), 0)::int as assists,
       coalesce(sum(pms.steals), 0)::int as steals,
       coalesce(sum(pms.turnovers), 0)::int as turnovers,
       coalesce(sum(pms.blocks), 0)::int as blocks,
       coalesce(sum(pms.blocks_received), 0)::int as blocks_received,
       coalesce(sum(pms.fouls_committed), 0)::int as fouls_committed,
       coalesce(sum(pms.fouls_received), 0)::int as fouls_received,
       coalesce(sum(pms.rating), 0)::numeric(7,1) as rating,
       coalesce(avg(pms.oer), 0)::numeric(6,4) as oer,
       coalesce(max(pms.points), 0)::int as punti_max,
       coalesce(max(pms.rating), 0)::numeric(5,1) as rating_max
from player_match_stats pms
join matches m on m.id = pms.match_id and m.status = 'finished'
join competitions c on c.id = m.competition_id
group by pms.player_id, c.id, c.season_year, c.type_code;
