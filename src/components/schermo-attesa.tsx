import { MarchioR } from "@/src/components/marchio-r";

// Il marchio R come segnaposto mentre il server prepara la pagina.
//
// Perché non è più in app/loading.tsx (globale): un loading.tsx apre un
// boundary Suspense sopra la pagina, lo streaming parte subito e a headers
// già inviati notFound() non può più mettere il 404 — tutta l'app rispondeva
// 200 col corpo della pagina "non trovata" (soft 404). Verificato togliendo
// il file: /news/<inesistente> torna 404.
//
// Quindi lo si mette solo nelle rotte che non hanno pagine di dettaglio
// sotto di sé, mai in un segmento che contiene un [id] con notFound().
export default function SchermoAttesa() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center py-24">
      <MarchioR className="h-14 w-auto animate-pulse text-brand-vivid" />
    </main>
  );
}
