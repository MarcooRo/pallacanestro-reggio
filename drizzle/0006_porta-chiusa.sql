-- Chiude l'API REST di Supabase sullo schema public.
--
-- Il buco (verificato in produzione il 05/08/2026): Supabase espone lo schema
-- public via PostgREST e per default concede TUTTO ai ruoli anon e
-- authenticated. Con la chiave pubblicabile — che sta nel bundle del browser —
-- una GET su /rest/v1/profiles rispondeva 200 coi profili veri e una DELETE
-- rispondeva 204: chiunque poteva leggere e cancellare i dati.
--
-- L'app non passa MAI da PostgREST: legge e scrive con Drizzle sul ruolo
-- postgres (che ha BYPASSRLS), e del client Supabase usa solo l'auth, che
-- vive nello schema auth. Quindi qui si può chiudere tutto senza toccare
-- l'applicazione. Resta la regola del progetto: nessuna policy da scrivere,
-- ogni autorizzazione sta nelle server action.

-- 1) RLS attiva e nessuna policy = dall'API non passa niente. È anche quello
--    che l'advisor di Supabase pretende di vedere per smettere di allarmare.
alter table "app_settings" enable row level security;--> statement-breakpoint
alter table "attendances" enable row level security;--> statement-breakpoint
alter table "club_aliases" enable row level security;--> statement-breakpoint
alter table "clubs" enable row level security;--> statement-breakpoint
alter table "competitions" enable row level security;--> statement-breakpoint
alter table "ingestion_runs" enable row level security;--> statement-breakpoint
alter table "match_reactions" enable row level security;--> statement-breakpoint
alter table "matches" enable row level security;--> statement-breakpoint
alter table "news" enable row level security;--> statement-breakpoint
alter table "player_aliases" enable row level security;--> statement-breakpoint
alter table "player_match_stats" enable row level security;--> statement-breakpoint
alter table "player_stints" enable row level security;--> statement-breakpoint
alter table "players" enable row level security;--> statement-breakpoint
alter table "points_ledger" enable row level security;--> statement-breakpoint
alter table "prediction_answers" enable row level security;--> statement-breakpoint
alter table "predictions" enable row level security;--> statement-breakpoint
alter table "profiles" enable row level security;--> statement-breakpoint
alter table "push_subscriptions" enable row level security;--> statement-breakpoint
alter table "reconciliation_queue" enable row level security;--> statement-breakpoint
alter table "roar_buckets" enable row level security;--> statement-breakpoint
alter table "team_seasons" enable row level security;--> statement-breakpoint
alter table "vote_tallies" enable row level security;--> statement-breakpoint
alter table "votes" enable row level security;--> statement-breakpoint

-- 2) Le viste non hanno RLS: senza security_invoker girerebbero coi privilegi
--    del proprietario (postgres) e resterebbero una finestra aperta sui dati.
alter view "v_leaderboard_performance" set (security_invoker = on);--> statement-breakpoint
alter view "v_leaderboard_favorite" set (security_invoker = on);--> statement-breakpoint
alter view "v_player_season_stats" set (security_invoker = on);--> statement-breakpoint

-- 3) Via i privilegi concessi per default: tabelle e viste, sequenze,
--    funzioni. Da qui l'API non ha più nemmeno il permesso di provarci.
revoke all on all tables in schema public from anon, authenticated;--> statement-breakpoint
revoke all on all sequences in schema public from anon, authenticated;--> statement-breakpoint
revoke all on all functions in schema public from anon, authenticated;--> statement-breakpoint

-- 4) E per gli oggetti che verranno: senza questo la prossima tabella
--    nascerebbe di nuovo con "tutto a tutti".
alter default privileges in schema public revoke all on tables from anon, authenticated;--> statement-breakpoint
alter default privileges in schema public revoke all on sequences from anon, authenticated;--> statement-breakpoint
alter default privileges in schema public revoke all on functions from anon, authenticated;
