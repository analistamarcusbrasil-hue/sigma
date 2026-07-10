import type { Obreiro } from "@/types";

export const modulos = [
  {
    nome: "Dashboard",
    href: "/dashboard",
    descricao: "Painel principal da gestão atual.",
  },
  {
    nome: "Obreiros",
    href: "/obreiros",
    descricao: "Cadastro único de obreiros da Loja e visitantes.",
  },
  {
    nome: "Tesouraria",
    href: "/tesouraria",
    descricao: "Mensalidades, tronco, receitas, despesas e custos fixos.",
  },
  {
    nome: "Chancelaria",
    href: "/chancelaria",
    descricao: "Sessões, presença, cargos em sessão e frequência.",
  },
  {
    nome: "Secretaria",
    href: "/secretaria",
    descricao: "Atas, balaústres, ações, processos e decisões da Loja.",
  },
  {
    nome: "Prestação de Contas",
    href: "/prestacao-contas",
    descricao: "Relatório sintético e analítico de receitas, despesas, saldo e repasse.",
  },
  {
    nome: "Configurações",
    href: "/configuracoes",
    descricao: "Cadastro da gestão, diretoria, saldo inicial e repasse anterior.",
  },
  {
    nome: "Backup",
    href: "/backup",
    descricao: "Backup, restauração e proteção dos dados locais.",
  },
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
    dataCadastro: "2026-07-09",
    observacoes: "",
  },
  {
    id: "2",
    nome: "Eduardo",
    grau: "Mestre Maçom",
    cargo: "Venerável Mestre",
    telefone: "",
    email: "",
    situacao: "Ativo",
    dataCadastro: "2026-07-09",
    observacoes: "",
  },
  {
    id: "3",
    nome: "Sadala",
    grau: "Aprendiz Maçom",
    cargo: "Tesoureiro",
    telefone: "",
    email: "",
    situacao: "Ativo",
    dataCadastro: "2026-07-09",
    observacoes: "",
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
  {
    nome: "Backup",
    href: "/backup",
    descricao: "Backup, restauração e proteção dos dados locais.",
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
