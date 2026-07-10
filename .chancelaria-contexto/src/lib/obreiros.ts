import { obreirosBase } from "@/lib/mock-data";
import type { Obreiro } from "@/types";

export const CHAVE_OBREIROS = "sigma_obreiros";

type VinculoObreiro = {
  tipo: string;
  quantidade: number;
};

const fontesVinculo = [
  { chave: "sigma_presencas", campo: "obreiroId", tipo: "registro(s) de presença" },
  { chave: "sigma_recebimentos_tesouraria", campo: "obreiroId", tipo: "recebimento(s)" },
  { chave: "sigma_mensalidades", campo: "obreiroId", tipo: "mensalidade(s)" },
  { chave: "sigma_pecas_secretaria", campo: "obreiroId", tipo: "peça(s) de arquitetura" },
  { chave: "sigma_acoes_secretaria", campo: "responsavelId", tipo: "ação(ões) atribuída(s)" },
  { chave: "sigma_processos_secretaria", campo: "responsavelId", tipo: "processo(s) atribuído(s)" },
] as const;

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizarObreiro(obreiro: Partial<Obreiro>): Obreiro {
  return {
    id: obreiro.id ?? "",
    nome: obreiro.nome ?? "",
    grau: obreiro.grau ?? "Aprendiz Maçom",
    cargo: obreiro.cargo ?? "",
    email: obreiro.email ?? "",
    telefone: obreiro.telefone ?? "",
    situacao: obreiro.situacao === "Inativo" ? "Inativo" : "Ativo",
    dataCadastro: obreiro.dataCadastro || hojeISO(),
    observacoes: obreiro.observacoes ?? "",
    tipo: obreiro.tipo ?? "Obreiro da Loja",
    lojaOrigem: obreiro.lojaOrigem ?? "",
  };
}

export function normalizarObreiros(lista: Partial<Obreiro>[]) {
  return lista.map(normalizarObreiro);
}

export function carregarObreiros(): Obreiro[] {
  try {
    const dados = localStorage.getItem(CHAVE_OBREIROS);
    return normalizarObreiros(dados ? JSON.parse(dados) : obreirosBase);
  } catch {
    return normalizarObreiros(obreirosBase);
  }
}

export function salvarObreiros(obreiros: Obreiro[]) {
  localStorage.setItem(CHAVE_OBREIROS, JSON.stringify(obreiros));
}

export function buscarVinculosObreiro(obreiroId: string): VinculoObreiro[] {
  return fontesVinculo.flatMap(({ chave, campo, tipo }) => {
    try {
      const dados = JSON.parse(localStorage.getItem(chave) ?? "[]") as Record<string, unknown>[];
      const quantidade = Array.isArray(dados)
        ? dados.filter((item) => item?.[campo] === obreiroId).length
        : 0;

      return quantidade > 0 ? [{ tipo, quantidade }] : [];
    } catch {
      return [];
    }
  });
}
