import { describe, expect, it } from "bun:test";

import {
  BUCKET_MS,
  finestraBoatoAperta,
  inizioBucket,
  normalizzaOnda,
  TAP_MASSIMI_PER_INVIO,
  tapAmmessi,
  type Bucket,
} from "@/src/lib/boato/regole";

const iso = (ms: number) => new Date(ms).toISOString();
const bucket = (ms: number, taps: number): Bucket => ({
  bucketStart: iso(ms),
  taps,
  bursts: 1,
});

describe("inizioBucket", () => {
  it("arrotonda in basso al bucket da 10 secondi", () => {
    expect(inizioBucket(new Date("2026-09-19T20:00:07.900Z")).toISOString()).toBe(
      "2026-09-19T20:00:00.000Z",
    );
    expect(inizioBucket(new Date("2026-09-19T20:00:10.000Z")).toISOString()).toBe(
      "2026-09-19T20:00:10.000Z",
    );
  });
});

describe("tapAmmessi", () => {
  it("taglia sopra il tetto per invio", () => {
    expect(tapAmmessi(10_000)).toBe(TAP_MASSIMI_PER_INVIO);
  });

  it("scarta negativi, decimali e valori non numerici", () => {
    expect(tapAmmessi(-5)).toBe(0);
    expect(tapAmmessi(3.7)).toBe(3);
    expect(tapAmmessi(Number.NaN)).toBe(0);
  });
});

describe("finestraBoatoAperta", () => {
  const inizio = new Date("2026-09-19T20:30:00.000Z");
  const partita = { startsAt: inizio, status: "scheduled" };

  it("aperta da un quarto d'ora prima della palla a due", () => {
    expect(
      finestraBoatoAperta(partita, new Date(inizio.getTime() - 14 * 60_000)),
    ).toBe(true);
    expect(
      finestraBoatoAperta(partita, new Date(inizio.getTime() - 16 * 60_000)),
    ).toBe(false);
  });

  it("chiusa dopo tre ore, a gara finita, rinviata o annullata", () => {
    expect(
      finestraBoatoAperta(partita, new Date(inizio.getTime() + 4 * 60 * 60_000)),
    ).toBe(false);
    for (const status of ["finished", "postponed", "cancelled"]) {
      expect(finestraBoatoAperta({ startsAt: inizio, status }, inizio)).toBe(false);
    }
  });
});

describe("normalizzaOnda", () => {
  const fine = new Date("2026-09-19T21:00:00.000Z");
  const t = fine.getTime();

  it("riempie i buchi a zero e tiene l'ordine cronologico", () => {
    const onda = normalizzaOnda(
      [bucket(t - 2 * BUCKET_MS, 10), bucket(t, 5)],
      10,
      fine,
      3,
    );
    expect(onda).toEqual([1, 0, 0.5]);
  });

  it("senza picco non divide per zero", () => {
    expect(normalizzaOnda([], 0, fine, 2)).toEqual([0, 0]);
  });

  it("un bucket oltre il picco dichiarato resta a 1", () => {
    expect(normalizzaOnda([bucket(t, 50)], 20, fine, 1)).toEqual([1]);
  });
});
