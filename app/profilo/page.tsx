import Link from "next/link";
import { redirect } from "next/navigation";

import { NotifichePush } from "@/src/components/notifiche-push";
import { esci } from "@/src/lib/auth/actions";
import { getProfilo, getUtente } from "@/src/lib/auth/session";

export default async function ProfiloPage() {
  const utente = await getUtente();

  if (!utente) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-10 text-center">
        <h1 className="text-2xl font-bold">Profilo</h1>
        <p className="text-sm text-muted">
          Accedi per votare il migliore in campo e comparire nelle classifiche.
        </p>
        <Link
          href="/accesso"
          className="rounded-md bg-brand px-4 py-2 font-semibold text-on-brand hover:bg-brand-hover"
        >
          Accedi
        </Link>
      </main>
    );
  }

  const profilo = await getProfilo();
  if (!profilo) redirect("/benvenuto");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Profilo</h1>

      <dl className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div>
          <dt className="text-xs uppercase text-muted">Nickname</dt>
          <dd className="font-semibold">{profilo.nickname}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">Email</dt>
          <dd className="font-semibold">{utente.email}</dd>
        </div>
      </dl>

      <NotifichePush />

      {profilo.role === "admin" && (
        <Link
          href="/admin"
          className="rounded-md bg-brand px-4 py-2 text-center font-semibold text-on-brand hover:bg-brand-hover"
        >
          Pannello admin
        </Link>
      )}

      <form action={esci}>
        <button
          type="submit"
          className="w-full rounded-md border border-border px-4 py-2 font-semibold hover:bg-surface"
        >
          Esci
        </button>
      </form>
    </main>
  );
}
