import { loadEnvFile } from "node:process";

import { defineConfig } from "drizzle-kit";

// drizzle-kit gira sotto Node e non legge .env.local da solo.
try {
  loadEnvFile(".env.local");
} catch {
  // assente in CI: le env arrivano dall'ambiente
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    // Connessione diretta (non pooled) per le migrazioni e drizzle studio.
    url: process.env.DIRECT_URL!,
  },
});
