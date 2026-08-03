import { describe, expect, it } from "bun:test";

import type { ScelteVoto } from "@/src/lib/voto/regole";
import { calcolaTally } from "@/src/lib/voto/tally";

const voto = (
  best: string,
  a: string | null = null,
  b: string | null = null,
  fav: string | null = null,
): ScelteVoto => ({
  bestPlayerId: best,
  optionalAId: a,
  optionalBId: b,
  favoritePlayerId: fav,
});

describe("calcolaTally", () => {
  it("nessun voto → pagella vuota", () => {
    expect(calcolaTally([])).toEqual([]);
  });

  it("pesa il podio 3-2-1", () => {
    const tally = calcolaTally([voto("A", "B", "C")]);
    expect(tally.find((r) => r.playerId === "A")).toMatchObject({
      bestCount: 1,
      secondCount: 0,
      performancePoints: 3,
    });
    expect(tally.find((r) => r.playerId === "B")).toMatchObject({
      secondCount: 1,
      performancePoints: 2,
    });
    expect(tally.find((r) => r.playerId === "C")).toMatchObject({
      thirdCount: 1,
      performancePoints: 1,
    });
  });

  it("secondo e terzo non sono interscambiabili", () => {
    const [x] = calcolaTally([voto("A", "B")]).filter((r) => r.playerId === "B");
    const [y] = calcolaTally([voto("A", null, "B")]).filter((r) => r.playerId === "B");
    expect(x.performancePoints).toBe(2);
    expect(y.performancePoints).toBe(1);
  });

  it("aggrega più voti e ordina per punti, poi Best", () => {
    const tally = calcolaTally([
      voto("A", "B"),
      voto("A", "C"),
      voto("B", "A"),
      voto("C", "A", "B"),
    ]);
    // A: 2 best (6) + 2 secondi (4) = 10
    // B: 1 best (3) + 1 secondo (2) + 1 terzo (1) = 6
    // C: 1 best (3) + 1 secondo (2) = 5
    expect(tally.map((r) => r.playerId)).toEqual(["A", "B", "C"]);
    expect(tally[0]).toMatchObject({
      bestCount: 2,
      secondCount: 2,
      supportCount: 2,
      performancePoints: 10,
    });
  });

  it("a parità di punti vince chi ha più Best", () => {
    // A: 1 best = 3 punti; B: 3 terzi = 3 punti
    const tally = calcolaTally([
      voto("A", null, "B"),
      voto("C", null, "B"),
      voto("C", null, "B"),
    ]);
    const a = tally.findIndex((r) => r.playerId === "A");
    const b = tally.findIndex((r) => r.playerId === "B");
    expect(tally.find((r) => r.playerId === "A")?.performancePoints).toBe(3);
    expect(tally.find((r) => r.playerId === "B")?.performancePoints).toBe(3);
    expect(a).toBeLessThan(b);
  });

  it("il Preferito conta a parte e può coincidere col Best", () => {
    const tally = calcolaTally([voto("A", null, null, "A"), voto("B", null, null, "A")]);
    expect(tally.find((r) => r.playerId === "A")).toMatchObject({
      bestCount: 1,
      favoriteCount: 2,
      performancePoints: 3,
    });
    // il preferito non dà punti performance
    expect(tally.find((r) => r.playerId === "B")?.performancePoints).toBe(3);
  });
});
