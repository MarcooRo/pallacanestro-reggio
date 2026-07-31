import { redirect } from "next/navigation";

import { inviaOtp } from "@/src/lib/auth/actions";
import { getUtente } from "@/src/lib/auth/session";

export default async function AccessoPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  if (await getUtente()) redirect("/");
  const { errore } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="display text-4xl">
          Entra<span className="text-brand-vivid">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Ti mandiamo un codice via email. Niente password.
        </p>
      </div>

      {errore && (
        <p className="border-l-2 border-brand-vivid bg-brand-tint px-3 py-2 text-sm text-brand-vivid">
          {errore}
        </p>
      )}

      <form action={inviaOtp} className="flex flex-col gap-3">
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
          className="taglio-sm border border-border bg-surface-2 px-3 py-3 outline-none transition-colors focus:border-brand-vivid"
        />
        <button
          type="submit"
          className="taglio-sm display mt-2 bg-brand px-4 py-3 text-xl text-on-brand transition-colors hover:bg-brand-hover"
        >
          Inviami il codice
        </button>
      </form>
    </main>
  );
}
