import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { ProviderAccesso } from "@/src/components/accesso-richiesto";
import { BottomNav } from "@/src/components/bottom-nav";
import { LogoPalla } from "@/src/components/logo-palla";
import { MenuLaterale } from "@/src/components/menu-laterale";
import { NavDesktop } from "@/src/components/nav-desktop";
import { RegistraSw } from "@/src/components/registra-sw";
import { branding } from "@/src/branding";
import { getProfilo } from "@/src/lib/auth/session";

import "./globals.css";

// Archivo variabile (peso + larghezza): la stessa famiglia fa i titoli
// da maglia (nero, espanso, corsivo) e il testo corrente.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: branding.appName,
    template: `%s · ${branding.appName}`,
  },
  description: branding.tagline,
  appleWebApp: {
    capable: true,
    title: branding.appShortName,
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  // Installata da iPhone la web app è a tutto schermo (statusBarStyle
  // black-translucent): senza viewport-fit=cover le safe area valgono 0 e
  // sotto la fotocamera resta una striscia scoperta. Con cover le misure
  // arrivano a header e bottom nav, che ci mettono il proprio fondo.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profilo = await getProfilo();
  return (
    <html
      lang="it"
      data-branding={branding.mode}
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
      // Le estensioni del browser (es. LanguageTool) iniettano attributi
      // sull'<html> prima che React si agganci: senza questo, ogni dev
      // session mostra un falso warning di hydration mismatch.
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col">
        <RegistraSw />
        {/* Il fondo dell'header sale fin sopra la fotocamera: la barra di
            stato non deve mostrare la pagina che scorre sotto */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3 lg:max-w-5xl">
            <MenuLaterale admin={profilo?.role === "admin"} />
            {/* Il nome per esteso deve stare su una riga: a 390px con text-lg
                andava a capo ("PALLACANESTRO / REGGIANA") */}
            <Link
              href="/"
              className="display flex flex-1 items-center gap-2 text-base text-foreground sm:text-xl"
            >
              <LogoPalla className="h-5 w-5 shrink-0" />
              <span>
                {branding.appName}
                <span className="text-brand">.</span>
              </span>
            </Link>
            <NavDesktop />
            <Link
              href="/profilo"
              aria-label="Profilo"
              className="-m-2 p-2 text-muted transition-colors hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
              </svg>
            </Link>
          </div>
        </header>

        {/* ProviderAccesso: un solo dialog "serve l'account" per l'app,
            lo aprono le CTA di qualunque pagina. La larghezza non si decide
            più qui: ogni main dichiara la sua (le liste si allargano su
            desktop, le pagine verticali restano strette). */}
        <div className="flex w-full flex-1 flex-col">
          <ProviderAccesso>{children}</ProviderAccesso>
        </div>

        <BottomNav />
      </body>
    </html>
  );
}
