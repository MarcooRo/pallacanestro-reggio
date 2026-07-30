// In Next 16 il middleware si chiama Proxy. Qui fa una cosa sola:
// tenere viva la sessione Supabase (refresh dei token nei cookie).

import type { NextRequest } from "next/server";

import { updateSession } from "@/src/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Tutto tranne asset statici e immagini
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
