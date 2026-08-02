import { MarchioR } from "@/src/components/marchio-r";

// Loading globale delle transizioni di rotta: il marchio R fa da
// segnaposto mentre il server prepara la pagina.
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center py-24">
      <MarchioR className="h-14 w-auto animate-pulse text-brand-vivid" />
    </main>
  );
}
