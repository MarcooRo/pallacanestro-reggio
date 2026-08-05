import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { inviaRecuperoPassword } from "@/src/lib/auth/actions";
import { getUtente } from "@/src/lib/auth/session";

export const metadata: Metadata = { title: "Password dimenticata" };

export default async function RecuperaPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string; inviata?: string }>;
}) {
  if (await getUtente()) redirect("/");
  const { errore, inviata } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="display text-4xl">
          Password<span className="text-brand-vivid">?</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Scrivi la tua email: arriva un link per rifarla.
        </p>
      </div>

      {errore && (
        <p className="border-l-2 border-brand-vivid bg-brand-tint px-3 py-2 text-sm text-brand-vivid">
          {errore}
        </p>
      )}

      {inviata ? (
        // Nessuna conferma che l'indirizzo esista: da qui non si scopre chi
        // è registrato.
        <div className="taglio-sm card flex flex-col gap-3 p-4">
          <p className="text-sm">
            Se quell&apos;email ha un account, il link è partito. Controlla la
            posta (anche lo spam): vale una volta e scade.
          </p>
          <Link href="/accesso" className="eyebrow text-brand-vivid">
            torna all&apos;accesso →
          </Link>
        </div>
      ) : (
        <form action={inviaRecuperoPassword} className="flex flex-col gap-3">
          <label className="eyebrow" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nome@esempio.it"
            className="taglio-sm border border-border-strong bg-surface-2 px-3 py-3 outline-none transition-colors focus:border-brand-vivid"
          />
          <button
            type="submit"
            className="taglio-sm display mt-2 bg-brand px-4 py-3 text-xl text-on-brand transition-colors hover:bg-brand-hover"
          >
            Mandami il link
          </button>
        </form>
      )}

      {!inviata && (
        <p className="text-center text-sm text-muted">
          Te la ricordi?{" "}
          <Link href="/accesso" className="font-bold text-brand-vivid underline">
            Entra
          </Link>
        </p>
      )}
    </main>
  );
}
