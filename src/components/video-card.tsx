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

// L'overlay col player a tutta larghezza. Portal sul body per gli stessi
// motivi di accesso-richiesto: il backdrop-blur dell'header creerebbe un
// containing block e il fixed resterebbe intrappolato.
function Teatro({ video, chiudi }: { video: Video; chiudi: () => void }) {
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95">
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
        className="absolute right-4 top-4 z-10 flex h-10 w-10 -skew-x-[14deg] cursor-pointer items-center justify-center border border-border-strong text-foreground transition-colors hover:border-brand hover:text-brand-vivid"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 skew-x-[14deg]" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="relative flex w-full max-w-4xl flex-col gap-3">
        {/* In orizzontale il 16:9 a tutta larghezza sfonderebbe lo schermo:
            il max-h lo contiene e il player si letterboxa da solo. */}
        <div className="aspect-video max-h-[80dvh] w-full">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&playsinline=1&rel=0`}
            title={video.titolo}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
        <div className="flex flex-col gap-1 px-4 pb-2">
          <span className="eyebrow">
            {video.tag} · {soloOra(video.publishedAt)}
          </span>
          <p className="font-bold leading-snug">{video.titolo}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
