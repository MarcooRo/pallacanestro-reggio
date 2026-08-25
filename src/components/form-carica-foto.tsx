"use client";

// Il form di caricamento della libreria foto. È un client component per una
// ragione sola: dal telefono l'upload di più foto dura decine di secondi e
// senza un segnale a schermo sembra rotto — si ritocca il bottone e partono
// due upload. Qui il bottone si spegne, dice "Carico…" e i campi si
// bloccano finché la server action non ha finito.
//
// Didascalia e tag sono FACOLTATIVI: aiutano l'AI a ritrovare la foto, ma
// non devono essere un pedaggio da pagare al bordo campo tra due quarti.

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { caricaFoto } from "@/src/lib/media/actions";
import { LIMITE_UPLOAD_MB, MB } from "@/src/lib/media/limiti";

interface Scelta {
  quante: number;
  bytes: number;
}

export function FormCaricaFoto() {
  const [scelta, setScelta] = useState<Scelta>({ quante: 0, bytes: 0 });

  return (
    <form
      action={caricaFoto}
      className="flex flex-col gap-3 rounded-md border border-border p-4"
    >
      <Campi scelta={scelta} onScelta={setScelta} />
    </form>
  );
}

// I campi stanno in un componente figlio perché useFormStatus legge lo stato
// del <form> che lo contiene: dentro il componente che rende il form
// restituirebbe sempre pending: false.
function Campi({
  scelta,
  onScelta,
}: {
  scelta: Scelta;
  onScelta: (s: Scelta) => void;
}) {
  const { pending } = useFormStatus();
  const mb = scelta.bytes / MB;
  const troppoGrande = mb > LIMITE_UPLOAD_MB;

  return (
    <fieldset disabled={pending} className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Didascalia e tag sono facoltativi e si possono aggiungere dopo, foto
        per foto: servono all&apos;AI per ritrovare l&apos;immagine giusta.
        Basta scegliere i file e premere Carica.
      </p>
      <input
        type="file"
        name="files"
        accept="image/jpeg,image/png,image/webp"
        multiple
        required
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          onScelta({
            quante: files.length,
            bytes: files.reduce((somma, f) => somma + f.size, 0),
          });
        }}
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-on-brand"
      />
      {scelta.quante > 0 && (
        <p className="text-xs text-muted">
          {scelta.quante === 1 ? "1 foto" : `${scelta.quante} foto`} ·{" "}
          {mb.toFixed(1)} MB su {LIMITE_UPLOAD_MB} disponibili
        </p>
      )}
      {troppoGrande && (
        <p role="alert" className="text-xs font-semibold text-brand-vivid">
          Troppo peso in un colpo solo: il limite è {LIMITE_UPLOAD_MB} MB per
          invio. Carica meno foto per volta (il resto in un secondo giro).
        </p>
      )}
      <input
        type="text"
        name="caption"
        placeholder="Didascalia, facoltativa (es. La curva durante il terzo quarto con Trapani)"
        className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
      />
      <input
        type="text"
        name="tags"
        placeholder="Tag facoltativi, separati da spazi (es. palabigi tifosi trapani)"
        className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending || troppoGrande}
        className="btn-admin btn-admin-pieno self-start"
      >
        {pending && <Rotella />}
        {pending ? "Carico…" : "Carica"}
      </button>
      {pending && (
        <p aria-live="polite" className="text-xs text-muted">
          Le foto salgono una alla volta e i metadati si leggono dai byte: con
          gli scatti del telefono può volerci qualche decina di secondi. Non
          chiudere la pagina.
        </p>
      )}
    </fieldset>
  );
}

export function Rotella() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0 animate-spin"
      aria-hidden
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.3"
      />
      <path
        d="M8 2a6 6 0 0 1 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
