"use client";

// Card video: thumbnail con play, al tap si trasforma nell'embed
// youtube-nocookie (nessun cookie finché non si guarda davvero).

import Image from "next/image";
import { useState } from "react";

import type { Video } from "@/src/lib/video/queries";
import { soloOra } from "@/src/lib/date";

export function VideoCard({ video, className = "" }: { video: Video; className?: string }) {
  const [inPlay, setInPlay] = useState(false);

  return (
    <div className={`taglio-sm flex flex-col card ${className}`}>
      <div className="relative aspect-video">
        {inPlay ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1`}
            title={video.titolo}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setInPlay(true)}
            aria-label={`Guarda: ${video.titolo}`}
            className="group absolute inset-0 cursor-pointer"
          >
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 32rem) 100vw, 32rem"
              className="object-cover"
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
        )}
      </div>

      <div className="flex flex-col gap-1 p-3">
        <span className="eyebrow">{soloOra(video.publishedAt)}</span>
        <span className="font-bold leading-snug">{video.titolo}</span>
      </div>
    </div>
  );
}
