import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { BottomNav } from "@/src/components/bottom-nav";
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
          <div className="mx-auto flex max-w-lg flex-col px-4 pt-3">
            {/* text-lg sotto sm: il nome per esteso deve stare su una riga */}
            <Link href="/" className="display self-start text-lg text-foreground sm:text-xl">
              {branding.appName}
              <span className="text-brand">.</span>
            </Link>
            <div className="filo-tricolore mt-2 w-24" aria-hidden />
            <div className="pb-2" />
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
