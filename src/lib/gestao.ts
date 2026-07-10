export type GestaoAtiva = {
  id: string;
  nomeGestao: string;
  gestaoAnteriorRepasse: string;
  dataInicioGestao: string;
  dataFimGestao: string;
  anoTrabalho: number;
  financeiroPositivoRecebido: number;
  financeiroNegativoRecebido: number;
  saldoLiquidoInicial: number;
};

type GestaoSalva = {
  id: string;
  nomeGestao: string;
  gestaoAnteriorRepasse: string;
  dataInicioGestao: string;
  dataFimGestao: string;
  anoTrabalho: number;
  financeiroPositivoRecebido: number;
  financeiroNegativoRecebido: number;
};

function lerLocalStorage<T>(chave: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const valor = localStorage.getItem(chave);
    if (!valor) return fallback;
    return JSON.parse(valor) as T;
  } catch {
    return fallback;
  }
}

export function obterGestaoAtualDoStorage(): GestaoAtiva {
  const anoAtual = new Date().getFullYear();

  if (typeof window === "undefined") {
    return {
      id: "",
      nomeGestao: "",
      gestaoAnteriorRepasse: "",
      dataInicioGestao: "",
      dataFimGestao: "",
      anoTrabalho: anoAtual,
      financeiroPositivoRecebido: 0,
      financeiroNegativoRecebido: 0,
      saldoLiquidoInicial: 0,
    };
  }

  const gestoes = lerLocalStorage<GestaoSalva[]>("sigma_gestoes", []);
  const gestaoAtualId = localStorage.getItem("sigma_gestao_atual_id") ?? "";
  const gestaoAtual = gestoes.find((gestao) => gestao.id === gestaoAtualId);

  if (gestaoAtual) {
    const saldoLiquido =
      Number(gestaoAtual.financeiroPositivoRecebido || 0) -
      Number(gestaoAtual.financeiroNegativoRecebido || 0);

    return {
      id: gestaoAtual.id,
      nomeGestao: gestaoAtual.nomeGestao,
      gestaoAnteriorRepasse: gestaoAtual.gestaoAnteriorRepasse,
      dataInicioGestao: gestaoAtual.dataInicioGestao,
      dataFimGestao: gestaoAtual.dataFimGestao,
      anoTrabalho: Number(gestaoAtual.anoTrabalho || anoAtual),
      financeiroPositivoRecebido: Number(gestaoAtual.financeiroPositivoRecebido || 0),
      financeiroNegativoRecebido: Number(gestaoAtual.financeiroNegativoRecebido || 0),
      saldoLiquidoInicial: saldoLiquido,
    };
  }

  const configAntiga = lerLocalStorage<Record<string, string>>("sigma_configuracao_gestao", {});
  const saldoAntigo = Number(localStorage.getItem("sigma_saldo_anterior") ?? 0);
  const anoSalvo = Number(localStorage.getItem("sigma_ano_trabalho") ?? anoAtual);

  return {
    id: "",
    nomeGestao: configAntiga.nomeGestao ?? "",
    gestaoAnteriorRepasse: configAntiga.gestaoAnteriorRepasse ?? "",
    dataInicioGestao:
      configAntiga.dataInicioGestao ??
      localStorage.getItem("sigma_data_inicio_gestao") ??
      "",
    dataFimGestao: configAntiga.dataFimGestao ?? "",
    anoTrabalho: Number(configAntiga.anoTrabalho ?? anoSalvo),
    financeiroPositivoRecebido: Number(configAntiga.caixaInicial ?? saldoAntigo),
    financeiroNegativoRecebido: Number(configAntiga.dividasHerdadas ?? 0),
    saldoLiquidoInicial: Number(configAntiga.saldoLiquidoInicial ?? saldoAntigo),
  };
}

function criarDataLocal(dataISO: string) {
  if (!dataISO) return null;

  const dataTratada = dataISO.length === 7 ? `${dataISO}-01` : dataISO;
  const partes = dataTratada.split("-").map(Number);

  if (partes.length !== 3) return null;

  const [ano, mes, dia] = partes;
  return new Date(ano, mes - 1, dia, 12, 0, 0);
}

export function dataDentroDaGestao(dataISO: string, gestao: GestaoAtiva) {
  const data = criarDataLocal(dataISO);
  if (!data) return false;

  const inicio = criarDataLocal(gestao.dataInicioGestao);
  const fim = criarDataLocal(gestao.dataFimGestao);

  if (inicio && data < inicio) return false;
  if (fim && data > fim) return false;

  return true;
}

export function vencimentoMensalidadeDoMes(mesId: string) {
  return `${mesId}-05`;
}

export function mesCobravelNaGestao(mesId: string, gestao: GestaoAtiva) {
  return dataDentroDaGestao(vencimentoMensalidadeDoMes(mesId), gestao);
}
