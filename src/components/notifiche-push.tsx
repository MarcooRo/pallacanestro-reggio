"use client";

// Attivazione delle notifiche push dal profilo, con preferenze per
// categoria. Su iOS funziona solo con l'app aggiunta alla home screen.

import { useEffect, useState } from "react";

import {
  rimuoviSottoscrizione,
  salvaSottoscrizione,
} from "@/src/lib/push/actions";

const CATEGORIE = [
  { valore: "vote_open", etichetta: "Apertura del voto" },
  { valore: "vote_closing", etichetta: "Voto in chiusura" },
  { valore: "tally_published", etichetta: "Pagella pubblicata" },
] as const;

function base64AUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const sicuro = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(sicuro);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type Stato = "verifica" | "non-supportate" | "spente" | "accese" | "negate";

async function rilevaStato(): Promise<Stato> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "non-supportate";
  }
  if (Notification.permission === "denied") return "negate";
  try {
    const registrazione = await navigator.serviceWorker.ready;
    const sottoscrizione = await registrazione.pushManager.getSubscription();
    return sottoscrizione ? "accese" : "spente";
  } catch {
    return "spente";
  }
}

export function NotifichePush() {
  const [stato, setStato] = useState<Stato>("verifica");
  const [categorie, setCategorie] = useState<string[]>(
    CATEGORIE.map((c) => c.valore),
  );
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let montato = true;
    rilevaStato().then((s) => {
      if (montato) setStato(s);
    });
    return () => {
      montato = false;
    };
  }, []);

  async function attiva() {
    setInCorso(true);
    setErrore(null);
    try {
      const permesso = await Notification.requestPermission();
      if (permesso !== "granted") {
        setStato("negate");
        return;
      }
      const registrazione = await navigator.serviceWorker.ready;
      const sottoscrizione = await registrazione.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64AUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });
      const esito = await salvaSottoscrizione(
        sottoscrizione.toJSON(),
        categorie,
      );
      if (esito.errore) {
        setErrore(esito.errore);
        await sottoscrizione.unsubscribe();
        return;
      }
      setStato("accese");
    } catch {
      setErrore("Attivazione non riuscita, riprova");
    } finally {
      setInCorso(false);
    }
  }

  async function disattiva() {
    setInCorso(true);
    try {
      const registrazione = await navigator.serviceWorker.ready;
      const sottoscrizione = await registrazione.pushManager.getSubscription();
      if (sottoscrizione) {
        await rimuoviSottoscrizione(sottoscrizione.endpoint);
        await sottoscrizione.unsubscribe();
      }
      setStato("spente");
    } finally {
      setInCorso(false);
    }
  }

  if (stato === "verifica") return null;

  return (
    <section className="taglio-sm flex flex-col gap-3 card p-4">
      <h2 className="display text-lg">Notifiche</h2>

      {stato === "non-supportate" && (
        <p className="text-sm text-muted">
          Questo browser non supporta le notifiche push. Su iPhone: aggiungi
          prima l&apos;app alla schermata Home (Condividi → Aggiungi alla
          schermata Home).
        </p>
      )}

      {stato === "negate" && (
        <p className="text-sm text-muted">
          Le notifiche sono bloccate nelle impostazioni del browser per questo
          sito.
        </p>
      )}

      {stato === "spente" && (
        <>
          <div className="flex flex-col gap-1">
            {CATEGORIE.map((c) => (
              <label key={c.valore} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={categorie.includes(c.valore)}
                  onChange={(e) =>
                    setCategorie((prima) =>
                      e.target.checked
                        ? [...prima, c.valore]
                        : prima.filter((v) => v !== c.valore),
                    )
                  }
                />
                {c.etichetta}
              </label>
            ))}
          </div>
          {errore && <p className="text-sm text-brand">{errore}</p>}
          <button
            onClick={attiva}
            disabled={inCorso || categorie.length === 0}
            className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-hover disabled:opacity-50"
          >
            {inCorso ? "Attivazione…" : "Attiva le notifiche"}
          </button>
        </>
      )}

      {stato === "accese" && (
        <>
          <p className="text-sm text-muted">
            Notifiche attive su questo dispositivo.
          </p>
          <button
            onClick={disattiva}
            disabled={inCorso}
            className="self-start rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface disabled:opacity-50"
          >
            Disattiva
          </button>
        </>
      )}
    </section>
  );
}
