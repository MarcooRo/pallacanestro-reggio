// Coda dei contenuti social: lista raggruppata per stato, bozze in cima.
// Chi non è admin riceve 404, non 403: la pagina non deve nemmeno
// dichiarare di esistere.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { richiediAdmin } from "@/src/lib/identita/admin";
import { dataOra } from "@/src/lib/date";
import {
  NOME_PIATTAFORMA,
  NOME_STATO,
  ORDINE_STATI,
} from "@/src/lib/social/etichette";
import {
  getPostsSocial,
  urlAnteprima,
  type RigaPostSocial,
} from "@/src/lib/social/queries";

export const metadata: Metadata = { title: "Admin · Social" };

export default async function AdminSocialPage() {
  await richiediAdmin();

  const righe = await getPostsSocial();
  const perStato = new Map<string, RigaPostSocial[]>();
  for (const riga of righe) {
    const lista = perStato.get(riga.post.status) ?? [];
    lista.push(riga);
    perStato.set(riga.post.status, lista);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 lg:max-w-2xl">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Admin · Social</h1>
        <Link href="/admin" className="text-sm font-semibold text-muted hover:text-brand">
          ← Admin
        </Link>
      </div>
      <p className="text-sm text-muted">
        I post preparati dall&apos;AI arrivano qui come bozze: si approvano da
        questa pagina, mai da fuori.
      </p>
      <Link
        href="/admin/social/template"
        className="self-start text-sm font-semibold text-brand-vivid hover:text-brand"
      >
        Guarda tutti i template grafici →
      </Link>

      {righe.length === 0 && (
        <p className="rounded-md border border-border p-4 text-sm text-muted">
          Nessun post in coda.
        </p>
      )}

      {ORDINE_STATI.filter((s) => perStato.has(s)).map((stato) => (
        <section key={stato} className="flex flex-col gap-2">
          <h2 className="text-sm font-black uppercase tracking-wide">
            {NOME_STATO[stato]}
          </h2>
          <div className="flex flex-col gap-2">
            {perStato.get(stato)!.map((riga) => (
              <RigaPost key={riga.post.id} riga={riga} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function RigaPost({ riga }: { riga: RigaPostSocial }) {
  const { post, anteprima, numeroMedia } = riga;
  const inizioCaption =
    post.caption.length > 60 ? `${post.caption.slice(0, 60).trimEnd()}…` : post.caption;

  return (
    <Link
      href={`/admin/social/${post.id}`}
      className="flex items-center gap-3 rounded-md border border-border p-2 hover:bg-surface"
    >
      {anteprima ? (
        <Image
          src={urlAnteprima(anteprima)}
          alt=""
          width={56}
          height={70}
          className="h-[70px] w-14 shrink-0 rounded-sm border border-border object-cover"
        />
      ) : (
        <div className="flex h-[70px] w-14 shrink-0 items-center justify-center rounded-sm border border-border text-xs text-muted">
          —
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold">
          {inizioCaption || <span className="text-muted">(senza caption)</span>}
        </p>
        <p className="text-xs text-muted">
          {NOME_PIATTAFORMA[post.platform] ?? post.platform}
          {post.kind === "carousel" ? ` · carosello (${numeroMedia})` : ""}
          {post.scheduledAt ? ` · programmato ${dataOra(post.scheduledAt)}` : ""}
          {` · da ${post.source}`}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted">{post.status}</span>
    </Link>
  );
}
