// Cron: calendario. Protetto da CRON_SECRET (Bearer o ?secret=).

import { handlerCron } from "@/src/lib/cron/handler";
import { jobCalendario } from "@/src/lib/cron/jobs";

export const maxDuration = 60;

export const GET = handlerCron("calendario", () => jobCalendario());
