import { redirect } from "next/navigation";

import { isAdmin } from "@/src/lib/identita/admin";
import { accediAdmin } from "@/src/lib/identita/azioni";

// L'unico login dell'app: la password del pannello. I tifosi non passano
// mai di qui — per loro non esistono account.

export default async function AccessoAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  const { errore } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <h1 className="display text-4xl">
        Pannello<span className="text-brand-vivid">.</span>
      </h1>

      {errore && (
        <p className="border-l-2 border-brand-vivid bg-brand-tint px-3 py-2 text-sm text-brand-vivid">
          {errore}
        </p>
      )}

      <form action={accediAdmin} className="flex flex-col gap-3">
        <label className="eyebrow" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="taglio-sm border border-border-strong bg-surface-2 px-3 py-3 outline-none transition-colors focus:border-brand-vivid"
        />
        <button
          type="submit"
          className="taglio-sm display mt-2 bg-brand px-4 py-3 text-xl text-on-brand transition-colors hover:bg-brand-hover"
        >
          Entra
        </button>
      </form>
    </main>
  );
}
