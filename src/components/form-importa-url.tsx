"use client";

// Import di un'immagine già online: si incolla l'URL e il server la scarica,
// la valida e la copia sul nostro bucket. Client component per lo stesso
// motivo del form di upload: lo scarico può durare secondi e senza segnale a
// schermo sembra che il bottone non abbia fatto niente.

import { useFormStatus } from "react-dom";

import { Rotella } from "@/src/components/form-carica-foto";
import { importaFotoDaUrl } from "@/src/lib/media/actions";

export function FormImportaUrl() {
  return (
    <form
      action={importaFotoDaUrl}
      className="flex flex-col gap-3 rounded-md border border-border p-4"
    >
      <Campi />
    </form>
  );
}

function Campi() {
  const { pending } = useFormStatus();

  return (
    <fieldset disabled={pending} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">Oppure importa da un URL</p>
        <p className="text-sm text-muted">
          Il link diretto al file (JPEG, PNG o WebP), non la pagina che
          contiene la foto. L&apos;immagine viene copiata sul nostro storage e
          resta segnata come «presa da» quell&apos;indirizzo: prima di
          pubblicarla assicurati di averne il diritto.
        </p>
      </div>
      <input
        type="url"
        name="url"
        required
        inputMode="url"
        placeholder="https://…/foto.jpg"
        className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
      />
      <input
        type="text"
        name="caption"
        placeholder="Didascalia, facoltativa"
        className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
      />
      <input
        type="text"
        name="tags"
        placeholder="Tag facoltativi, separati da spazi"
        className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 self-start rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold hover:bg-surface disabled:opacity-50"
      >
        {pending && <Rotella />}
        {pending ? "Scarico…" : "Importa"}
      </button>
      {pending && (
        <p aria-live="polite" className="text-xs text-muted">
          Sto scaricando l&apos;immagine dal sito di origine e leggendone i
          metadati.
        </p>
      )}
    </fieldset>
  );
}
