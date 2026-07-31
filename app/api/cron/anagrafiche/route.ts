// Cron: anagrafiche. Protetto da CRON_SECRET (Bearer o ?secret=).

import { handlerCron } from "@/src/lib/cron/handler";
import { jobAnagrafiche } from "@/src/lib/cron/jobs";

export const maxDuration = 60;

export const GET = handlerCron("anagrafiche", () => jobAnagrafiche());
