import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { BottomNav } from "@/src/components/bottom-nav";
import { RegistraSw } from "@/src/components/registra-sw";
import { branding } from "@/src/branding";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: branding.colori.primario,
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // Le estensioni del browser (es. LanguageTool) iniettano attributi
      // sull'<html> prima che React si agganci: senza questo, ogni dev
      // session mostra un falso warning di hydration mismatch.
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col">
        <RegistraSw />
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-lg items-center px-4 py-3">
            <Link href="/" className="text-lg font-bold text-brand">
              {branding.appName}
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
