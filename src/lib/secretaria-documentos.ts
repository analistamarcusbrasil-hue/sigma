export const statusSecretaria = ["Rascunho", "Em revisão", "Aguardando aprovação", "Aprovado", "Arquivado", "Cancelado"] as const;
export type StatusSecretaria = (typeof statusSecretaria)[number];
export type CategoriaSecretaria = "Balaústre" | "Ata Administrativa";

export const tiposPorCategoria: Record<CategoriaSecretaria, string[]> = {
  "Balaústre": ["Balaústre de Sessão Ordinária", "Balaústre de Sessão Magna"],
  "Ata Administrativa": ["Ata de Reunião Administrativa", "Ata de Diretoria", "Documento avulso da Secretaria"],
};

export type CargosDocumento = {
  veneravelMestre: string;
  secretario: string;
  orador: string;
  tesoureiro: string;
  chanceler: string;
  primeiroVigilante: string;
  segundoVigilante: string;
};

export type DeliberacaoSecretaria = {
  id?: string;
  descricao: string;
  responsavel: string;
  prazo: string;
  status: "Pendente" | "Em andamento" | "Concluída" | "Cancelada";
};

export type DocumentoSecretariaProfissional = {
  id?: string;
  lojaId: string;
  administracaoId: string;
  sessaoId: string;
  numero: string;
  categoria: CategoriaSecretaria;
  tipo: string;
  data: string;
  grau: string;
  horarioInicio: string;
  horarioAberturaLivroLei: string;
  horarioEncerramento: string;
  cargos: CargosDocumento;
  expediente: string;
  ordemDia: string;
  quartoHora: string;
  troncoSolidariedade: string;
  palavraBemOrdem: string;
  visitantes: string;
  encerramento: string;
  anotacoesBrutas: string;
  textoOficial: string;
  status: StatusSecretaria;
  temFinanceiro: boolean;
  temPresenca: boolean;
  oradorAplicavel: boolean;
  pdfUrl: string;
  versao: number;
  aprovadoEm: string;
  reaberturaJustificativa: string;
  deliberacoes: DeliberacaoSecretaria[];
};

export const cargosVazios: CargosDocumento = {
  veneravelMestre: "", secretario: "", orador: "", tesoureiro: "", chanceler: "",
  primeiroVigilante: "", segundoVigilante: "",
};

export function documentoVazio(categoria: CategoriaSecretaria, lojaId = ""): DocumentoSecretariaProfissional {
  const hoje = new Date().toISOString().slice(0, 10);
  return {
    lojaId, administracaoId: "", sessaoId: "", numero: "", categoria,
    tipo: tiposPorCategoria[categoria][0], data: hoje, grau: categoria === "Balaústre" ? "Aprendiz Maçom" : "Administrativa / Sem Grau",
    horarioInicio: "", horarioAberturaLivroLei: "", horarioEncerramento: "", cargos: { ...cargosVazios },
    expediente: "", ordemDia: "", quartoHora: "", troncoSolidariedade: "", palavraBemOrdem: "",
    visitantes: "", encerramento: "", anotacoesBrutas: "", textoOficial: "", status: "Rascunho",
    temFinanceiro: false, temPresenca: false, oradorAplicavel: false, pdfUrl: "", versao: 1,
    aprovadoEm: "", reaberturaJustificativa: "", deliberacoes: [],
  };
}

function trecho(titulo: string, conteudo: string) {
  return conteudo.trim() ? `${titulo}: ${conteudo.trim()}` : "";
}

export function gerarTextoOficial(documento: DocumentoSecretariaProfissional, lojaNome: string, gestaoNome: string) {
  const data = documento.data ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${documento.data}T12:00:00Z`)) : "data não informada";
  const cargos = Object.entries(documento.cargos).filter(([, nome]) => nome.trim()).map(([cargo, nome]) => `${cargo.replace(/([A-Z])/g, " $1").toLowerCase()}: ${nome}`).join("; ");
  const deliberacoes = documento.deliberacoes.filter((item) => item.descricao.trim()).map((item, indice) => `${indice + 1}. ${item.descricao}${item.responsavel ? ` — responsável: ${item.responsavel}` : ""}${item.prazo ? `, prazo: ${item.prazo.split("-").reverse().join("/")}` : ""}.`).join("\n");
  return [
    `${documento.tipo.toUpperCase()} Nº ${documento.numero || "[a definir]"}`,
    `Aos ${data}, na ${lojaNome || "Loja"}, durante a gestão ${gestaoNome || "vigente"}, realizou-se ${documento.categoria === "Balaústre" ? "sessão" : "reunião administrativa"}${documento.grau ? ` no grau ${documento.grau}` : ""}.`,
    documento.horarioInicio ? `Os trabalhos tiveram início às ${documento.horarioInicio}${documento.horarioAberturaLivroLei ? `, com abertura do Livro da Lei às ${documento.horarioAberturaLivroLei}` : ""}.` : "",
    trecho("Cargos e oficiais", cargos), trecho("Expediente", documento.expediente), trecho("Ordem do Dia", documento.ordemDia),
    trecho("Quarto de Hora", documento.quartoHora), trecho("Tronco de Solidariedade", documento.troncoSolidariedade),
    trecho("Palavra ao Bem da Ordem", documento.palavraBemOrdem), trecho("Visitantes", documento.visitantes),
    deliberacoes ? `Deliberações:\n${deliberacoes}` : "", trecho("Encerramento", documento.encerramento),
    documento.horarioEncerramento ? `Nada mais havendo, os trabalhos foram encerrados às ${documento.horarioEncerramento}.` : "Nada mais havendo, encerrou-se o presente registro.",
    "Depois de lido e aprovado, o presente documento será assinado pelos oficiais competentes.",
  ].filter(Boolean).join("\n\n");
}

