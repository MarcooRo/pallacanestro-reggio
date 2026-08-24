"use client";

// Card video: thumbnail con play, al tap il player si apre grande in un
// overlay a tutto schermo (il "teatro"), non dentro la card — sul
// telefono l'embed nella card era un francobollo. L'iframe è sempre
// youtube-nocookie e nasce solo al tap: nessun cookie finché non si
// guarda davvero.

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { Video } from "@/src/lib/video/queries";
import { soloOra } from "@/src/lib/date";

export function VideoCard({ video, className = "" }: { video: Video; className?: string }) {
  const [aperto, setAperto] = useState(false);
  // La massima risoluzione che YouTube ha per questo video: maxres
  // (1280×720) non esiste per tutti, al 404 si ripiega sulla hqdefault
  // del feed. La hq da sola è 480px: sgranata su qualunque retina.
  const [thumb, setThumb] = useState(
    `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`,
  );

  return (
    <div className={`taglio-sm flex flex-col card ${className}`}>
      <div className="relative aspect-video">
        <button
          type="button"
          onClick={() => setAperto(true)}
          aria-label={`Guarda: ${video.titolo}`}
          className="group absolute inset-0 cursor-pointer"
        >
          <Image
            src={thumb}
            alt=""
            fill
            sizes="(max-width: 32rem) 100vw, 32rem"
            className="object-cover"
            onError={() => setThumb(video.thumbnailUrl)}
          />
          {/* Tag della fonte: rosso pieno per la Reggiana */}
          <span
            className={`absolute left-2 top-2 -skew-x-[14deg] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
              video.fonte === "pr_youtube"
                ? "bg-brand text-on-brand"
                : "bg-black/75 text-foreground"
            }`}
          >
            <span className="inline-block skew-x-[14deg]">{video.tag}</span>
          </span>
          {/* Play col taglio: cuneo inclinato, firma del design system */}
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/10">
            <span className="flex h-12 w-16 -skew-x-[14deg] items-center justify-center bg-brand transition-colors group-hover:bg-brand-hover">
              <svg viewBox="0 0 24 24" className="h-6 w-6 skew-x-[14deg] fill-on-brand">
                <path d="M8 5.5v13l11-6.5Z" />
              </svg>
            </span>
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-1 p-3">
        <span className="eyebrow">{soloOra(video.publishedAt)}</span>
        <span className="font-bold leading-snug">{video.titolo}</span>
      </div>

      {aperto && <Teatro video={video} chiudi={() => setAperto(false)} />}
    </div>
  );
}

// Il dialog centrato col player. Tre geometrie:
// - video orizzontale su desktop/tablet: box 16:9, largo;
// - video orizzontale su telefono in verticale: il player si corica di
//   90° e prende lo schermo intero, come girare il telefono;
// - video verticale (Shorts/reel): box 9:16 alto l'80% dello schermo.
// Portal sul body per il solito motivo: il
// backdrop-blur dell'header creerebbe un containing block e il fixed
// resterebbe intrappolato.
function Teatro({ video, chiudi }: { video: Video; chiudi: () => void }) {
  // Coricato via stato (non via classi responsive): due rami CSS
  // renderizzerebbero due iframe, cioè due player che suonano insieme.
  const [coricato, setCoricato] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && chiudi();
    window.addEventListener("keydown", onEsc);
    // La pagina sotto non deve scorrere col dito che cerca il player.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = overflow;
    };
  }, [chiudi]);

  useEffect(() => {
    if (video.verticale) return;
    const mq = window.matchMedia(
      "(max-width: 1023px) and (orientation: portrait)",
    );
    const aggiorna = () => setCoricato(mq.matches);
    aggiorna();
    // Se l'utente gira il telefono a metà video il box si raddrizza da
    // solo (stesso nodo iframe: la riproduzione non si interrompe).
    mq.addEventListener("change", aggiorna);
    return () => mq.removeEventListener("change", aggiorna);
  }, [video.verticale]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={chiudi}
        className="absolute inset-0 cursor-default"
      />
      <button
        type="button"
        aria-label="Chiudi"
        onClick={chiudi}
        className="absolute right-4 top-4 z-20 flex h-10 w-10 -skew-x-[14deg] cursor-pointer items-center justify-center border border-border-strong bg-background/60 text-foreground transition-colors hover:border-brand hover:text-brand-vivid"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 skew-x-[14deg]" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div
        className={
          coricato
            ? // shrink-0: senza, il flex schiaccia la larghezza (che qui è
              // l'altezza dello schermo) dentro i 390px del viewport
              "relative h-[100dvw] w-[100dvh] shrink-0 rotate-90"
            : "taglio relative flex max-h-[94dvh] max-w-[94vw] flex-col gap-2 border border-border-strong bg-surface-2 p-2.5 lg:p-3"
        }
      >
        <div
          className={
            coricato
              ? "h-full w-full"
              : video.verticale
                ? // Reel: alto l'80% dello schermo, 9:16
                  "aspect-[9/16] h-[80dvh] max-w-full"
                : // 16:9: su schermi bassi il max-h contiene, il player
                  // si letterboxa da solo
                  "aspect-video max-h-[80dvh] w-[94vw] max-w-3xl lg:max-w-5xl"
          }
        >
          <iframe
            // rel=0 e iv_load_policy=3 tolgono il togliibile: correlati di
            // altri canali e annotazioni. La barra con titolo/Condividi è
            // di YouTube e l'embed non permette più di spegnerla.
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&playsinline=1&rel=0&iv_load_policy=3`}
            title={video.titolo}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
        {!coricato && (
          <div className="flex flex-col gap-1 px-1 pb-1">
            <span className="eyebrow">
              {video.tag} · {soloOra(video.publishedAt)}
            </span>
            <p className="font-bold leading-snug">{video.titolo}</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
