// Cron: promemoria. Protetto da CRON_SECRET (Bearer o ?secret=).

import { handlerCron } from "@/src/lib/cron/handler";
import { jobPromemoria } from "@/src/lib/cron/jobs";

export const maxDuration = 60;

export const GET = handlerCron("promemoria", () => jobPromemoria());
