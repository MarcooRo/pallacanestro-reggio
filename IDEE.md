# Idee di engagement

Parcheggio delle idee non ancora in lavorazione. Regola trasversale: **nessun dato
utente esposto**. Tre soli livelli di visibilità ammessi, come già fa `vote_tallies`:

1. **Aggregato pubblico** — conteggi, medie, percentuali. Mai la riga individuale.
2. **Privato solo a te** — statistiche personali, visibili nel profilo e in nessun altro posto.
3. **Nickname, solo su opt-in** — unico caso in cui un utente compare (classifiche).

---

## Fatte il 03/08/2026 (dettagli in PROJECT_RE.md, sezione 5-bis)

- **Pronostici** con domande libere, risolte a mano dall'admin.
- **Io ci sono** — CTA + contatore, **spenta** dal feature flag finché gli iscritti
  non sono abbastanza.
- **Il boato** — tap ripetuto durante la gara, onda di intensità della tifoseria.
- **Reazioni al risultato** — attive con quattro reazioni provvisorie.

Decisioni ancora aperte su queste quattro:

- **Quali reazioni** tenere davvero (ora: 🔥 Che partita, ❤️ Orgoglio, 😱 Non ci credo,
  😤 Che rabbia). Si cambiano in `src/lib/reazioni/tipi.ts`, senza migrazione.
- **Quando accendere "Io ci sono"** e con quale soglia per il contatore (ora 10).
- **Formula punti Visionario** da tarare (base 10, moltiplicatore fino a 3×).
- **Il picco del boato** da correlare al play-by-play per il racconto post-partita.
- **Push "pronostico aperto"**: serve una categoria nuova in
  `push_subscriptions.categories`, altrimenti nessun iscritto la riceve.

---

## Da valutare

### Prima della partita

- **Termometro hype** — slider 0-100 "quanto ci credi", output = lancetta con la media
  della tifoseria. Un gesto, ripetibile a ogni giornata, una tabella e nient'altro.
- **Quintetto previsto** — scegli i 5 che partono, a fine gara confronto col quintetto
  reale (`sf` del tabellino, già letto da `tabellino-live.ts`). Correttezza automatica.

### Durante la partita

- **Reazioni al play-by-play** — 4 emoji sull'evento live, contatori aggregati che
  salgono in tempo reale. Dipende dal WebSocket LBA (vedi PROJECT_RE.md).
- **MVP progressivo** — aprire il voto *durante* la gara e ricalcolare il tally a ogni
  quarto: la classifica che si muove mentre si gioca tiene dentro.

### Dopo la partita

- **Voto alla partita** — 1-10 alla prestazione di squadra (e all'arbitraggio). Media
  della tifoseria come unico output.
- **Una parola per la partita** — campo da una parola sola, word cloud aggregata.
  Bellissimo da condividere, ma serve blocklist + revisione admin; la parola singola
  rende la moderazione banale rispetto al testo libero.
- **Tu vs la tifoseria / tu vs i dati** — nel profilo: quante volte il tuo MVP ha
  coinciso con la maggioranza, e quante col miglior `val_lega` reale. Self-insight,
  il dato non esce dal profilo.
- **Card condivisibile** — immagine generata della pagella o del proprio voto. È
  acquisizione più che engagement.

### Tra le partite

- **Quiz giornaliero** generato da `player_match_stats`: "chi ha segnato più punti in
  Reggio-Milano?", "indovina il giocatore dal tabellino anonimo". Risultato aggregato
  ("l'ha indovinato il 41%"). Zero contenuto da scrivere a mano.
- **Bracket a eliminazione** — "il canestro dell'anno" tra i video già aggregati dai
  feed YouTube, o "il quintetto storico" tra i giocatori. Un round al giorno, riempie
  le settimane morte e il vincitore è di per sé una notizia.
- **Fantaquintetto settimanale** — scegli 5, punti dal `val_lega` reale. Il più costoso
  della lista, ma l'unico che crea ritorno obbligato ogni giornata.

### Trasversali (motore di ritorno)

- **Streak** — "hai votato 7 partite di fila", con push quando la serie è a rischio.
  Dato privato. Probabilmente il miglior rapporto valore/lavoro della lista.
- **Push sui momenti mancanti** — oggi partono solo da `admin/actions.ts` e da
  `voto/finestra.ts`. Mancano: 1h prima della palla a due, fine gara, pagella
  pubblicata, quiz del giorno. Nessun dato nuovo, solo trigger.
