// Cron: coda social (pubblicazione su Meta). Protetto da CRON_SECRET.
// Sulla VPS va in crontab ogni 5 minuti: la corsa a vuoto costa una query.

import { handlerCron } from "@/src/lib/cron/handler";
import { jobSocial } from "@/src/lib/cron/jobs";

// I container Instagram si aspettano col poll: un carosello pieno può
// stare nel giro dei minuti, non dei secondi.
export const maxDuration = 300;

export const GET = handlerCron("social", () => jobSocial());
