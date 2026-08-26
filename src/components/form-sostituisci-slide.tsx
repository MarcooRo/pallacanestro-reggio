"use client";

// Sotto ogni slide di una bozza: si sceglie una foto e prende il posto
// della grafica. Client component per il pending — l'upload dal telefono
// dura secondi e senza segnale a schermo sembra rotto (stessa ragione di
// form-carica-foto).

import { useFormStatus } from "react-dom";

import { Rotella } from "@/src/components/form-carica-foto";
import { sostituisciSlideConFoto } from "@/src/lib/social/actions";

export function FormSostituisciSlide({
  postId,
  itemId,
}: {
  postId: string;
  itemId: string;
}) {
  return (
    <form action={sostituisciSlideConFoto} className="flex flex-col gap-1.5">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="itemId" value={itemId} />
      <Campi />
    </form>
  );
}

// Figlio separato: useFormStatus legge il <form> che lo CONTIENE.
function Campi() {
  const { pending } = useFormStatus();
  return (
    <fieldset disabled={pending} className="flex flex-col gap-1.5">
      <input
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp"
        required
        className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-surface file:px-2 file:py-1 file:text-xs file:font-semibold"
      />
      <button
        type="submit"
        className="btn-admin btn-admin-bordo flex items-center gap-1.5 self-start"
      >
        {pending && <Rotella />}
        {pending ? "Carico…" : "Sostituisci con questa foto"}
      </button>
    </fieldset>
  );
}
