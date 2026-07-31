import { redirect } from "next/navigation";

import { verificaOtp } from "@/src/lib/auth/actions";

export default async function VerificaPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; errore?: string }>;
}) {
  const { email, errore } = await searchParams;
  if (!email) redirect("/accesso");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="display text-4xl">Controlla la posta</h1>
        <p className="mt-2 text-sm text-muted">
          Abbiamo scritto a <strong className="text-foreground">{email}</strong>:
          clicca il link nell&apos;email, oppure inserisci qui il codice se
          presente.
        </p>
      </div>

      {errore && (
        <p className="border-l-2 border-brand-vivid bg-brand-tint px-3 py-2 text-sm text-brand-vivid">
          {errore}
        </p>
      )}

      <form action={verificaOtp} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <label className="eyebrow" htmlFor="token">
          Codice di accesso
        </label>
        <input
          id="token"
          name="token"
          type="text"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          className="score taglio-sm border border-border bg-surface-2 px-3 py-3 text-center text-2xl tracking-[0.4em] outline-none transition-colors focus:border-brand-vivid"
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
