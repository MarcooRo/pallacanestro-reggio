import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

// L'informativa essenziale: l'app non ha account, non traccia, non parla
// con terze parti. L'unico identificativo è il cookie tecnico anonimo.

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="display text-4xl">
        Privacy<span className="text-brand-vivid">.</span>
      </h1>

      <div className="flex flex-col gap-4 text-sm leading-relaxed">
        <p>
          Quest&apos;app non richiede registrazione e non raccoglie dati
          personali: niente email, niente nome, niente telefono.
        </p>
        <p>
          Per ricordare i tuoi voti e mostrarti il tuo storico usiamo un{" "}
          <strong>identificativo casuale e anonimo</strong>, salvato in un
          cookie tecnico su questo dispositivo (durata: un anno) con una copia
          di riserva nella memoria del browser. Non contiene informazioni su
          di te, non serve a tracciarti e non viene condiviso con nessuno. È
          strettamente necessario al funzionamento del voto: per questo non
          richiede un banner di consenso.
        </p>
        <p>
          I voti e i pronostici sono privati: il pubblico vede solo i totali
          aggregati. Il nickname è facoltativo e compare in classifica solo se
          scegli di impostarlo dal tuo profilo.
        </p>
        <p>
          Se attivi le notifiche push, l&apos;indirizzo tecnico della
          sottoscrizione resta sul nostro server e serve solo a inviartele:
          puoi revocarle in ogni momento dal profilo o dalle impostazioni del
          browser.
        </p>
        <p>
          Nessun servizio di analisi o pubblicità di terze parti è presente su
          questo sito. Per rimuovere ogni dato che ti riguarda basta cancellare
          i dati di navigazione del sito: l&apos;identità anonima svanisce con
          loro.
        </p>
        <p className="text-muted">
          App non ufficiale della tifoseria, senza scopo di lucro. Per
          qualsiasi domanda: marcoromanoweb@gmail.com
        </p>
      </div>
    </main>
  );
}
