// Imposta (o cambia) la password del pannello admin: hash scrypt in
// app_settings. Uso: bun scripts/imposta-password.ts <password ≥8 caratteri>
// Va lanciato con un DATABASE_URL che punta al database giusto (.env.local).

import { loadEnvFile } from "node:process";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { appSettings } from "@/src/db/schema";
import {
  CHIAVE_HASH_ADMIN,
  hashPassword,
} from "@/src/lib/identita/password";

try {
  loadEnvFile(".env.local");
} catch {
  // assente sul server: le env arrivano dall'ambiente
}

const [password] = process.argv.slice(2);
if (!password || password.length < 8) {
  console.error("Uso: bun scripts/imposta-password.ts <password ≥8 caratteri>");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
// casing come in drizzle.config.ts: le colonne nel DB sono snake_case
const db = drizzle(client, { casing: "snake_case" });

const hash = hashPassword(password);
const [esistente] = await db
  .select({ key: appSettings.key })
  .from(appSettings)
  .where(eq(appSettings.key, CHIAVE_HASH_ADMIN))
  .limit(1);

if (esistente) {
  await db
    .update(appSettings)
    .set({ value: hash, updatedAt: new Date() })
    .where(eq(appSettings.key, CHIAVE_HASH_ADMIN));
} else {
  await db.insert(appSettings).values({ key: CHIAVE_HASH_ADMIN, value: hash });
}

await client.end();
console.log("Password admin impostata.");
