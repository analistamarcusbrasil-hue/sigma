import { describe, expect, it } from "vitest";
import { documentosPendentes, movimentosDaCompetencia, numeroSeguro, percentual, repasseDivergente, resumoFinanceiro, resumoPatrimonio, saldoInicialLiquido, saldoRepasse, semComprovante, totalDisponivel, totalTronco, valorNaoNegativo, type MovimentoFinanceiro } from "../financeiro";

const movimento = (parcial: Partial<MovimentoFinanceiro>): MovimentoFinanceiro => ({ natureza: "Entrada", valor: 0, status: "Lançado", ...parcial });

describe("valores financeiros seguros", () => {
  it.each([[null, 0], [undefined, 0], ["", 0], ["10,50", 10.5], ["inválido", 0], [Number.NaN, 0]])("normaliza %s", (entrada, esperado) => expect(numeroSeguro(entrada)).toBe(esperado));
  it("calcula o saldo líquido inicial", () => expect(saldoInicialLiquido(5000, 800)).toBe(4200));
  it("calcula o disponível sem duplicar saldo", () => expect(totalDisponivel(1500, 3500)).toBe(5000));
  it.each([[0, true], [10, true], [-1, false], [Number.NaN, false]])("valida não negativo %s", (valor, esperado) => expect(valorNaoNegativo(valor)).toBe(esperado));
});

describe("Livro Caixa e fechamento", () => {
  const itens = [
    movimento({ natureza: "Entrada", valor: 1000, status: "Lançado", data: "2026-01-10", origem: "Mensalidade" }),
    movimento({ natureza: "Saída", valor: 250, status: "Aprovado", data: "2026-01-12" }),
    movimento({ natureza: "Entrada", valor: 999, status: "Rascunho", data: "2026-01-15" }),
    movimento({ natureza: "Saída", valor: 999, status: "Cancelado", data: "2026-01-16" }),
    movimento({ natureza: "Entrada", valor: 50, status: "Lançado", data: "2026-02-01", origem: "Tronco" }),
  ];
  it("entrada aumenta e saída reduz o saldo", () => expect(resumoFinanceiro(itens, 500)).toEqual({ entradas: 1050, saidas: 250, saldoFinal: 1300 }));
  it("rascunho e cancelado não entram nos totais", () => expect(resumoFinanceiro(itens.slice(2), 100).saldoFinal).toBe(150));
  it("filtra a competência sem vazar outro mês", () => expect(movimentosDaCompetencia(itens, "2026-01")).toHaveLength(4));
  it("identifica saída oficial sem comprovante", () => expect(semComprovante(itens[1])).toBe(true));
  it("aceita observação como comprovação", () => expect(semComprovante(movimento({ natureza: "Saída", valor: 20, comprovanteObservacao: "Nota física" }))).toBe(false));
  it("mantém Tronco separado", () => expect(totalTronco(itens)).toBe(50));
  it("trata NaN no fechamento", () => expect(resumoFinanceiro([movimento({ valor: Number.NaN })], Number.NaN).saldoFinal).toBe(0));
});

describe("prestação, repasse, patrimônio e documentos", () => {
  it("calcula saldo líquido do repasse", () => expect(saldoRepasse(1500, 3500, 400, 800)).toBe(4600));
  it("detecta divergência acima da tolerância", () => expect(repasseDivergente(4600, 4599)).toBe(true));
  it("ignora diferença de centavo dentro da tolerância", () => expect(repasseDivergente(4600, 4599.995)).toBe(false));
  it("calcula percentual com total zero", () => expect(percentual(10, 0)).toBe(0));
  it("calcula percentual realizado", () => expect(percentual(75, 100)).toBe(75));
  it("exclui bens baixados do patrimônio ativo", () => expect(resumoPatrimonio([{ valor: 100, status: "Ativo", documentoId: "doc" }, { valor: 999, status: "Baixado" }])).toEqual({ quantidadeAtiva: 1, valorAtivo: 100, semDocumentacao: 0 }));
  it("sinaliza bem ativo sem documentação", () => expect(resumoPatrimonio([{ valor: 100, status: "Ativo" }]).semDocumentacao).toBe(1));
  it("identifica documentos pendentes", () => expect(documentosPendentes([{ status: "Pendente" }, { status: "Aprovado" }, { status: "Rascunho" }])).toHaveLength(2));
});
