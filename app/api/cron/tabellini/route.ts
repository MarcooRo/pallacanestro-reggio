// Cron: tabellini. Protetto da CRON_SECRET (Bearer o ?secret=).

import { handlerCron } from "@/src/lib/cron/handler";
import { jobTabellini } from "@/src/lib/cron/jobs";

export const maxDuration = 60;

export const GET = handlerCron("tabellini", () => jobTabellini());
