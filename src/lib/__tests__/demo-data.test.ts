import { describe, expect, it } from "vitest";
import { DEMO_DATA_ENABLED, obterDadosDemo, sigmaDemoData } from "../demo-data";

describe("dados de demonstração", () => {
  it("ficam desativados por padrão", () => expect(DEMO_DATA_ENABLED).toBe(false));
  it("nunca são liberados sem variável explícita", () => expect(() => obterDadosDemo()).toThrow(/desativados/));
  it("não contêm contatos pessoais reais", () => expect(JSON.stringify(sigmaDemoData)).not.toMatch(/@|CPF|telefone/i));
  it("cobrem os perfis operacionais essenciais", () => expect(sigmaDemoData.obreiros).toHaveLength(6));
  it("incluem rascunho e cancelado para regressão", () => expect(sigmaDemoData.lancamentos.map((item) => item.status)).toEqual(expect.arrayContaining(["Rascunho", "Cancelado"])));
});
