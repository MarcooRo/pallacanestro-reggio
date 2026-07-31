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
        <h1 className="text-2xl font-bold">Controlla la posta</h1>
        <p className="mt-1 text-sm text-muted">
          Abbiamo scritto a <strong>{email}</strong>: clicca il link
          nell&apos;email, oppure inserisci qui il codice se presente.
        </p>
      </div>

      {errore && (
        <p className="rounded-md bg-brand-tint px-3 py-2 text-sm text-brand">
          {errore}
        </p>
      )}

      <form action={verificaOtp} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <label className="text-sm font-medium" htmlFor="token">
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
          className="rounded-md border border-border bg-background px-3 py-2 text-center text-xl tracking-widest outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="mt-2 rounded-md bg-brand px-4 py-2 font-semibold text-on-brand hover:bg-brand-hover"
        >
          Entra
        </button>
      </form>
    </main>
  );
}
