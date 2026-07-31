import { redirect } from "next/navigation";

import { creaProfilo } from "@/src/lib/auth/actions";
import { getProfilo, getUtente } from "@/src/lib/auth/session";

export default async function BenvenutoPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  const utente = await getUtente();
  if (!utente) redirect("/accesso");
  if (await getProfilo()) redirect("/");

  const { errore } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="display text-4xl">
          Sei dei nostri<span className="text-brand-vivid">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Scegli il nickname con cui comparirai nelle classifiche. I tuoi voti
          restano privati: si vedono solo gli aggregati.
        </p>
      </div>

      {errore && (
        <p className="border-l-2 border-brand-vivid bg-brand-tint px-3 py-2 text-sm text-brand-vivid">
          {errore}
        </p>
      )}

      <form action={creaProfilo} className="flex flex-col gap-3">
        <label className="eyebrow" htmlFor="nickname">
          Nickname
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          required
          minLength={3}
          maxLength={20}
          autoComplete="off"
          className="taglio-sm border border-border bg-surface-2 px-3 py-3 outline-none transition-colors focus:border-brand-vivid"
        />
        <button
          type="submit"
          className="taglio-sm display mt-2 bg-brand px-4 py-3 text-xl text-on-brand transition-colors hover:bg-brand-hover"
        >
          Inizia
        </button>
      </form>
    </main>
  );
}
