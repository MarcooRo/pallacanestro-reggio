@AGENTS.md

# Convenzioni

La specifica completa è in PROJECT_RE.md: leggila prima di implementare.

- Italiano nei commenti e nei messaggi di commit
- Niente policy RLS: ogni accesso al DB passa da server action tipizzate
- Lo schema public resta però CHIUSO all'API REST di Supabase: RLS attiva senza policy e privilegi revocati a anon/authenticated (migrazione 0006). Una tabella nuova non va lasciata aperta: se serve, riabilita RLS anche su quella
- proxy.ts SOLO refresh sessione. Mai controlli di ruolo o autorizzazione (cfr. CVE-2025-29927)
- Ogni autorizzazione (voto, admin) va nella server action, sempre
- Nessun id LBA (competizioni, squadre) scritto nel codice: si risolvono a runtime
- Nomi canonici nello schema, mappatura dal vocabolario LBA solo negli adapter
- Colori solo via CSS variables, mai hardcoded
- Vietate le API proprietarie di Bun
- Commit a ogni fase completata