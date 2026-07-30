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
        <h1 className="text-2xl font-bold">Accedi</h1>
        <p className="mt-1 text-sm text-muted">
          Ti mandiamo un codice via email. Niente password.
        </p>
      </div>

      {errore && (
        <p className="rounded-md bg-brand-tint px-3 py-2 text-sm text-brand">
          {errore}
        </p>
      )}

      <form action={inviaOtp} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="nome@esempio.it"
          className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="mt-2 rounded-md bg-brand px-4 py-2 font-semibold text-on-brand hover:bg-brand-hover"
        >
          Inviami il codice
        </button>
      </form>
    </main>
  );
}
