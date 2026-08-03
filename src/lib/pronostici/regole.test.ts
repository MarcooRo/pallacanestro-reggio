import { describe, expect, it } from "bun:test";

import {
  leggiOpzioni,
  leggiScelta,
  MOLTIPLICATORE_MASSIMO,
  pronosticoAperto,
  PUNTI_BASE_PRONOSTICO,
  puntiVisionario,
  validaOpzioni,
} from "@/src/lib/pronostici/regole";

describe("pronosticoAperto", () => {
  const chiusura = new Date("2026-09-19T20:30:00.000Z");

  it("aperto solo se lo stato è open e la chiusura non è passata", () => {
    const prima = new Date("2026-09-19T20:00:00.000Z");
    const dopo = new Date("2026-09-19T20:31:00.000Z");
    expect(pronosticoAperto({ status: "open", closesAt: chiusura }, prima)).toBe(true);
    expect(pronosticoAperto({ status: "open", closesAt: chiusura }, dopo)).toBe(false);
    expect(pronosticoAperto({ status: "closed", closesAt: chiusura }, prima)).toBe(
      false,
    );
  });
});

describe("puntiVisionario", () => {
  it("la risposta scelta da tutti vale i punti base", () => {
    expect(puntiVisionario(10, 10)).toBe(PUNTI_BASE_PRONOSTICO);
  });

  it("premia la risposta impopolare", () => {
    expect(puntiVisionario(5, 10)).toBeGreaterThan(puntiVisionario(9, 10));
    expect(puntiVisionario(1, 100)).toBe(
      PUNTI_BASE_PRONOSTICO * MOLTIPLICATORE_MASSIMO,
    );
  });

  it("il moltiplicatore è tappato", () => {
    expect(puntiVisionario(1, 10_000)).toBe(
      PUNTI_BASE_PRONOSTICO * MOLTIPLICATORE_MASSIMO,
    );
  });

  it("nessuno ha indovinato o nessuno ha risposto → zero", () => {
    expect(puntiVisionario(0, 10)).toBe(0);
    expect(puntiVisionario(0, 0)).toBe(0);
  });
});

describe("validaOpzioni", () => {
  it("ripulisce, scarta vuoti e doppioni", () => {
    expect(validaOpzioni([" Sì ", "No", "", "  ", "sì"])).toEqual({
      opzioni: ["Sì", "No"],
    });
  });

  it("meno di due risposte valide non è una domanda", () => {
    expect(validaOpzioni(["Solo questa", " "])).toHaveProperty("errore");
  });

  it("rifiuta più di sei risposte", () => {
    expect(validaOpzioni(["1", "2", "3", "4", "5", "6", "7"])).toHaveProperty(
      "errore",
    );
  });
});

describe("lettura del jsonb", () => {
  it("opzioni: tiene solo le stringhe, tollera spazzatura", () => {
    expect(leggiOpzioni(["a", 3, null, "b"])).toEqual(["a", "b"]);
    expect(leggiOpzioni("niente")).toEqual([]);
  });

  it("scelta: solo indici interi", () => {
    expect(leggiScelta({ opzione: 2 })).toBe(2);
    expect(leggiScelta({ opzione: 1.5 })).toBeNull();
    expect(leggiScelta({ altro: 1 })).toBeNull();
    expect(leggiScelta(null)).toBeNull();
  });
});
