export type MesAno = {
  id: string;
  nome: string;
};

const nomesMeses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function gerarMesesDoAno(ano: number): MesAno[] {
  return nomesMeses.map((nome, index) => {
    const numeroMes = String(index + 1).padStart(2, "0");

    return {
      id: `${ano}-${numeroMes}`,
      nome: `${nome}/${ano}`,
    };
  });
}

export function anoAtualSistema() {
  return new Date().getFullYear();
}

export function mesAtualDoSistemaNoAno(ano: number) {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

export function proximoMesValido(ano: number) {
  return `${ano}-01`;
}
