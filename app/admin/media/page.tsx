// La libreria delle foto proprie: si carica dal telefono, al palazzetto,
// tra un quarto e l'altro — la pagina è pensata per quello. Didascalia e
// tag sono ciò su cui l'AI si basa per scegliere le foto (list_media):
// scriverli bene qui è metà del lavoro.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProfilo } from "@/src/lib/auth/session";
import { dataOra } from "@/src/lib/date";
import { cancellaFoto, caricaFoto, modificaFoto } from "@/src/lib/media/actions";
import { elencaAssetsAdmin } from "@/src/lib/media/libreria";

export const metadata: Metadata = { title: "Admin · Foto" };

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ esito?: string }>;
}) {
  const profilo = await getProfilo();
  if (!profilo || profilo.role !== "admin") notFound();

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

      <form action={caricaFoto} className="flex flex-col gap-3 rounded-md border border-border p-4">
        <p className="text-sm text-muted">
          Didascalia e tag sono quello che l&apos;AI legge per scegliere le
          foto: descrivi cosa si vede, non serve altro.
        </p>
        <input
          type="file"
          name="files"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-on-brand"
        />
        <input
          type="text"
          name="caption"
          placeholder="Didascalia (es. La curva durante il terzo quarto con Trapani)"
          className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
        />
        <input
          type="text"
          name="tags"
          placeholder="Tag separati da spazi (es. palabigi tifosi trapani)"
          className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="self-start rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-on-brand"
        >
          Carica
        </button>
      </form>

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
