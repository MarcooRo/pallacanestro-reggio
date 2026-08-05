import type { Metadata } from "next";
import Link from "next/link";

import { CampoPassword } from "@/src/components/campo-password";
import { impostaNuovaPassword } from "@/src/lib/auth/actions";
import { getUtente } from "@/src/lib/auth/session";

export const metadata: Metadata = { title: "Nuova password" };

export default async function NuovaPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  // Ci si arriva dal link del recupero, che apre una sessione. Senza
  // sessione il link è scaduto (o già usato): si riparte da capo.
  const utente = await getUtente();
  const { errore } = await searchParams;

  if (!utente) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
        <h1 className="display text-4xl">
          Link scaduto<span className="text-brand-vivid">.</span>
        </h1>
        <p className="text-sm text-muted">
          Il link del recupero vale una volta sola. Chiedine un altro.
        </p>
        <Link
          href="/accesso/recupera"
          className="taglio-sm display bg-brand px-4 py-3 text-center text-xl text-on-brand transition-colors hover:bg-brand-hover"
        >
          Nuovo link
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="display text-4xl">
          Nuova password<span className="text-brand-vivid">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Almeno 8 caratteri. Vale da subito, su questo dispositivo sei già
          dentro.
        </p>
      </div>

      {errore && (
        <p className="border-l-2 border-brand-vivid bg-brand-tint px-3 py-2 text-sm text-brand-vivid">
          {errore}
        </p>
      )}

      <form action={impostaNuovaPassword} className="flex flex-col gap-3">
        <label className="eyebrow" htmlFor="password">
          Password
        </label>
        <CampoPassword autoComplete="new-password" />
        <button
          type="submit"
          className="taglio-sm display mt-2 bg-brand px-4 py-3 text-xl text-on-brand transition-colors hover:bg-brand-hover"
        >
          Salva
        </button>
      </form>
    </main>
  );
}
