export type NaturezaFinanceira = "Entrada" | "Saída";
export type StatusFinanceiro = "Rascunho" | "Lançado" | "Conferido" | "Aprovado" | "Conciliado" | "Cancelado";

export type MovimentoFinanceiro = {
  natureza: NaturezaFinanceira;
  valor: number | null | undefined;
  status: StatusFinanceiro;
  data?: string;
  comprovanteUrl?: string;
  comprovanteObservacao?: string;
  origem?: string;
};

const statusOficiais: StatusFinanceiro[] = ["Lançado", "Conferido", "Aprovado", "Conciliado"];

export function numeroSeguro(valor: unknown, padrao = 0) {
  if (valor === "" || valor === null || valor === undefined) return padrao;
  const numero = typeof valor === "string" ? Number(valor.replace(",", ".")) : Number(valor);
  return Number.isFinite(numero) ? numero : padrao;
}

export function valorNaoNegativo(valor: unknown) {
  const numero = numeroSeguro(valor, Number.NaN);
  return Number.isFinite(numero) && numero >= 0;
}

export function saldoInicialLiquido(positivo: unknown, obrigacoes: unknown) {
  return numeroSeguro(positivo) - numeroSeguro(obrigacoes);
}

export function totalDisponivel(caixa: unknown, banco: unknown) {
  return numeroSeguro(caixa) + numeroSeguro(banco);
}

export function movimentoOficial(movimento: MovimentoFinanceiro) {
  return statusOficiais.includes(movimento.status);
}

export function movimentosDaCompetencia(movimentos: MovimentoFinanceiro[], competencia: string) {
  return movimentos.filter((movimento) => movimento.data?.slice(0, 7) === competencia);
}

export function resumoFinanceiro(movimentos: MovimentoFinanceiro[], saldoInicial = 0) {
  const oficiais = movimentos.filter(movimentoOficial);
  const entradas = oficiais.filter((item) => item.natureza === "Entrada").reduce((total, item) => total + numeroSeguro(item.valor), 0);
  const saidas = oficiais.filter((item) => item.natureza === "Saída").reduce((total, item) => total + numeroSeguro(item.valor), 0);
  return { entradas, saidas, saldoFinal: numeroSeguro(saldoInicial) + entradas - saidas };
}

export function semComprovante(movimento: MovimentoFinanceiro) {
  return movimentoOficial(movimento) && movimento.natureza === "Saída" && !movimento.comprovanteUrl?.trim() && !movimento.comprovanteObservacao?.trim();
}

export function totalTronco(movimentos: MovimentoFinanceiro[]) {
  return movimentos.filter((item) => movimentoOficial(item) && item.natureza === "Entrada" && item.origem === "Tronco").reduce((total, item) => total + numeroSeguro(item.valor), 0);
}

export function saldoRepasse(caixa: unknown, banco: unknown, creditos: unknown, obrigacoes: unknown) {
  return totalDisponivel(caixa, banco) + numeroSeguro(creditos) - numeroSeguro(obrigacoes);
}

export function repasseDivergente(calculado: unknown, prestacao: unknown, tolerancia = 0.01) {
  return Math.abs(numeroSeguro(calculado) - numeroSeguro(prestacao)) > tolerancia;
}

export function percentual(parte: unknown, total: unknown) {
  const denominador = numeroSeguro(total);
  return denominador > 0 ? (numeroSeguro(parte) / denominador) * 100 : 0;
}

export type BemPatrimonial = { valor: number | null | undefined; status: string; documentoId?: string };
export function resumoPatrimonio(bens: BemPatrimonial[]) {
  const ativos = bens.filter((bem) => bem.status !== "Baixado");
  return {
    quantidadeAtiva: ativos.length,
    valorAtivo: ativos.reduce((total, bem) => total + numeroSeguro(bem.valor), 0),
    semDocumentacao: ativos.filter((bem) => !bem.documentoId?.trim()).length,
  };
}

export function documentosPendentes(documentos: Array<{ status: string; tipo?: string }>) {
  return documentos.filter((documento) => ["Rascunho", "Pendente"].includes(documento.status));
}

