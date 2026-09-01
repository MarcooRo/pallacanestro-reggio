"use client";

// Copia negli appunti il testo pronto da incollare su Instagram (caption +
// hashtag, già uniti come li avrebbe composti il publisher). Se gli appunti
// non sono disponibili (permessi, contesto non sicuro) il prompt permette
// comunque di copiare a mano.

import { useState } from "react";

export function CopiaCaption({ testo }: { testo: string }) {
  const [copiato, setCopiato] = useState(false);

  async function copia() {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      window.prompt("Copia la caption:", testo);
    }
  }

  return (
    <button type="button" onClick={copia} className="btn-admin btn-admin-bordo">
      {copiato ? "Caption copiata!" : "Copia caption"}
    </button>
  );
}
