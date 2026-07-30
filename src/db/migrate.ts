// Applica le migrazioni in ./drizzle sulla connessione diretta.
// Uso: bun run db:migrate (le env arrivano da .env.local)

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error("DIRECT_URL non impostata");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle" });
  await client.end();
  console.log("Migrazioni applicate.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
