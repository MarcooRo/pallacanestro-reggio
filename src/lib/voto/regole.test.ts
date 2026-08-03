import { describe, expect, it } from "bun:test";

import { finestraAperta, validaScelte } from "@/src/lib/voto/regole";

const tra1h = new Date("2026-01-10T22:00:00Z");
const adesso = new Date("2026-01-10T21:00:00Z");

describe("finestraAperta", () => {
  it("aperta: stato open e scadenza futura", () => {
    expect(finestraAperta({ votingState: "open", votingClosesAt: tra1h }, adesso)).toBe(true);
  });

  it("chiusa se lo stato non è open, anche con scadenza futura", () => {
    for (const votingState of ["closed", "tallied"]) {
      expect(finestraAperta({ votingState, votingClosesAt: tra1h }, adesso)).toBe(false);
    }
  });

  it("chiusa se la scadenza è passata, anche con stato open", () => {
    expect(
      finestraAperta({ votingState: "open", votingClosesAt: adesso }, tra1h),
    ).toBe(false);
  });

  it("chiusa se manca la scadenza", () => {
    expect(finestraAperta({ votingState: "open", votingClosesAt: null }, adesso)).toBe(false);
  });
});

describe("validaScelte", () => {
  const votabili = new Set(["v1", "v2", "v3", "v4"]);
  const voto = (s: Partial<Parameters<typeof validaScelte>[0]>) =>
    validaScelte(
      {
        bestPlayerId: "v1",
        optionalAId: null,
        optionalBId: null,
        favoritePlayerId: null,
        ...s,
      },
      votabili,
    );

  it("valido col solo Best", () => {
    expect(voto({})).toBeNull();
  });

  it("valido completo con giocatori distinti", () => {
    expect(voto({ optionalAId: "v2", optionalBId: "v3", favoritePlayerId: "v4" })).toBeNull();
  });

  it("il Preferito può coincidere con Best o con un facoltativo", () => {
    expect(voto({ favoritePlayerId: "v1" })).toBeNull();
    expect(voto({ optionalAId: "v2", favoritePlayerId: "v2" })).toBeNull();
  });

  it("Best obbligatorio", () => {
    expect(voto({ bestPlayerId: "" })).toMatch(/obbligatorio/);
  });

  it("facoltativi diversi dal Best", () => {
    expect(voto({ optionalAId: "v1" })).toMatch(/diversi dal migliore/);
    expect(voto({ optionalBId: "v1" })).toMatch(/diversi dal migliore/);
  });

  it("facoltativi diversi tra loro", () => {
    expect(voto({ optionalAId: "v2", optionalBId: "v2" })).toMatch(/due giocatori diversi/);
  });

  it("rifiuta giocatori non votabili per la partita", () => {
    expect(voto({ bestPlayerId: "estraneo" })).toMatch(/non è votabile/);
    expect(voto({ optionalAId: "estraneo" })).toMatch(/non è votabile/);
    expect(voto({ favoritePlayerId: "estraneo" })).toMatch(/non è votabile/);
  });
});
