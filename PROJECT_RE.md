# PROJECT.md — App tifoseria Pallacanestro Reggiana

> Specifica di progetto. Destinata a essere passata a Claude Code come contesto.
> Versione v3.0 — 30/07/2026. Fonti dati risolte, schema allineato al vocabolario LBA.

---

## 1. Cos'è

App per i tifosi della Pallacanestro Reggiana (UNA Hotels Reggio Emilia). Il cuore è il **voto post-partita**: a fine gara i tifosi votano il migliore in campo e il proprio preferito, e i voti aggregati generano classifiche mensili, di girone e stagionali.

Attorno al voto: calendario, risultati, statistiche, schede giocatori, pronostici pre-partita, news.

**Natura:** app **non ufficiale** della tifoseria, uso inizialmente privato (autore + cerchia di amici), con l'ipotesi di presentarla alla società. Nessun obiettivo commerciale. Pubblico atteso: da qualche decina a qualche migliaio di persone.

### Principi guida

1. **Il voto è il prodotto.** Ogni scelta che lo rende più lento, più fragile o più faticoso è sbagliata.
2. **Zero attrito di accesso.** Il pubblico arriva da un link su WhatsApp: ogni passaggio in più tra link e voto dimezza gli utenti.
3. **L'app funziona anche quando l'ingestion si rompe.** Nessun dato automatico è una dipendenza critica.
4. **I voti individuali non sono mai pubblici.** Solo aggregati.
5. **Meno servizi possibile.** Ogni pezzo di infrastruttura in più è manutenzione sottratta al divertimento.

### Contesto competitivo da conoscere

L'app ufficiale LBA ha una sezione **MyLBA** con voto, punti e badge. È a livello di lega e generalista: non fa la pagella collettiva di una singola squadra con classifiche locali. Da guardare prima di progettare la UI, per non rifare ciò che esiste e per sapere cosa il pubblico già si aspetta.

---

## 2. Stack

| Livello | Scelta |
|---|---|
| App | **Next.js 15 (App Router) + TypeScript**, installabile come **PWA** |
| Hosting | **VPS propria** (Caddy + systemd, `vps/Infrastruttura-VPS.md`) — era Vercel fino al 23/08/2026 |
| DB | **Postgres sulla VPS** (era Supabase fino al 23/08/2026) |
| Accesso dati | **Drizzle ORM**, migrazioni versionate nel repo |
| Auth | **Identità anonima per dispositivo** (rev. 24/08/2026, vedi sotto); password solo per l'admin |
| Logica fidata | **Server Actions / Route Handlers** con connessione privilegiata |
| Immagini condivisibili | **`@vercel/og`** |
| Scheduling ingestion | **cron sulla VPS** → route handler idempotenti (era Vercel Cron) |
| UI | **Tailwind + shadcn/ui** |
| Push | **Web Push (VAPID)**; eventuale shell **Capacitor** in seconda battuta |
| Toolchain | **`bun install` + `bun test`** in locale; runtime **Node** in produzione |
| Osservabilità | **Sentry** + **PostHog** |

### Perché web e non nativo

L'app mostra contenuti, fa compilare un form di quattro campi e mostra classifiche: niente richiede API native. Il web dà tre cose che il nativo non dà: nessuna installazione (il link si apre e si vota), nessuna app review da superare con un'app non ufficiale, deploy immediato quando c'è un bug alle 22 di sabato. E le **anteprime link server-side**, che sono il canale di crescita.

**Il prezzo:** le push su iOS via web richiedono che l'utente aggiunga alla home screen e sono meno affidabili delle native. Mitigazione: in v1 l'apertura del voto si annuncia anche nel gruppo della tifoseria. Se i dati diranno che le push contano, si incapsula **la stessa web app** in una shell Capacitor — nessun codice riscritto.

### Perché Postgres

Le classifiche sono somme pesate su finestre temporali incrociate con competizioni e fasi, con gestione delle parità. Sono query SQL scritte una volta. Su un document store diventano contatori denormalizzati da mantenere a mano.

### Perché la logica sta nel server

Il client **non parla mai direttamente al database**. Ogni operazione passa da una server action tipizzata che valida con Zod, verifica sessione e ruolo, applica le regole di dominio e poi tocca il DB. Le regole di questo progetto non sono controlli d'accesso ma logica di dominio (finestra di voto, calcolo tally, scoring pronostici): in TypeScript sono funzioni testabili, in RLS sarebbero policy contorte.

Conseguenza: **niente RLS da mantenere**, un solo percorso di accesso.

### Non usare

- **API proprietarie di Bun** (`Bun.sql`, `Bun.file`): legherebbero il progetto al runtime Bun e chiuderebbero la strada di ritorno. Solo Drizzle e API standard.
- **Realtime / websocket** in v1: i conteggi sono nascosti fino a chiusura voto, non c'è niente da mostrare live.
- **Coda / orchestratore**: sono pochi job al giorno. Cron + handler idempotenti + tabella di log bastano.
- **localStorage / sessionStorage** per stato di dominio.

---

### Revisione 24/08/2026 — niente più account: identità anonima

Decisione presa con l'app in uso privato: **il voto è libero, senza
registrazione**. Il principio "zero attrito" vince sul controllo del voto
doppio, accettato come rischio tollerabile per un fun project.

- L'identità è un **cookie tecnico firmato** (HMAC, `src/lib/identita`),
  impostato dal server alla prima partecipazione, durata 1 anno, con copia
  di riserva in localStorage (`custode-identita`). Il profilo è una riga
  anonima in `profiles` (nickname facoltativo, scelto dal /profilo).
- **Niente fingerprinting, niente IP come identità**: l'IP fa solo da
  rate limit anti-script (in memoria, processo singolo).
- **L'admin è l'unico login**: una password (hash scrypt in `app_settings`,
  chiave `admin_password_hash`, si imposta con `scripts/imposta-password.ts`),
  sessione in cookie firmato httpOnly di 30 giorni (`/admin/accesso`).
- Supabase Auth, le pagine di accesso/registrazione, la vetrina e la
  modalità ospite sono state rimosse. Supabase resta SOLO per lo Storage
  delle foto (bucket `media`), finché anche quello non trasloca sulla VPS.
- Upgrade futuro possibile: passkey ("salva l'identità con Face ID") per
  chi vuole uno storico a prova di cancellazione dati.

---

## 3. Scope

### In v1

- Auth OTP email + nickname pubblico
- Scheda voto post-partita: **podio (1°/2°/3°) + Preferito**
- Pagella collettiva aggregata a votazione chiusa, **con immagine condivisibile**
- Classifiche Performance e Preferito: mese / girone / stagione / competizione
- Calendario con risultati, palazzetto, arbitri, link biglietteria
- Schede giocatori con statistiche di stagione
- Pronostici pre-partita (1–2 per gara) con punti "Visionario"
- News (feed LBA + WordPress societario)
- Pannello admin
- Web push: apertura voto, chiusura imminente, pagella pubblicata

### Fuori dalla v1

| Feature | Motivo |
|---|---|
| Statistiche live in-game | Esiste un canale websocket nella fonte (`websocket_match_id`), quindi è tecnicamente possibile — ma è la parte più costosa da mantenere e non si compete con l'app della Lega. In v1: deep-link al live ufficiale. **Salvare comunque il campo** per non rifare l'ingestion dopo. |
| Check-in al palazzetto | Scartata: se dà punti serve un account, quindi "anonimo" è contraddittorio. Non vale i permessi di geolocalizzazione. |
| Trasferte / passaggi auto | Complessità sociale reale: matching, scambio contatti tra sconosciuti, responsabilità. |
| Amarcord / archivio storico | Rimandata. |
| Gamification estesa | I punti si accumulano in `points_ledger` già in v1; badge e livelli si progettano coi dati d'uso. |
| ID abbonamento verificato | Non validabile senza accordo con la società. In v1 autodichiarato, badge simbolico. |
| Shell nativa Capacitor | Solo se i dati dicono che le push web non bastano. |

---

## 4. Regole del voto

### Struttura

Una sola scheda per partita, quattro campi:

| Campo | Obbligatorio | Peso classifica Performance |
|---|---|---|
| **Best** (migliore in campo) | Sì | 3 punti |
| **Secondo** (`optional_a_id`) | No | 2 punti |
| **Terzo** (`optional_b_id`) | No | 1 punto |
| **Preferito** | No | — (classifica separata) |

### Regole

- Il podio **è ordinato** (scelta del 03/08/2026, prima i due facoltativi valevano 1 punto pari): `optional_a_id` è il secondo, `optional_b_id` il terzo. I nomi delle colonne restano quelli per non spostare dati già scritti.
- **Un voto per utente per partita**, non modificabile. Vincolo unique a DB.
- Valido anche col **solo Best** compilato.
- **Best, secondo e terzo devono essere tre giocatori distinti.**
- Il **Preferito può coincidere** con Best o con un facoltativo: prestazione e affetto sono domande diverse.
- **Votabili:** i giocatori a referto se il tabellino è disponibile; altrimenti i giocatori il cui `player_stints` copre la data della partita. Mai il roster corrente applicato retroattivamente.

### Finestra

- Apertura a **fine partita**, chiusura **+24h** (configurabile per partita; 48h se l'affluenza è bassa).
- Apertura **manuale dall'admin**, con automatismo da ingestion come comodità, **non come dipendenza**.
- Finestra applicata **nella server action**. Il client la mostra, non la decide.
- Stati: `closed` → `open` → `tallied`. La pagella si pubblica al passaggio a `tallied`.

### Classifiche

Due classifiche indipendenti su qualsiasi finestra:

- **Performance** — dal podio ordinato (3/2/1)
- **Preferito** — conteggio puro

Finestre: **partita** → **mese** → **girone (andata/ritorno)** → **stagione**, filtrabili per competizione e fase.

**Competizioni e fasi separate.** La fonte stessa modella Regular Season e Playoff come competizioni distinte, e andata/ritorno come fasi. Le classifiche seguono quella struttura, più una generale.

**Parità:** più voti Best; poi più voti totali; poi pari merito.

### Premi derivati, non votati

Giocatore del mese, del girone e dell'anno **non sono votazioni aggiuntive**: sono somme dei voti già espressi sul periodo. Nessuna UI in più, numeri coerenti per costruzione.

---

## 5. Pronostici

- **1–2 per partita.** Quelli non auto-risolvibili li chiude l'admin a mano: più di due diventa lavoro settimanale.
- Chiusura al **tip-off**. Una risposta per utente, non modificabile.

| Tipo | Esempio | Risoluzione |
|---|---|---|
| `match_result` | Chi vince | Automatica dal risultato |
| `margin` | Margine finale a fasce | Automatica |
| `over_under` | Sopra/sotto N punti totali | Automatica |
| `numeric_stat` | Quante triple segna X | Automatica **dal tabellino** (richiede il box score per partita) |
| `open` | Domanda creativa | Manuale dall'admin |

`resolution_spec` (jsonb) descrive quale statistica leggere e come confrontarla.

### Punti "Visionario"

Punti base per risposta corretta, con moltiplicatore inverso alla popolarità della risposta: indovinare ciò che ha scelto il 5% vale più di indovinare ciò che ha scelto il 90%. Valori da tarare sulle prime giornate. Tutto in `points_ledger`, così la formula può cambiare e i punti si ricalcolano.

---

## 5-bis. Partecipazione (dal 03/08/2026)

Tre gesti leggeri oltre al voto, decisi per aumentare l'ingaggio senza esporre
dati degli utenti. Le idee non ancora realizzate stanno in `IDEE.md`.

**Regola comune, valida per tutte:** il pubblico legge SOLO aggregati; il dato
personale si vede solo nel proprio profilo; il nickname compare unicamente
dove l'utente lo sceglie (classifiche). Nessun elenco di "chi ha fatto cosa".

| Feature | Tabella | Gesto | Cosa vede il pubblico |
|---|---|---|---|
| Io ci sono | `attendances` | tap prima della palla a due, modificabile | solo il contatore, e da 10 in su |
| Reazioni al risultato | `match_reactions` | una reazione a gara finita, modificabile | conteggio per reazione |
| Il boato | `roar_buckets` | tap ripetuti durante la gara | onda di intensità (bucket 10s) e totale |

- **Interruttori.** `app_settings.feature_flags` (jsonb) accende e spegne ogni
  feature dal pannello admin, senza redeploy: si costruisce una cosa e la si
  mostra quando ha senso. `ioCiSono` nasce **spenta** (con pochi iscritti un
  contatore basso scoraggia). Il flag si verifica anche nella server action,
  non solo nell'interfaccia.
- **Reazioni.** Il set vive in `src/lib/reazioni/tipi.ts` ed è provvisorio;
  `kind` è `text` senza check constraint proprio per poterlo cambiare senza
  migrazione. Devono funzionare sia in vittoria sia in sconfitta.
- **Boato.** Scrittura via server action (tap accumulati e spediti ogni 5s,
  con tetto per invio), lettura via `GET /api/boato/[matchId]` cacheata sulla
  CDN: mille tifosi collegati fanno una query, non mille. L'istante del bucket
  lo decide il server. `roar_buckets` non ha riferimenti all'utente: la riga
  nasce già aggregata. A gara finita la curva è il racconto della serata (il
  picco si correlerà al play-by-play, non ancora fatto).
- **Pronostici.** Realizzati come domande libere (`kind = 'open'`, opzioni
  scritte a mano, risoluzione dell'admin): sono la parte divertente, non il
  "chi vince". La distribuzione delle risposte NON viene inviata al client
  finché l'utente non ha risposto — nasconderla solo a schermo la lascerebbe
  leggibile nel payload. Le opzioni non si modificano dopo la creazione: le
  risposte sono salvate come indice (`{"opzione": n}`).

---

## 6. Fonti dati

### Fonte primaria: API interna legabasket.it

Base: `https://www.legabasket.it/api`. Non documentata, nessuna autenticazione per gli endpoint di lettura, risposte JSON. Ogni risposta include `cdn_url` e un `cache_key`.

**Endpoint verificati**

| Endpoint | Parametri | Cosa dà |
|---|---|---|
| `championships/get-championships` | `current=1` \| `s={anno}&cs_id={serie}&items=1000` | Competizioni della stagione. `cs_id=1` è Serie A |
| `championships/get-championships-calendar-by-id` | `id={championship}&ph_id={fase}` | Calendario completo della fase: partite, arbitri, filtri giornate/fasi |
| `teams/get-teams` | `year={anno}&items=50` | Le squadre della stagione con `club_id` |
| `teams/get-team-roster` | `id={team_id}` | Roster con date di validità, ruoli, foto, allenatore, riepilogo classifica |
| `players/get-player-by-id` | `id={player_id}&stats=true` | Anagrafica + statistiche di stagione (totali, medie, massimi) |
| `players/get-players` | `year=&full=1&ob=surname&sb=asc&page=&items=` | Elenco paginato giocatori |
| `players/get-player-roles` / `get-player-countries` / `get-player-seasons` | — | Tabelle di lookup |
| `statistics/get-players-statistics` | `round=last` \| `round={n}` | Statistiche giocatori per giornata — **da verificare se è per-partita** |
| `statistics/get-teams-statistics-by-type` | `type=teams_offensive` | Statistiche squadra |
| `contents/get-contents` | `c_id={championship}&c_type=news&items=` | News LBA |
| `videos/get-videos` | `c_id=&c_type=lba_tv&items=` | Video |

**Buco noto:** l'endpoint del **tabellino per partita** (box score per giocatore + parziali per quarto) non è ancora individuato. Il calendario non contiene i parziali, quindi stanno nel dettaglio partita.

Come chiuderlo, in ordine di costo:
1. Verificare `statistics/get-players-statistics?round={n}`: se restituisce righe per giocatore per giornata, il tabellino diventa superfluo.
2. Sonda dei nomi plausibili su un id partita valido (es. `25015`), seguendo la convenzione `get-X-by-id` / `get-Xs`.
3. DevTools sulla pagina di una partita giocata, tab Network, filtro `/api/` — deterministico.

**Non è bloccante.** Fase 1, 2 e 3 non richiedono il tabellino. Servono solo alle statistiche per-partita e ai pronostici `numeric_stat`.

### Fonte secondaria: WordPress della società

`https://www.pallacanestroreggiana.it/wp-json/wp/v2/posts` e `/feed/`. JSON stabile, categorie già segmentate (PR News, Giovanili, Academy, Sponsor).

**Confine (rivisto il 05/08/2026):** a database vanno solo titolo, estratto, data, categoria, immagine e link. Il corpo dell'articolo non si salva mai: la lettura in-app (`/news/[id]`) lo legge al volo dalle API delle fonti (WP REST per la società, `contents/get-content-by-id` per LBA) con cache di un'ora, ridotto a paragrafi di puro testo, citando e linkando sempre l'originale.

### Articoli nostri (fonte `redazione`)

L'eccezione alla regola sopra: sono gli unici articoli col corpo su database, perché il testo è nostro. Nascono dai tool MCP (`/api/mcp`, bearer fisso) e sono sempre **draft**: nessun tool pubblica, la messa online è un gesto umano da `/admin/news`. In pagina la firma è «Redazione» e compare la nota «Generato in parte con AI».

Il corpo (`news.body`, jsonb) **non è HTML**: è un elenco di blocchi tipizzati, validati da Zod in `src/lib/news/blocchi.ts` e impaginati da `src/components/corpo-articolo.tsx`. Non esiste un percorso che porti markup in pagina — niente `dangerouslySetInnerHTML`, in nessun ramo.

| Blocco | Cosa è |
|---|---|
| `paragrafo`, `sottotitolo`, `elenco`, `citazione` | testo semplice, senza markup |
| `md` | il blocco per scrivere lungo: markdown di un **sottoinsieme chiuso** (`**bold**`, `_corsivo_`, `` `codice` ``, `[link](url)`, `##`/`###`, elenchi, `>`, `---`), analizzato in nodi React da `src/lib/news/markdown.ts`. Mai in HTML: un tag scritto nel testo resta testo. Gli href passano da un filtro (solo http/https/mailto/link interni): `javascript:` non diventa mai un link |
| `immagine` | una foto della libreria (solo `assetId`: url, misure e alt si risolvono a render). Con `piena: true` esce dai margini del testo |
| `galleria` | 2-6 foto in carosello (scroll-snap CSS, zero JavaScript) |
| `grafico` | un widget dal registry: `{tipo, params}` |

**I widget** (`src/lib/news/grafici/`) hanno la stessa forma dei template OG social: nome, descrizione per l'AI, schema Zod, esempio, `render`. In più possono avere `carica` — leggono il dato vero quando la pagina si compone. Il blocco salva un **riferimento** (`matchId`), non i numeri: l'articolo resta giusto se il tabellino si corregge dopo, e chi scrive non può sbagliare una cifra che non scrive. `verifica` è il controllo alla scrittura: i blocchi stanno in un jsonb, nessuna foreign key li protegge.

Registry al 18/08/2026: `numeri-chiave` (1-3 numeri da tabellone, valori scritti a mano), `tabellino` (compatto, dal `matchId`) e `mezzo-campo` (i giocatori piazzati a mano sul campo, coordinate in percentuale). Le linee del campo stanno in `src/lib/campo/geometria.ts` e le leggono in tre — quintetto della pagina squadra, widget d'articolo e template OG omonimo: colori e spessori li decide chi disegna, i numeri no. Aggiungerne uno = un file in `templates/` e una riga nel registry; lo schema del corpo non cambia, ed è di proposito — `blocchi.ts` è importato da `src/db/schema.ts`, tirarci dentro React e query chiuderebbe un ciclo.

Tool MCP degli articoli: `create_article`, `update_article` (solo bozze), `list_articles`, `get_article`, `archive_article`, `list_article_blocks` (i widget con schema ed esempio), `list_matches` (i `matchId` con `haTabellino`).

### Fonte coppa europea: API FIBA (Basketball Champions League)

Aggiunta il 05/08/2026. Base: `https://digital-api.fiba.basketball/hapi`. Obbligatori l'header `ocp-apim-subscription-key` (chiave PUBBLICA, sta nel bundle JS di championsleague.basketball — stessa natura del token WebSocket LBA) e uno User-Agent da browser. Nota: il SITO è dietro una protezione bot che blocca curl e headless (403); l'API no.

**Endpoint verificati** (adapter `src/ingestion/sources/bcl.ts`)

| Endpoint | Parametri | Cosa dà |
|---|---|---|
| `getgdapcompetitionsbyseasonsandcompetitionmarketingname` | `seasons={annoFiba}&competitionMarketingNameId=112` | Le edizioni BCL. 112 = BCL (costante di vocabolario, come `cs_id=1`). FIBA numera con l'anno FINALE: la nostra 2026 è la loro 2027 |
| `getgdapcompetitionteamsbycompetitionid` | `gdapCompetitionId={id}&profile=true` | Le squadre con `organisationId` (stabile tra stagioni; Reggio = 2102) |
| `getgdapgameswithleaderdetailsbyteamid` | `gdapTeamId={teamId}` | Le partite della squadra: data UTC, venue, punteggi, `statusCode` |

Stati: INIT→scheduled, PROGR→live, VALID/CLOS→finished, CANCEL→cancelled; i codici mai visti (CONFL, N, DEL) finiscono in `ingestion_runs` come partial. Loghi: `assets.fiba.basketball/image/upload/w_200/f_auto/q_auto/.logoflag--light--organisation_{orgId}` (URL pieno in `team_seasons.logo_key`; `fotoUrl` passa gli URL `https://` così come sono).

**Confine:** solo le partite di Reggio. Le avversarie entrano come club/team_season con `fiba_*` e `lba_team_id` NULL → nessuna scheda `/squadre`, niente roster, niente tabellino. Endpoint utili per un domani: `getgdapgamebyid`, `getgdapcompetitionteamrosterbyteamid`, `getgdapteamrankingincompetitionbycompetitionid`, `getgdapplayergamestatisticsbyplayerid`.

### Piano B

**Highlightly** copre Lega A, free tier 100 req/giorno, piani a pagamento da ~8 USD/mese. Se l'API interna LBA si chiude o cambia in modo ingestibile, è il rimpiazzo. Il pattern adapter esiste per rendere questo cambio indolore.

Scartate: **BetsAPI** (orientata scommesse, box score povero), **Broadage** (enterprise, nessun self-serve), **API-Sports** (free limitato alle stagioni 2022-2024, stagione corrente a pagamento).

### Immagini

Tutte le risposte espongono `cdn_url` (`https://lba-media.s3.eu-south-1.amazonaws.com`) e chiavi: `player_picture_key`, `team_logo_key`, `logo_key`, `coach_picture_key`, `fullbody_picture_key`. Il path esatto tra `cdn_url` e la key va determinato ispezionando l'`src` di un'immagine sul sito.

`player_picture_key` è **null** per i giovani aggregati: il fallback a iniziali è necessario in ogni caso.

---

## 7. Modello dei dati: le insidie della fonte

Cinque cose scoperte in fase di verifica che determinano lo schema. Ignorarne una produce bug silenziosi che si manifestano mesi dopo.

### 7.1 Il team id è per stagione, il club è l'entità stabile

Reggio è `team_id` **1716** nel 2025 e **1760** nel 2026, ma sempre `club_id` **44**. Se si usa il team id come chiave canonica, ogni luglio nasce una squadra nuova e si perde tutto lo storico dei voti.

**Canonico = club.** Le squadre di stagione sono righe collegate.

### 7.2 Il calendario non espone `club_id`

Le partite danno `h_team_id`, `h_club_code`, `v_team_id`, `v_club_code` — **mai `club_id`**. E il `club_code` **non è stabile**: Milano è `MIL` nel 2025 e `MIO` nel 2026.

**Obbligatorio:** costruire la mappa `team_id → club_id` da `get-teams?year=X` una volta per stagione, e risolvere sempre da lì. Mai fare join sul `club_code`.

### 7.3 Il roster ha date di validità

Ogni giocatore porta `start_date` e `end_date`. Arrivi a stagione in corso sono normali. Serve per rispondere a "chi era in rosa alla data della partita X" — indispensabile per i votabili di una partita passata.

Quindi non `players.team_id`, ma una tabella di permanenze.

### 7.4 Il numero di maglia non è univoco

Nel roster 2025-26 ci sono due giocatori con il 19 e due con il 35 (giovani aggregati in momenti diversi). Il numero si mostra, non identifica, e la UI non deve assumere unicità.

### 7.5 I nomi dei campi non sono affidabili

`rating_oer_sum` contiene una media, non una somma. `avg_points_sum` vale 89 mentre `points_avg` vale 14.7: significa qualcos'altro.

**Regola:** prima di mappare un campo, verificarlo contro il tabellino mostrato sul sito per una partita conosciuta. Un campo interpretato male dà classifiche sbagliate senza mai lanciare un errore.

### 7.6 Vocabolario LBA → canonico

| Campo LBA | Canonico |
|---|---|
| `points_sum` / `points_avg` | `points` |
| `played_minutes_*` | `minutes` |
| `shots_2p_realized` / `_total` | `fg2m` / `fg2a` |
| `shots_3p_realized` / `_total` | `fg3m` / `fg3a` |
| `free_throws_realized` / `_total` | `ftm` / `fta` |
| `offensive_rebound` | `reb_off` |
| `defensive_rebound` | `reb_def` |
| `assists` | `assists` |
| `regain_balls` | `steals` |
| `lost_balls` | `turnovers` |
| `ball_stop_given` | `blocks` |
| `ball_stop_received` | `blocks_received` |
| `done_fouls` | `fouls_committed` |
| `suffered_fouls` | `fouls_received` |
| `slam_dunk` | `dunks` |
| `rating_lega` | `rating` (valutazione ufficiale) |
| `rating_oer` | `oer` |
| `quintet` | `starter` (conteggio presenze in quintetto base) |

La mappatura vive **nell'adapter**, non nello schema: lo schema usa i nomi canonici.

---

## 8. Schema dati

```sql
-- ============ ANAGRAFICHE ============

-- Entità stabile nel tempo. Chiave canonica del progetto.
create table clubs (
  id            uuid primary key default gen_random_uuid(),
  lba_club_id   int unique,                      -- club_id LBA (Reggio = 44)
  name          text not null,                   -- "Pallacanestro Reggiana"
  short_name    text not null,
  is_home_club  boolean not null default false,
  created_at    timestamptz not null default now()
);
create unique index on clubs (is_home_club) where is_home_club;

-- Una riga per club per stagione: il nome commerciale e l'id LBA cambiano ogni anno.
create table team_seasons (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references clubs(id),
  season_year   int not null,                    -- 2026 = stagione 2026-27
  lba_team_id   int not null,                    -- 1760 per Reggio 2026
  display_name  text not null,                   -- "UNA Hotels Reggio Emilia"
  lba_club_code text,                            -- NON stabile tra stagioni, solo informativo
  logo_key      text,
  unique (club_id, season_year),
  unique (lba_team_id)
);

create table players (
  id            uuid primary key default gen_random_uuid(),
  lba_player_id int unique,                      -- id LBA (Vitali = 5834)
  lba_code      text,                            -- "VIT-MIC", stabile e leggibile
  first_name    text not null,
  last_name     text not null,
  birth_date    date,
  birth_place   text,
  nationality   text,                            -- alpha3: ITA, USA, SEN
  height_cm     int,
  weight_kg     int,
  photo_key     text,                            -- null per molti giovani
  manual_override boolean not null default false
);

-- Permanenza di un giocatore in una squadra-stagione, con validità temporale.
create table player_stints (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references players(id) on delete cascade,
  team_season_id uuid not null references team_seasons(id) on delete cascade,
  start_date     date not null,
  end_date       date,
  jersey_number  text,                           -- NON univoco nella squadra
  role           text,                           -- "Guardia", "Playmaker", "Ala", "Centro"
  role_id        int,
  uefa_ratio     text,                           -- 'I' italiano / 'E' estero
  unique (player_id, team_season_id, start_date)
);
create index on player_stints (team_season_id, start_date, end_date);

-- Alias per riconciliare fonti diverse. Necessarie: "Pallacanestro Reggiana",
-- "UNA Hotels Reggio Emilia" e "Reggio Emilia" sono la stessa entità.
create table club_aliases (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  source     text not null,
  alias_text text not null,
  unique (source, alias_text)
);

create table player_aliases (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references players(id) on delete cascade,
  source     text not null,
  alias_text text not null,
  unique (source, alias_text)
);

-- ============ COMPETIZIONI E PARTITE ============

-- La fonte modella Regular Season e Playoff come competizioni distinte
-- della stessa stagione (596 = RS 2025-26, 595 = PO 2025-26).
create table competitions (
  id                 uuid primary key default gen_random_uuid(),
  lba_championship_id int unique,
  season_year        int not null,
  series_code        text not null,              -- 'A1'
  type_code          text not null,              -- 'RS' | 'PO' | 'CI' | 'SC' | 'NGC'
  name               text not null,
  logo_key           text
);

create table matches (
  id                 uuid primary key default gen_random_uuid(),
  lba_match_id       int unique,
  competition_id     uuid not null references competitions(id),

  phase_id           int,                        -- 1 = Andata, 2 = Ritorno
  day_serial         int,                        -- numero giornata
  day_name           text,                       -- "1° Giornata"

  starts_at          timestamptz not null,
  home_team_season_id uuid not null references team_seasons(id),
  away_team_season_id uuid not null references team_seasons(id),

  status             text not null default 'scheduled'
                       check (status in ('scheduled','live','finished','postponed','cancelled')),
  home_score         int,
  away_score         int,
  quarter_scores     jsonb,                      -- dal tabellino, quando disponibile
  additional_time    int not null default 0,     -- numero di supplementari

  venue_name         text,
  town_name          text,
  referees           text[],
  ticketing_url      text,
  has_streaming      boolean not null default false,
  live_url           text,
  websocket_match_id text,                       -- per un eventuale live futuro

  voting_state       text not null default 'closed'
                       check (voting_state in ('closed','open','tallied')),
  voting_opens_at    timestamptz,
  voting_closes_at   timestamptz,

  last_synced_at     timestamptz,
  manual_override    boolean not null default false
);
create index on matches (starts_at desc);
create index on matches (voting_state) where voting_state = 'open';

-- Nomi canonici. La mappatura dal vocabolario LBA sta nell'adapter.
create table player_match_stats (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references matches(id) on delete cascade,
  player_id       uuid not null references players(id),
  starter         boolean,
  minutes         numeric(4,1),
  points          int,
  fg2m int, fg2a int,
  fg3m int, fg3a int,
  ftm  int, fta  int,
  dunks           int,
  reb_off int, reb_def int,
  assists int, steals int, turnovers int,
  blocks int, blocks_received int,
  fouls_committed int, fouls_received int,
  plus_minus      int,
  rating          numeric(5,1),                  -- valutazione (rating_lega)
  oer             numeric(6,4),
  manual_override boolean not null default false,
  unique (match_id, player_id)
);

-- ============ UTENTI ============

create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  nickname           text not null unique,
  role               text not null default 'user' check (role in ('user','admin')),
  subscription_code  text,                       -- autodichiarato, non verificato
  subscription_years int,
  created_at         timestamptz not null default now()
);

-- ============ VOTI ============

create table votes (
  id                 uuid primary key default gen_random_uuid(),
  match_id           uuid not null references matches(id) on delete cascade,
  user_id            uuid not null references profiles(id) on delete cascade,
  best_player_id     uuid not null references players(id),
  optional_a_id      uuid references players(id),
  optional_b_id      uuid references players(id),
  favorite_player_id uuid references players(id),
  created_at         timestamptz not null default now(),
  unique (match_id, user_id),
  check (optional_a_id is null or optional_a_id <> best_player_id),
  check (optional_b_id is null or optional_b_id <> best_player_id),
  check (optional_a_id is null or optional_b_id is null or optional_a_id <> optional_b_id)
);

-- Aggregato calcolato alla chiusura. L'unica cosa che il pubblico legge.
create table vote_tallies (
  match_id           uuid not null references matches(id) on delete cascade,
  player_id          uuid not null references players(id),
  best_count         int not null default 0,
  support_count      int not null default 0,     -- secondi + terzi, somma
  second_count       int not null default 0,
  third_count        int not null default 0,
  performance_points int not null default 0,     -- best*3 + second*2 + third*1
  favorite_count     int not null default 0,
  computed_at        timestamptz not null default now(),
  primary key (match_id, player_id)
);

-- ============ PRONOSTICI ============

create table predictions (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references matches(id) on delete cascade,
  question        text not null,
  kind            text not null check (kind in ('match_result','margin','over_under','numeric_stat','open')),
  options         jsonb,
  auto_resolvable boolean not null default false,
  resolution_spec jsonb,
  closes_at       timestamptz not null,
  correct_answer  jsonb,
  status          text not null default 'open'
                    check (status in ('open','closed','resolved','voided'))
);

create table prediction_answers (
  id            uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references predictions(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  answer        jsonb not null,
  is_correct    boolean,
  created_at    timestamptz not null default now(),
  unique (prediction_id, user_id)
);

create table points_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  reason     text not null check (reason in ('prediction_correct','prediction_bonus','vote_cast','manual')),
  ref_id     uuid,
  points     int not null,
  created_at timestamptz not null default now()
);

-- ============ CONTENUTI E SISTEMA ============

create table news (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,                    -- 'lba' | 'pr_wordpress'
  source_id    text,
  title        text not null,
  url          text not null,
  excerpt      text,
  category     text,
  image_url    text,
  published_at timestamptz not null,
  is_pinned    boolean not null default false,
  unique (source, source_id)
);

create table ingestion_runs (
  id              uuid primary key default gen_random_uuid(),
  source          text not null,
  target          text not null,                 -- 'roster'|'calendar'|'boxscore'|'news'|'stats'
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running'
                    check (status in ('running','ok','partial','failed')),
  records_seen    int,
  records_changed int,
  diff            jsonb,
  error           text
);

create table reconciliation_queue (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  entity_type text not null check (entity_type in ('player','club')),
  raw_value   text not null,
  context     jsonb,
  resolved_to uuid,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text not null unique,
  keys       jsonb not null,
  categories text[] not null default '{vote_open,vote_closing,tally_published}',
  created_at timestamptz not null default now()
);

create table app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
```

### Viste

- `v_leaderboard_performance` — somma `performance_points` da `vote_tallies` ⋈ `matches` ⋈ `competitions`, parametrizzata su competizione, fase e finestra temporale
- `v_leaderboard_favorite` — somma `favorite_count`
- `v_player_season_stats` — aggregati da `player_match_stats` (derivati, non serviti: unica fonte di verità)
- `v_visionari` — somma `points_ledger`
- `v_eligible_voters(match_id)` — giocatori votabili: da `player_match_stats` se presente, altrimenti da `player_stints` per la data della partita

---

## 9. Ingestion

### Architettura multi-fonte

Non "più dati" ma **un modello canonico più un adapter per fonte**.

```
src/ingestion/sources/lba.ts           → API interna legabasket
src/ingestion/sources/prwordpress.ts   → news societarie
src/ingestion/sources/highlightly.ts   → piano B, non implementato in v1
src/ingestion/normalize.ts             → tipo canonico, unico
src/ingestion/reconcile.ts             → alias, mappa team_id→club_id, dedup
src/ingestion/precedence.ts            → quale fonte vince per campo
```

Ogni adapter parla la lingua della sua fonte ed emette il tipo canonico. Il resto del sistema non sa da dove arrivano i dati.

**Precedenza per campo esplicita, in `app_settings`.** Se due fonti danno punteggi diversi deve essere deciso a priori quale vince, altrimenti il dato cambia in base all'ordine dei cron.

### Sequenza di sincronizzazione

L'ordine conta, perché la risoluzione dei riferimenti dipende dai passi precedenti:

1. `get-championships?current=1` → competizioni della stagione
2. `get-teams?year=X` → squadre-stagione e **mappa `lba_team_id` → `club_id`**
3. `get-team-roster?id={lba_team_id}` → giocatori e `player_stints`
4. `get-championships-calendar-by-id?id={champ}&ph_id={fase}` → partite (una chiamata per fase, non per giornata)
5. Tabellino della singola partita → `player_match_stats` (quando l'endpoint sarà noto)
6. `get-contents` + WordPress → news

Nessun id di competizione o di squadra va scritto nel codice: tutti si risolvono al passo 1 e 2.

### Regole di resilienza

1. **Last-known-good.** Un fetch fallito o incoerente non sovrascrive nulla.
2. **Manual override.** Ogni record ha `manual_override`: se alzato, l'ingestion non lo tocca.
3. **Handler idempotenti.** Rieseguire lo stesso job non deve produrre effetti diversi. È ciò che rende superflua una coda con retry.
4. **Log con diff.** Ogni run scrive in `ingestion_runs` con il diff rispetto allo stato precedente.
5. **Nessun automatismo blocca il voto.** Se la fonte si rompe, l'admin apre il voto a mano.
6. **Cache rispettosa.** Le risposte espongono `cache_key` e `updated_at`: usarli per saltare ciò che non è cambiato. Poche chiamate, distanziate, nessuna concorrenza.

### Rischio della fonte primaria

È un'API interna non documentata: nessuna garanzia di stabilità, può cambiare senza preavviso, limiti di frequenza sconosciuti. Non è "gratis e risolto" ma **fragile e di ottima forma**. Il monitoraggio via `ingestion_runs` con diff serve esattamente a scoprire un cambio di formato dal log e non dagli utenti. Il piano B è Highlightly.

### Scheduling

Vercel Cron → route handler protetti da secret.

| Target | Cadenza |
|---|---|
| Competizioni | settimanale |
| Squadre-stagione | settimanale |
| Roster | settimanale, più a ogni finestra di mercato |
| Calendario | giornaliero |
| Tabellino | polling ravvicinato nelle 3 ore dopo il fischio finale, poi rado |
| News | ogni 2 ore |

---

## 10. Sicurezza e integrità

### Modello di accesso

Il browser non ha credenziali di database. Ogni lettura e scrittura passa da una server action tipizzata che valida con Zod, verifica sessione e ruolo, applica le regole e poi tocca il DB con connessione privilegiata.

### Integrità del voto

| Regola | Dove |
|---|---|
| Un voto per utente per partita | Unique a DB **e** check nella server action |
| Solo a finestra aperta | Server action: `voting_state = 'open'` **e** `now() < voting_closes_at` |
| Giocatori distinti e votabili alla data | Check constraint + `v_eligible_voters` |
| Voto immutabile | Nessuna server action di update esiste |
| Nessuna lettura di voti altrui | Nessun endpoint li restituisce. Il pubblico legge solo `vote_tallies`, e solo per partite `tallied` |

Con premi in gioco qualcuno tenterà account multipli. L'OTP alza abbastanza l'attrito. Rate limiting per IP sulla registrazione solo se serve.

### Dati che non si raccolgono

Nessuna posizione geografica. Nessun dato di frequentazione. Nessuna esposizione pubblica di chi ha votato chi.

---

## 11. Branding

**La v1 usa identità visiva, logo, colori e foto ufficiali del club.**

La linea che conta non è l'uso degli asset ma la **distribuzione pubblica senza accordo**: uso privato tra poche persone e presentazione in sede stanno da un lato, un link che circola in curva o una pubblicazione su store stanno dall'altro. Per presentare il progetto alla società, la versione con i loro colori è più efficace di una anonima.

Nota: i provider di dati che forniscono loghi dichiarano esplicitamente che sono per soli fini identificativi, che non ne detengono la proprietà e che la responsabilità dell'uso resta dello sviluppatore. Nemmeno un logo scaricato via API è una licenza.

### Il branding come strato sostituibile

Da implementare in Fase 1, non dopo:

- **Colori solo come CSS variables** in un unico file di token. Mai hardcoded nei componenti.
- **Asset da un solo modulo** `src/branding/index.ts`.
- **Nomi squadra da `team_seasons.display_name`**, mai da stringhe nel codice.
- **`photo_key` nullable con fallback a iniziali già attivo** (necessario comunque: molti giovani non hanno foto).
- **Env var `BRANDING=official | generic`** che seleziona token e asset.

Costo: mezza giornata ora, zero dopo.

**Trigger:** prima di rendere il link pubblico oltre la cerchia privata, o di pubblicare su uno store, la decisione va presa esplicitamente — accordo con la società oppure `BRANDING=generic`.

---

## 12. Pannello admin

Route `/admin`, protetta da `role = 'admin'`.

- **Partite** — CRUD, risultato e parziali a mano, apertura/chiusura voto, pubblicazione pagella
- **Box score** — inserimento e correzione riga per riga
- **Roster** — CRUD giocatori, permanenze, alias, coda di riconciliazione
- **Pronostici** — creazione, chiusura, risoluzione manuale degli `open`
- **News** — inserimento manuale e revisione degli item aggregati
- **Ingestion** — storico run con diff, retry, gestione `manual_override`

Requisito non negoziabile: **tutto ciò che l'ingestion fa in automatico, l'admin deve poterlo fare a mano.**

---

## 13. Notifiche e condivisione

### Web push (VAPID)

| Trigger | Testo |
|---|---|
| Voto aperto | "Fine partita. Vota il migliore." |
| Chiusura tra 2h | "Ultime ore per votare." |
| Pagella pubblicata | "Il migliore secondo la curva è ..." |
| Pronostico aperto | "Pronostico aperto per la gara di domani." |
| Fine mese | "Il giocatore del mese è ..." |

Preferenze per categoria in `push_subscriptions.categories`. Nessun invio fuori da questi trigger.

### Immagini condivisibili

Ogni pagella e ogni classifica ha una route `@vercel/og` che genera l'immagine dei risultati, usata come `og:image`. Il link incollato in un gruppo WhatsApp mostra direttamente la pagella. **È il canale di crescita principale**: va nella v1.

---

## 14. Roadmap

### Fase 1 — Fondamenta
Progetto Next.js + Supabase, schema Drizzle, migrazioni, auth OTP + nickname, layout e navigazione, **strato branding sostituibile**, seed di competizioni, squadre-stagione, roster e calendario tramite le chiamate note.

### Fase 2 — Il voto
Scheda voto, enforcement finestra nella server action, `v_eligible_voters`, calcolo tallies, pagella con immagine OG, classifiche Performance e Preferito su tutte le finestre. Admin minimo (partite + apertura voto).
**Da qui l'app è usabile:** si può mandare il link agli amici prima di aver risolto il tabellino.

### Fase 3 — Contenuti e ritorno
Schede giocatori con statistiche di stagione, calendario completo con palazzetto/arbitri/biglietti, news dalle due fonti, web push, PWA installabile.

### Fase 4 — Ingestion automatica
Adapter LBA completo, mappa team→club, alias e riconciliazione, route handler idempotenti + Vercel Cron, log con diff, automatismo apertura voto.
**Qui si chiude il buco del tabellino** con la sonda descritta in sezione 6.

### Fase 5 — Pronostici
Creazione, risoluzione automatica e manuale, punti Visionario, classifica.
**Fatto il 03/08/2026** nella forma "domande libere" (sezione 5-bis), insieme a
reazioni, "Io ci sono" e boato. Restano: risoluzione automatica dai tabellini,
classifica pubblica dei punti, push "pronostico aperto" (serve una categoria
nuova in `push_subscriptions.categories`).

### Dopo la prima stagione
Con i dati d'uso: gamification estesa, trasferte, statistiche live via websocket, shell Capacitor, contatto con la società.

---

## 15. Decisioni aperte

1. **Endpoint del tabellino** — da individuare (sezione 6). Blocca solo statistiche per-partita e pronostici `numeric_stat`.
2. **Path delle immagini CDN** — da ricavare dall'`src` di un'immagine sul sito.
3. **Semantica dei campi statistici ambigui** — da validare contro un tabellino reale prima di fidarsi (sezione 7.5).
4. **Formula punti Visionario** — da tarare sulle prime giornate.
5. **Finestra 24h o 48h** — dipende dall'affluenza osservata.
6. **Accordo con la società** — da affrontare a fine Fase 2, quando c'è un prototipo da mostrare. Determina branding pubblico, foto ufficiali e ID abbonamento verificato.

### Chiuse

- Stack: Next.js + Vercel + Postgres/Supabase + Drizzle, logica nelle server action, niente RLS
- Web app PWA, non nativa; Capacitor come opzione futura
- Fonte primaria: API interna legabasket.it; piano B Highlightly
- Modello canonico: club stabile, squadre-stagione collegate, permanenze con date
- Branding ufficiale in v1 con strato sostituibile
- Regole di voto, classifiche e premi derivati
