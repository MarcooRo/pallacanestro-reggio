"use client";

// Installazione dell'app sulla schermata Home, dal profilo come le
// notifiche. Chrome ed Edge espongono beforeinstallprompt: si intercetta
// l'evento e si offre un bottone vero. Safari su iPhone non ha nessuna
// API, quindi si spiegano i due tocchi del menu Condividi. Quando l'app
// è già installata (o si sta girando dentro) la sezione sparisce.

import { useEffect, useState } from "react";

// L'evento non è nei tipi del DOM: è fuori standard, solo Chromium
interface EventoInstallazione extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Stato = "verifica" | "installata" | "bottone" | "iphone" | "manuale";

// Fuori dall'effect (come rilevaStato delle notifiche): l'effect si limita
// a sottoscrivere gli eventi e a raccogliere il risultato.
async function rilevaStato(): Promise<Stato> {
  const dentroApp =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as { standalone?: boolean }).standalone === true);
  if (dentroApp) return "installata";
  // Senza beforeinstallprompt si cade sulle istruzioni per piattaforma
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? "iphone" : "manuale";
}

export function InstallaApp() {
  const [stato, setStato] = useState<Stato>("verifica");
  const [evento, setEvento] = useState<EventoInstallazione | null>(null);

  useEffect(() => {
    let montato = true;
    rilevaStato().then((s) => {
      // Il prompt può essere già arrivato nel frattempo: non si regredisce
      if (montato) setStato((prima) => (prima === "verifica" ? s : prima));
    });

    const alPrompt = (e: Event) => {
      // Il browser vorrebbe mostrare la sua barra quando pare a lui:
      // si trattiene l'evento e lo si spende sul nostro bottone
      e.preventDefault();
      setEvento(e as EventoInstallazione);
      setStato("bottone");
    };
    const aInstallata = () => setStato("installata");
    window.addEventListener("beforeinstallprompt", alPrompt);
    window.addEventListener("appinstalled", aInstallata);
    return () => {
      montato = false;
      window.removeEventListener("beforeinstallprompt", alPrompt);
      window.removeEventListener("appinstalled", aInstallata);
    };
  }, []);

  if (stato === "verifica" || stato === "installata") return null;

  async function installa() {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") {
      setStato("installata");
    } else {
      // Il prompt si consuma con l'uso: rifiutato, restano le istruzioni
      setEvento(null);
      setStato("manuale");
    }
  }

  return (
    <section className="taglio-sm card flex flex-col gap-3 p-4">
      <h2 className="display text-lg">L&apos;app sulla schermata Home</h2>

      {stato === "bottone" && (
        <>
          <p className="text-sm text-muted">
            Un&apos;icona sulla Home e il sito si apre come un&apos;app, a
            tutto schermo. Serve anche per le notifiche su iPhone.
          </p>
          <button
            type="button"
            onClick={installa}
            className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-hover"
          >
            Aggiungi alla schermata Home
          </button>
        </>
      )}

      {stato === "iphone" && (
        <p className="text-sm text-muted">
          Da Safari: tocca <span className="font-semibold text-foreground">Condividi</span>{" "}
          (il quadrato con la freccia in su) e poi{" "}
          <span className="font-semibold text-foreground">
            Aggiungi alla schermata Home
          </span>
          . L&apos;icona arriva sulla Home e l&apos;app si apre a tutto
          schermo — ed è il passaggio che sblocca le notifiche.
        </p>
      )}

      {stato === "manuale" && (
        <p className="text-sm text-muted">
          Dal menu del browser (⋮ in alto a destra, o l&apos;icona nella
          barra dell&apos;indirizzo) scegli{" "}
          <span className="font-semibold text-foreground">
            Aggiungi a schermata Home
          </span>{" "}
          o <span className="font-semibold text-foreground">Installa app</span>.
        </p>
      )}
    </section>
  );
}
