// Avatar del giocatore: foto CDN se c'è, altrimenti iniziali.
// Il fallback è obbligatorio: photo_key è null per molti giovani.

import Image from "next/image";

import { fotoUrl } from "@/src/lib/immagini";

export function AvatarGiocatore({
  firstName,
  lastName,
  photoKey,
  dimensione = 40,
}: {
  firstName: string;
  lastName: string;
  photoKey: string | null;
  dimensione?: number;
}) {
  const url = fotoUrl(photoKey, "thumb");
  const iniziali = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  if (!url) {
    return (
      <span
        style={{ width: dimensione, height: dimensione }}
        className="flex shrink-0 items-center justify-center rounded-full bg-brand-tint text-sm font-bold text-brand"
        aria-hidden
      >
        {iniziali}
      </span>
    );
  }

  return (
    <Image
      src={url}
      alt={`${firstName} ${lastName}`}
      width={dimensione}
      height={dimensione}
      className="shrink-0 rounded-full bg-brand-tint object-cover"
      style={{ width: dimensione, height: dimensione }}
    />
  );
}
