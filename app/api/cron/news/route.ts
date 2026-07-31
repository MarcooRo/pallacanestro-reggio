// Cron: news. Protetto da CRON_SECRET (Bearer o ?secret=).

import { handlerCron } from "@/src/lib/cron/handler";
import { jobNews } from "@/src/lib/cron/jobs";

export const maxDuration = 60;

export const GET = handlerCron("news", () => jobNews());
