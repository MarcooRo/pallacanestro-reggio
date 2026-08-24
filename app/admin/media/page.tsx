// La libreria foto: si carica dal telefono, al palazzetto, tra un quarto e
// l'altro — la pagina è pensata per quello, quindi didascalia e tag sono
// facoltativi (si raffinano dopo, foto per foto) e l'unica cosa obbligatoria
// è scegliere i file. Sono comunque ciò su cui l'AI si basa per scegliere le
// foto (list_media): scriverli bene resta metà del lavoro.
// Secondo ingresso: import da URL, per le immagini già online.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormCaricaFoto } from "@/src/components/form-carica-foto";
import { FormImportaUrl } from "@/src/components/form-importa-url";
import { richiediAdmin } from "@/src/lib/identita/admin";
import { dataOra } from "@/src/lib/date";
import { cancellaFoto, modificaFoto } from "@/src/lib/media/actions";
import { elencaAssetsAdmin } from "@/src/lib/media/libreria";

export const metadata: Metadata = { title: "Admin · Foto" };

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ esito?: string }>;
}) {
  await richiediAdmin();

  const { esito } = await searchParams;
  const assets = await elencaAssetsAdmin();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 lg:max-w-2xl">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Admin · Foto</h1>
        <Link href="/admin" className="text-sm font-semibold text-muted hover:text-brand">
          ← Admin
        </Link>
      </div>

      {esito && (
        <p className="rounded-md bg-brand-tint px-3 py-2 text-sm font-semibold text-brand">
          {esito}
        </p>
      )}

      <FormCaricaFoto />
      <FormImportaUrl />

      {assets.length === 0 && (
        <p className="rounded-md border border-border p-4 text-sm text-muted">
          La libreria è vuota: la prima foto si carica qui sopra.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {assets.map((a) => (
          <section
            key={a.id}
            className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row"
          >
            {a.status === "ready" ? (
              <a href={a.url} target="_blank" rel="noreferrer" className="shrink-0">
                <Image
                  src={a.url}
                  alt={a.caption ?? ""}
                  width={128}
                  height={128}
                  className="h-32 w-32 rounded-sm border border-border object-cover"
                />
              </a>
            ) : (
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-sm border border-border text-center text-xs text-muted">
                pending
                <br />
                (upload MCP a metà)
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-xs text-muted">
                {a.width && a.height ? `${a.width}×${a.height} · ` : ""}
                {a.takenAt ? `${dataOra(a.takenAt)} · ` : ""}
                da {a.source}
                {a.usi > 0
                  ? ` · usata in ${a.usi === 1 ? "1 post" : `${a.usi} post`}`
                  : ""}
              </p>
              {/* Provenienza in chiaro: una foto presa da un sito non è
                  nostra, e chi approva il post deve saperlo prima, non dopo */}
              {a.originUrl && (
                <p className="text-xs text-brand-vivid">
                  presa da{" "}
                  <a
                    href={a.originUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all underline"
                  >
                    {a.originUrl}
                  </a>
                </p>
              )}
              <form action={modificaFoto} className="flex flex-col gap-2">
                <input type="hidden" name="assetId" value={a.id} />
                <input
                  type="text"
                  name="caption"
                  defaultValue={a.caption ?? ""}
                  placeholder="Didascalia"
                  className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
                />
                <input
                  type="text"
                  name="tags"
                  defaultValue={a.tags.join(" ")}
                  placeholder="Tag"
                  className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="rounded-md border border-border-strong px-3 py-1 text-sm font-semibold hover:bg-surface"
                  >
                    Salva
                  </button>
                  {a.usi === 0 && (
                    <button
                      type="submit"
                      formAction={cancellaFoto}
                      className="rounded-md px-3 py-1 text-sm font-semibold text-muted hover:text-brand"
                    >
                      Cancella
                    </button>
                  )}
                </div>
              </form>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
