@AGENTS.md

# Convenzioni

La specifica completa è in PROJECT_RE.md: leggila prima di implementare.

- Italiano nei commenti e nei messaggi di commit
- Ogni accesso al DB passa da server action tipizzate (il DB è il Postgres della VPS dal 23/08/2026; le note RLS/Supabase valevano per il vecchio hosting)
- Niente account utente: l'identità è il cookie firmato di src/lib/identita (rev. 24/08/2026 in PROJECT_RE.md). Non reintrodurre login/registrazione per i tifosi
- Ogni autorizzazione (partecipazione, admin) va nella server action, sempre: ottieniOCreaProfilo() per i gesti dei tifosi, richiediAdmin() per il pannello
- Nessun id LBA (competizioni, squadre) scritto nel codice: si risolvono a runtime
- Nomi canonici nello schema, mappatura dal vocabolario LBA solo negli adapter
- Colori solo via CSS variables, mai hardcoded
- Vietate le API proprietarie di Bun
- Commit a ogni fase completata