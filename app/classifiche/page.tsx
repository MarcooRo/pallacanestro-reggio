import { redirect } from "next/navigation";

// Le classifiche vivono dentro /voto: questo redirect tiene in vita i
// link condivisi prima dell'unificazione, filtri compresi.
export default async function ClassifichePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) query.set(k, v);
  }
  const suffisso = query.size > 0 ? `?${query.toString()}` : "";
  redirect(`/voto${suffisso}`);
}
