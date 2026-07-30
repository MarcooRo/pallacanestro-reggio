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
        <h1 className="text-2xl font-bold">Benvenuto</h1>
        <p className="mt-1 text-sm text-muted">
          Scegli il nickname con cui comparirai nelle classifiche. I tuoi voti
          restano privati: si vedono solo gli aggregati.
        </p>
      </div>

      {errore && (
        <p className="rounded-md bg-brand-tint px-3 py-2 text-sm text-brand">
          {errore}
        </p>
      )}

      <form action={creaProfilo} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="nickname">
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
          className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="mt-2 rounded-md bg-brand px-4 py-2 font-semibold text-on-brand hover:bg-brand-hover"
        >
          Inizia
        </button>
      </form>
    </main>
  );
}
