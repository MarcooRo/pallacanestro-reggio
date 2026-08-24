"use client";

// La copia di riserva dell'identità: a ogni visita il cookie (fonte di
// verità, impostato dal server) viene specchiato in localStorage; se un
// giorno il cookie manca ma la copia c'è, la si rimanda al server che —
// verificata la firma — lo reimposta. Due tasche, stessa chiave.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ripristinaIdentita } from "@/src/lib/identita/azioni";

// Devono combaciare con COOKIE_IDENTITA (src/lib/identita/cookie.ts), che
// qui non si può importare: quel modulo è solo-server.
const NOME_COOKIE = "identita";
const CHIAVE_STORAGE = "identita";

export function CustodeIdentita() {
  const router = useRouter();

  useEffect(() => {
    try {
      const cookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${NOME_COOKIE}=`))
        ?.slice(NOME_COOKIE.length + 1);

      if (cookie) {
        localStorage.setItem(CHIAVE_STORAGE, cookie);
      } else {
        const copia = localStorage.getItem(CHIAVE_STORAGE);
        if (copia) {
          // refresh: le pagine server rileggono il profilo appena tornato
          void ripristinaIdentita(copia).then(() => router.refresh());
        }
      }
    } catch {
      // Storage bloccato (navigazione privata, ecc.): resta il solo cookie.
    }
  }, [router]);

  return null;
}
