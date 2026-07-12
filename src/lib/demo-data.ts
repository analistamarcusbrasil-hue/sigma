export const DEMO_DATA_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true";

export const sigmaDemoData = {
  loja: { nome: "Loja Demo SIGMA", numero: "000", oriente: "Ambiente de demonstração" },
  obreiros: [
    { id: "demo-veneravel", nome: "Venerável Mestre Demo", situacao: "Ativo" },
    { id: "demo-secretario", nome: "Secretário Demo", situacao: "Ativo" },
    { id: "demo-tesoureiro", nome: "Tesoureiro Demo", situacao: "Ativo" },
    { id: "demo-chanceler", nome: "Chanceler Demo", situacao: "Ativo" },
    { id: "demo-regular", nome: "Obreiro Regular Demo", situacao: "Ativo" },
    { id: "demo-inadimplente", nome: "Obreiro Inadimplente Demo", situacao: "Ativo" },
  ],
  gestao: { nome: "Gestão Demo 2026", saldoPositivo: 5000, caixa: 1500, banco: 3500, obrigacoes: 800, creditos: 400 },
  lancamentos: [
    { natureza: "Entrada", origem: "Mensalidade", valor: 500, status: "Lançado", comprovante: true },
    { natureza: "Entrada", origem: "Tronco", valor: 250, status: "Lançado", comprovante: true },
    { natureza: "Entrada", origem: "Manual", valor: 300, status: "Aprovado", comprovante: true },
    { natureza: "Saída", origem: "Manual", valor: 200, status: "Lançado", comprovante: true },
    { natureza: "Saída", origem: "Manual", valor: 120, status: "Lançado", comprovante: false },
    { natureza: "Entrada", origem: "Manual", valor: 999, status: "Rascunho", comprovante: false },
    { natureza: "Saída", origem: "Manual", valor: 999, status: "Cancelado", comprovante: false },
  ],
  fechamentos: ["Aberto", "Fechado", "Aprovado"],
  prestacaoFinal: { status: "Em elaboração", receitas: 1050, despesas: 320, saldoFinal: 4930 },
  repasse: { caixa: 1500, banco: 3500, creditos: 400, obrigacoes: 800, pendenciasFinanceiras: "Comprovante de despesa pendente", pendenciasAdministrativas: "Conferir inventário" },
  patrimonios: [
    { nome: "Mesa do Templo", status: "Ativo", origem: "Recebido", documento: true },
    { nome: "Projetor", status: "Ativo", origem: "Adquirido", documento: false },
    { nome: "Impressora antiga", status: "Baixado", origem: "Recebido", documento: true },
  ],
  documentos: ["Ata Demo", "Balaústre Demo", "Comprovante Demo", "Termo de Repasse Demo", "Documento Pendente Demo"],
} as const;

export function obterDadosDemo() {
  if (!DEMO_DATA_ENABLED) throw new Error("Dados de demonstração desativados. Defina NEXT_PUBLIC_ENABLE_DEMO_DATA=true apenas em homologação.");
  return sigmaDemoData;
}
