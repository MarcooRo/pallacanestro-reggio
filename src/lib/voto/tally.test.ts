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

  it("pesa Best 3 e facoltativi 1", () => {
    const tally = calcolaTally([voto("A", "B", "C")]);
    expect(tally.find((r) => r.playerId === "A")).toMatchObject({
      bestCount: 1,
      supportCount: 0,
      performancePoints: 3,
    });
    expect(tally.find((r) => r.playerId === "B")).toMatchObject({
      supportCount: 1,
      performancePoints: 1,
    });
  });

  it("aggrega più voti e ordina per punti, poi Best", () => {
    const tally = calcolaTally([
      voto("A", "B"),
      voto("A", "C"),
      voto("B", "A"),
      voto("C", "A", "B"),
    ]);
    // A: 2 best + 2 support = 8; B: 1 best + 2 support = 5; C: 1 best + 1 support = 4
    expect(tally.map((r) => r.playerId)).toEqual(["A", "B", "C"]);
    expect(tally[0]).toMatchObject({ bestCount: 2, supportCount: 2, performancePoints: 8 });
  });

  it("a parità di punti vince chi ha più Best", () => {
    // A: 1 best = 3 punti; B: 3 support = 3 punti
    const tally = calcolaTally([
      voto("A", "B"),
      voto("C", "B"),
      voto("C", "B"),
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
