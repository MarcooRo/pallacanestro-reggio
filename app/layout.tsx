import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { BottomNav } from "@/src/components/bottom-nav";
import { LogoPalla } from "@/src/components/logo-palla";
import { RegistraSw } from "@/src/components/registra-sw";
import { branding } from "@/src/branding";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-lg px-4 py-3">
            {/* text-lg sotto sm: il nome per esteso deve stare su una riga */}
            <Link
              href="/"
              className="display flex items-center gap-2 text-lg text-foreground sm:text-xl"
            >
              <LogoPalla className="h-5 w-5 shrink-0" />
              <span>
                {branding.appName}
                <span className="text-brand">.</span>
              </span>
            </Link>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          {children}
        </div>

        <BottomNav />
      </body>
    </html>
  );
}
