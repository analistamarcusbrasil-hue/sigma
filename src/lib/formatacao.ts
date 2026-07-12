import { numeroSeguro } from "./financeiro";

export function moedaBR(valor: unknown) {
  return numeroSeguro(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function dataBR(valor: string | null | undefined) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return "—";
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function ordenarPorNome<T extends { nome: string }>(itens: T[]) {
  return [...itens].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}
