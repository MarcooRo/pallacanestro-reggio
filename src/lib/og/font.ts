// I font per ImageResponse: satori non eredita nulla dal sistema, i file
// vanno caricati esplicitamente e stanno committati nel repo. Un solo
// font (Archivo, lo stesso dell'app) in due pesi.
// path.join(process.cwd(), <letterale>) è il pattern che il file tracing
// di Vercel riconosce: i .ttf finiscono nel bundle della function.

import { readFile } from "node:fs/promises";
import path from "node:path";

interface FontOg {
  name: string;
  data: Buffer;
  weight: 500 | 800;
  style: "normal";
}

let cache: Promise<FontOg[]> | null = null;

export function fontOg(): Promise<FontOg[]> {
  cache ??= Promise.all([
    readFile(path.join(process.cwd(), "src/lib/og/fonts/archivo-v25-latin-500.ttf")),
    readFile(path.join(process.cwd(), "src/lib/og/fonts/archivo-v25-latin-800.ttf")),
  ]).then(([medio, nero]) => [
    { name: "Archivo", data: medio, weight: 500, style: "normal" },
    { name: "Archivo", data: nero, weight: 800, style: "normal" },
  ]);
  return cache;
}
