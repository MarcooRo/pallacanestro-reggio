// La fonte di verità sui template OG: nome, dimensioni, schema Zod dei
// parametri, esempi. Sia l'MCP (list_og_templates) sia la pagina admin
// leggono da qui: l'elenco non va duplicato da nessun'altra parte.

import { citazioneNotizia } from "./templates/citazione-notizia";
import { fotoConTesto } from "./templates/foto-con-testo";
import { migliorePartita } from "./templates/migliore-partita";
import { schedaGiocatore } from "./templates/scheda-giocatore";
import { dimensioniTemplate, type TemplateOg } from "./tipi";

// Il registry cancella il tipo dei parametri: ogni template resta tipato
// nel suo file, i consumatori validano con lo schema prima di render.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEMPLATE_OG: Record<string, TemplateOg<any>> = {
  [migliorePartita.nome]: migliorePartita,
  [schedaGiocatore.nome]: schedaGiocatore,
  [fotoConTesto.nome]: fotoConTesto,
  [citazioneNotizia.nome]: citazioneNotizia,
};

export function getTemplateOg(nome: string): TemplateOg<unknown> | null {
  return TEMPLATE_OG[nome] ?? null;
}

export function nomiTemplateOg(): string[] {
  return Object.keys(TEMPLATE_OG);
}

export function tuttiTemplateOg(): TemplateOg<unknown>[] {
  return Object.values(TEMPLATE_OG);
}

export { dimensioniTemplate };
