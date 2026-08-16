// Il sottoinsieme di Markdown ammesso nel blocco "md", analizzato in un
// albero di nodi — MAI in una stringa di HTML. Il rendering (src/components/
// markdown.tsx) costruisce elementi React da questi nodi, quindi:
//
//   - non esiste un percorso che porti markup in pagina: un "<script>"
//     scritto nel testo resta la parola "<script>", stampata da React;
//   - gli indirizzi dei link passano da un filtro (solo http, https, mailto
//     e link interni): "javascript:" non diventa mai un href.
//
// Ammesso: **grassetto**, _corsivo_ o *corsivo*, `codice`, [testo](url),
// ## e ### sottotitoli, - e 1. elenchi, > citazioni, --- riga.
// Tutto il resto è testo normale, di proposito: la struttura forte di un
// articolo (foto, gallerie, widget) sono blocchi tipizzati, non markdown.

export type NodoInline =
  | { tipo: "testo"; testo: string }
  | { tipo: "grassetto"; testo: string }
  | { tipo: "corsivo"; testo: string }
  | { tipo: "codice"; testo: string }
  | { tipo: "link"; testo: string; href: string };

export type BloccoMd =
  | { tipo: "paragrafo"; parti: NodoInline[] }
  | { tipo: "titolo"; livello: 2 | 3; parti: NodoInline[] }
  | { tipo: "elenco"; ordinato: boolean; voci: NodoInline[][] }
  | { tipo: "citazione"; parti: NodoInline[] }
  | { tipo: "riga" };

// Un'unica passata: l'ordine delle alternative è la precedenza. Il codice
// viene per primo perché dentro i backtick gli asterischi non contano.
const INLINE =
  /`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|__([^_\n]+)__|_([^_\n]+)_/g;

/** Indirizzi che possono diventare un href. Tutto il resto resta testo. */
function hrefAmmesso(url: string): string | null {
  const pulito = url.trim();
  if (/^https?:\/\//i.test(pulito)) return pulito;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(pulito)) return pulito;
  // Link interni al sito: "/news/…", "/partite/…". Il doppio slash sarebbe
  // un indirizzo esterno travestito ("//altrosito.it").
  if (/^\/(?!\/)/.test(pulito)) return pulito;
  return null;
}

export function analizzaInline(riga: string): NodoInline[] {
  const nodi: NodoInline[] = [];
  let ultimo = 0;

  INLINE.lastIndex = 0;
  for (let m = INLINE.exec(riga); m; m = INLINE.exec(riga)) {
    const [intero, codice, testoLink, urlLink, grassetto, corsivo1, grassetto2, corsivo2] = m;
    // Un link con indirizzo non ammesso non è un match: si lascia il testo
    // grezzo com'è stato scritto, così si vede che qualcosa non va.
    const href = urlLink !== undefined ? hrefAmmesso(urlLink) : null;
    if (urlLink !== undefined && !href) continue;

    if (m.index > ultimo) {
      nodi.push({ tipo: "testo", testo: riga.slice(ultimo, m.index) });
    }
    if (codice !== undefined) nodi.push({ tipo: "codice", testo: codice });
    else if (href) nodi.push({ tipo: "link", testo: testoLink, href });
    else if (grassetto !== undefined) nodi.push({ tipo: "grassetto", testo: grassetto });
    else if (grassetto2 !== undefined) nodi.push({ tipo: "grassetto", testo: grassetto2 });
    else if (corsivo1 !== undefined) nodi.push({ tipo: "corsivo", testo: corsivo1 });
    else if (corsivo2 !== undefined) nodi.push({ tipo: "corsivo", testo: corsivo2 });

    ultimo = m.index + intero.length;
  }

  if (ultimo < riga.length) nodi.push({ tipo: "testo", testo: riga.slice(ultimo) });
  return nodi;
}

const TITOLO = /^(#{2,3})\s+(.+)$/;
const PUNTO = /^\s*[-*]\s+(.+)$/;
const NUMERO = /^\s*\d+[.)]\s+(.+)$/;
const CITAZIONE = /^>\s?(.*)$/;
const RIGA = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

export function analizzaMarkdown(sorgente: string): BloccoMd[] {
  const blocchi: BloccoMd[] = [];
  const righe = sorgente.replaceAll("\r\n", "\n").split("\n");

  // Righe di testo che si accumulano finché il blocco non cambia: un
  // paragrafo scritto su più righe resta un paragrafo solo (soft wrap).
  let paragrafo: string[] = [];
  let citazione: string[] = [];
  let voci: string[] = [];
  let ordinato = false;

  const chiudi = () => {
    if (paragrafo.length > 0) {
      blocchi.push({ tipo: "paragrafo", parti: analizzaInline(paragrafo.join(" ")) });
      paragrafo = [];
    }
    if (citazione.length > 0) {
      blocchi.push({ tipo: "citazione", parti: analizzaInline(citazione.join(" ")) });
      citazione = [];
    }
    if (voci.length > 0) {
      blocchi.push({ tipo: "elenco", ordinato, voci: voci.map(analizzaInline) });
      voci = [];
    }
  };

  for (const riga of righe) {
    if (riga.trim() === "") {
      chiudi();
      continue;
    }

    const titolo = TITOLO.exec(riga);
    if (titolo) {
      chiudi();
      blocchi.push({
        tipo: "titolo",
        livello: titolo[1].length === 2 ? 2 : 3,
        parti: analizzaInline(titolo[2]),
      });
      continue;
    }

    if (RIGA.test(riga)) {
      chiudi();
      blocchi.push({ tipo: "riga" });
      continue;
    }

    const cit = CITAZIONE.exec(riga);
    if (cit) {
      if (paragrafo.length > 0 || voci.length > 0) chiudi();
      citazione.push(cit[1]);
      continue;
    }

    const punto = PUNTO.exec(riga) ?? NUMERO.exec(riga);
    if (punto) {
      const eOrdinato = NUMERO.test(riga) && !PUNTO.test(riga);
      // Cambio di tipo di elenco: chiude quello aperto e ne apre un altro
      if (voci.length > 0 && eOrdinato !== ordinato) chiudi();
      if (paragrafo.length > 0 || citazione.length > 0) chiudi();
      ordinato = eOrdinato;
      voci.push(punto[1]);
      continue;
    }

    if (citazione.length > 0 || voci.length > 0) chiudi();
    paragrafo.push(riga.trim());
  }

  chiudi();
  return blocchi;
}

/** Il solo testo leggibile, senza i segni: serve al conteggio parole. */
export function testoPiano(sorgente: string): string {
  return analizzaMarkdown(sorgente)
    .flatMap((b) => (b.tipo === "riga" ? [] : b.tipo === "elenco" ? b.voci : [b.parti]))
    .flat()
    .map((n) => n.testo)
    .join(" ");
}
