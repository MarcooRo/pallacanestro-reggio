"use client";

// Registra il service worker (push + requisito PWA).

import { useEffect } from "react";

export function RegistraSw() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // niente service worker, l'app funziona comunque
      });
    }
  }, []);
  return null;
}
