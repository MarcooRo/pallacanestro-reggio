// Le card partita non hanno spazio per gli sponsor: "Nutribullet Treviso
// Basket" sfonda la colonna e finisce sopra il logo. Qui il nome commerciale
// diventa quello che il tifoso legge sul tabellone — la città.
//
// Non è una tabella di traduzione: si buttano le parole generiche e si tiene
// l'ultima, così il cambio di sponsor (che avviene ogni stagione) non richiede
// manutenzione. Il nome completo resta il dato: si mostra nella pagina partita,
// nel title e negli alt dei loghi.

// Parole che non identificano nessuno: si scartano da qualunque posizione.
// Ci sono anche i soprannomi che stanno in coda al nome ("Trapani Shark"):
// da soli non dicono chi gioca.
const GENERICHE = new Set([
  "basket",
  "basketball",
  "pallacanestro",
  "bc",
  "asd",
  "ssd",
  "shark",
  "sharks",
]);

// Città in due parole: senza queste "UNA Hotels Reggio Emilia" diventerebbe
// "Emilia".
const COMPOSTE = new Set(["reggio emilia", "reggio calabria"]);

// Quello che l'euristica non può indovinare: due squadre della stessa città
// nella stessa Serie A ("BC Roma SPQR" e "Maxima Roma" collasserebbero
// entrambe su "Roma"). Chiave = nome completo normalizzato; se lo sponsor
// cambia si ricade sull'euristica, che resta sensata.
const ECCEZIONI = new Map([
  ["bc roma spqr", "Roma SPQR"],
  ["maxima roma", "Maxima Roma"],
]);

export function nomeBreve(nome: string): string {
  const parole = nome.trim().split(/\s+/);

  const eccezione = ECCEZIONI.get(parole.join(" ").toLowerCase());
  if (eccezione) return eccezione;

  const utili = parole.filter((p) => !GENERICHE.has(p.toLowerCase()));
  if (utili.length === 0) return parole.join(" ");

  const ultime = utili.slice(-2);
  if (ultime.length === 2 && COMPOSTE.has(ultime.join(" ").toLowerCase())) {
    return ultime.join(" ");
  }

  return utili[utili.length - 1];
}
