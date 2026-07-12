import { describe, expect, it } from "vitest";
import { dataBR, moedaBR, ordenarPorNome } from "../formatacao";

describe("formatação segura", () => {
  it("formata moeda brasileira", () => expect(moedaBR(1234.5)).toMatch(/R\$\s?1\.234,50/));
  it("não exibe NaN em moeda", () => expect(moedaBR(Number.NaN)).not.toContain("NaN"));
  it("formata data ISO", () => expect(dataBR("2026-07-12")).toBe("12/07/2026"));
  it.each([null, undefined, "", "12/07/2026"])("protege data inválida %s", (valor) => expect(dataBR(valor)).toBe("—"));
  it("ordena obreiros sem alterar a lista original", () => { const itens = [{ nome: "Zélio" }, { nome: "Álvaro" }]; expect(ordenarPorNome(itens).map((item) => item.nome)).toEqual(["Álvaro", "Zélio"]); expect(itens[0].nome).toBe("Zélio"); });
});
