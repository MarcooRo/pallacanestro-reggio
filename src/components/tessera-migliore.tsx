// Tessera "migliore": la statistica a grandi cifre, il giocatore sotto.
// Usata dai leader stagionali (squadra) e dai migliori della partita.

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";

export function TesseraMigliore({
  etichetta,
  valore,
  firstName,
  lastName,
  photoKey,
  sotto,
}: {
  etichetta: string;
  valore: string;
  firstName: string;
  lastName: string;
  photoKey: string | null;
  sotto?: string;
}) {
  return (
    <div className="taglio-sm card flex flex-col items-center gap-1.5 px-2 py-3 text-center">
      <span className="eyebrow">{etichetta}</span>
      <span className="score text-2xl font-bold text-brand-vivid">{valore}</span>
      <AvatarGiocatore
        firstName={firstName}
        lastName={lastName}
        photoKey={photoKey}
        dimensione={36}
      />
      <span className="w-full truncate text-[11px] font-bold uppercase tracking-tight">
        {lastName}
      </span>
      {sotto && (
        <span className="w-full truncate text-[10px] text-muted">{sotto}</span>
      )}
    </div>
  );
}
