// Il logo di una squadra, con la sua placca chiara.
//
// Due fatti dei loghi LBA, verificati sui 16 club della Serie A:
// 1. sono compositi — stemma sopra, riga, logo dello sponsor sotto — quindi
//    lo stemma occupa poco più della metà dell'immagine e va tenuto grande;
// 2. alcuni sono grafica nera su trasparente (Derthona, Aquila Trentino) e
//    sul nostro fondo fumo scomparivano.
// La placca risolve il secondo problema e fa sembrare i loghi degli oggetti
// invece che macchie: è la soluzione delle app sportive, non un'invenzione.
// La variante thumb del CDN è 220×220, c'è risoluzione da spendere anche a
// densità doppia (large è 280×280: non serve, pesa di più).

import Image from "next/image";

import { fotoUrl } from "@/src/lib/immagini";

const MISURE = {
  // Classifica: tante righe, la placca resta piccola
  sm: { placca: "h-8 w-8 rounded", logo: "h-7 w-7", px: 28 },
  // Testata dei quintetti
  md: { placca: "h-10 w-10 rounded-md", logo: "h-8 w-8", px: 32 },
  // Card partita e tabellone della pagina partita
  lg: { placca: "h-13 w-13 rounded-md", logo: "h-11 w-11", px: 44 },
} as const;

export function LogoClub({
  logoKey,
  misura = "lg",
  spento = false,
}: {
  logoKey: string | null | undefined;
  misura?: keyof typeof MISURE;
  /** Squadra che ha perso: la placca si abbassa, come il punteggio spento */
  spento?: boolean;
}) {
  const { placca, logo, px } = MISURE[misura];
  const url = fotoUrl(logoKey, "thumb");

  // Senza logo niente placca vuota: solo lo spazio, così le righe restano
  // allineate (capita per le squadre appena promosse).
  if (!url) return <span aria-hidden className={`${placca} shrink-0`} />;

  return (
    <span
      className={`${placca} flex shrink-0 items-center justify-center bg-foreground ${
        spento ? "opacity-70" : ""
      }`}
    >
      {/* alt vuoto: il nome della squadra è sempre scritto accanto, ripeterlo
          farebbe leggere due volte la stessa cosa allo screen reader */}
      <Image src={url} alt="" width={px} height={px} className={`${logo} object-contain`} />
    </span>
  );
}
