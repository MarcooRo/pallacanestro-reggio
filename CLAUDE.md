@AGENTS.md

# Convenzioni

La specifica completa è in PROJECT-RE.md: leggila prima di implementare.

- Italiano nei commenti e nei messaggi di commit
- Niente RLS: ogni accesso al DB passa da server action tipizzate
- proxy.ts SOLO refresh sessione. Mai controlli di ruolo o autorizzazione (cfr. CVE-2025-29927)
- Ogni autorizzazione (voto, admin) va nella server action, sempre
- Nessun id LBA (competizioni, squadre) scritto nel codice: si risolvono a runtime
- Nomi canonici nello schema, mappatura dal vocabolario LBA solo negli adapter
- Colori solo via CSS variables, mai hardcoded
- Vietate le API proprietarie di Bun
- Commit a ogni fase completata