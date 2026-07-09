import type { Obreiro } from "@/types";

export const modulos = [
  {
    nome: "Prestação de Contas",
    href: "/prestacao-contas",
    descricao: "Relatório mensal e anual de receitas, despesas, saldo e pendências.",
  },
  {
    nome: "Configurações",
    href: "/configuracoes",
    descricao: "Data de início da gestão, ano de trabalho, saldo inicial e dívidas herdadas.",
  },
  { nome: "Dashboard", href: "/dashboard" },
  { nome: "Obreiros", href: "/obreiros" },
  { nome: "Tesouraria", href: "/tesouraria" },
  { nome: "Chancelaria", href: "/chancelaria" },
  { nome: "Secretaria", href: "/secretaria" },
];

export const obreirosBase: Obreiro[] = [
  {
    id: "1",
    nome: "Marcus Brasil",
    grau: "Mestre Maçom",
    cargo: "Secretário",
    telefone: "",
    email: "",
    situacao: "Ativo",
  },
  {
    id: "2",
    nome: "Eduardo",
    grau: "Mestre Maçom",
    cargo: "Venerável Mestre",
    telefone: "",
    email: "",
    situacao: "Ativo",
  },
  {
    id: "3",
    nome: "Sadala",
    grau: "Aprendiz Maçom",
    cargo: "Tesoureiro",
    telefone: "",
    email: "",
    situacao: "Ativo",
  },
];

export const indicadores = [
  { titulo: "Obreiros", valor: "3", detalhe: "Cadastrados inicialmente" },
  { titulo: "Balaústres", valor: "10", detalhe: "Atas registradas em 2026" },
  { titulo: "Pendências", valor: "4", detalhe: "Ações administrativas abertas" },
  { titulo: "Processos", valor: "2", detalhe: "Admissão e regularização" },
];

export const balaustres = [
  {
    numero: "08/2026",
    data: "06/06/2026",
    tipo: "Sessão Ordinária",
    grau: "Aprendiz Maçom",
    status: "Concluído",
  },
  {
    numero: "09/2026",
    data: "20/06/2026",
    tipo: "Sessão Ordinária",
    grau: "Aprendiz Maçom",
    status: "Concluído",
  },
  {
    numero: "10/2026",
    data: "04/07/2026",
    tipo: "Sessão Ordinária",
    grau: "Aprendiz Maçom",
    status: "Em revisão",
  },
];

export const pendencias = [
  {
    acao: "Organizar ordem do dia da próxima sessão",
    responsavel: "Secretário",
    prazo: "Próxima sessão",
    prioridade: "Alta",
  },
  {
    acao: "Atualizar balaústre nº 10/2026",
    responsavel: "Secretário",
    prazo: "Em andamento",
    prioridade: "Alta",
  },
  {
    acao: "Conferir peças de arquitetura entregues",
    responsavel: "Secretário",
    prazo: "Antes da sessão",
    prioridade: "Média",
  },
];

export function classeStatus(status: string) {
  if (["Concluído", "Recebida", "Apresentada", "Ativo", "Pago", "Presente"].includes(status)) {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (["Em revisão", "Em andamento", "Justificado"].includes(status)) {
    return "bg-amber-400/10 text-amber-300";
  }

  return "bg-red-400/10 text-red-300";
}
