// Client Drizzle con connessione privilegiata. Da usare SOLO in server
// action e route handler: il browser non ha credenziali di database.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// In dev il modulo viene ricaricato a ogni hot reload: la connessione
// va riusata per non esaurire il pool di Supabase.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, {
    // Il transaction pooler di Supabase non supporta i prepared statement.
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema, casing: "snake_case" });
