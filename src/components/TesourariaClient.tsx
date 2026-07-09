"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { obreirosBase } from "@/lib/mock-data";
import type { Obreiro } from "@/types";
import { anoAtualSistema, gerarMesesDoAno, mesAtualDoSistemaNoAno } from "@/lib/periodos";
import { mesCobravelNaGestao, obterGestaoAtualDoStorage } from "@/lib/gestao";

type StatusMensalidade = "Pendente" | "Parcial" | "Pago" | "Isento";
type TipoLancamento = "Tronco de Solidariedade" | "Receita Extra" | "Despesa";

type TipoCustoLoja =
  | "Aluguel do Templo"
  | "Mensalidade GOB Amapá"
  | "GOB Brasil"
  | "Taxa de Iniciação"
  | "Custo variável por obreiro"
  | "Outro";

type RegraMensalidade = {
  id: string;
  dataInicio: string;
  valor: number;
  descricao: string;
};

type Recebimento = {
  id: string;
  obreiroId: string;
  mesLancamento: string;
  valor: number;
};

type Lancamento = {
  id: string;
  data: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
};

type ParcelaCustoLoja = {
  id: string;
  numero: number;
  vencimento: string;
  valor: number;
  pago: boolean;
  dataPagamento: string;
};

type CustoLoja = {
  id: string;
  fornecedorNome: string;
  cnpj: string;
  tipoDivida: TipoCustoLoja;
  descricao: string;
  valorTotal: number;
  parcelasQtd: number;
  dataInicio: string;
  dataFim: string;
  parcelas: ParcelaCustoLoja[];
};

const regraInicial: RegraMensalidade = {
  id: "regra-inicial-2026",
  dataInicio: "2026-01-01",
  valor: 100,
  descricao: "Valor inicial da mensalidade",
};

const regraVazia = {
  dataInicio: "",
  valor: 100,
  descricao: "",
};

const lancamentoVazio = {
  data: "",
  tipo: "Tronco de Solidariedade" as TipoLancamento,
  descricao: "",
  valor: 0,
};

const custoVazio = {
  fornecedorNome: "",
  cnpj: "",
  tipoDivida: "Aluguel do Templo" as TipoCustoLoja,
  descricao: "",
  valorTotal: 0,
  parcelasQtd: 1,
  dataInicio: "",
};

function gerarId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarDataBR(dataISO: string) {
  if (!dataISO) return "Sem data";
  const partes = dataISO.split("-");
  if (partes.length !== 3) return dataISO;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function normalizarObreiros(lista: Obreiro[]) {
  return lista.map((obreiro) => ({
    ...obreiro,
    tipo: obreiro.tipo ?? "Obreiro da Loja",
    lojaOrigem: obreiro.lojaOrigem ?? "",
  }));
}

function calcularStatus(valorDevido: number, valorPago: number): StatusMensalidade {
  if (valorDevido === 0) return "Isento";
  if (valorPago >= valorDevido) return "Pago";
  if (valorPago > 0) return "Parcial";
  return "Pendente";
}

function classeStatus(status: StatusMensalidade) {
  if (status === "Pago") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (status === "Parcial") return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  if (status === "Isento") return "border-sky-400/30 bg-sky-400/10 text-sky-300";
  return "border-red-400/30 bg-red-400/10 text-red-300";
}

function lerLocalStorage<T>(chave: string, fallback: T): T {
  try {
    const valor = localStorage.getItem(chave);
    if (!valor) return fallback;
    return JSON.parse(valor) as T;
  } catch {
    return fallback;
  }
}

function adicionarMeses(dataISO: string, meses: number) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(ano, mes - 1 + meses, dia, 12, 0, 0);
  const anoFinal = data.getFullYear();
  const mesFinal = String(data.getMonth() + 1).padStart(2, "0");
  const diaFinal = String(data.getDate()).padStart(2, "0");
  return `${anoFinal}-${mesFinal}-${diaFinal}`;
}

function gerarParcelasCusto(valorTotal: number, qtd: number, dataInicio: string) {
  const parcelasQtd = Math.max(1, qtd);
  const totalCentavos = Math.round(valorTotal * 100);
  const base = Math.floor(totalCentavos / parcelasQtd);
  const resto = totalCentavos % parcelasQtd;

  return Array.from({ length: parcelasQtd }).map((_, index) => {
    const centavos = base + (index < resto ? 1 : 0);

    return {
      id: gerarId(),
      numero: index + 1,
      vencimento: adicionarMeses(dataInicio, index),
      valor: centavos / 100,
      pago: false,
      dataPagamento: "",
    };
  });
}

export function TesourariaClient() {
  const [obreiros, setObreiros] = useState<Obreiro[]>(normalizarObreiros(obreirosBase));
  const [anoTrabalho, setAnoTrabalho] = useState(anoAtualSistema());
  const [mesSelecionado, setMesSelecionado] = useState(() =>
    mesAtualDoSistemaNoAno(anoAtualSistema())
  );

  const mesesDoAno = useMemo(() => gerarMesesDoAno(anoTrabalho), [anoTrabalho]);
  const [busca, setBusca] = useState("");
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [regras, setRegras] = useState<RegraMensalidade[]>([regraInicial]);
  const [novaRegra, setNovaRegra] = useState(regraVazia);
  const [pagamentosRapidos, setPagamentosRapidos] = useState<Record<string, string>>({});
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [novoLancamento, setNovoLancamento] = useState(lancamentoVazio);
  const [custosLoja, setCustosLoja] = useState<CustoLoja[]>([]);
  const [novoCusto, setNovoCusto] = useState(custoVazio);
  const [saldoAnterior, setSaldoAnterior] = useState(0);
  const [gestaoAtiva, setGestaoAtiva] = useState(() => obterGestaoAtualDoStorage());
  const [carregado, setCarregado] = useState(false);

  const mesesCobraveis = useMemo(() => {
    return mesesDoAno.filter((mes) => mesCobravelNaGestao(mes.id, gestaoAtiva));
  }, [mesesDoAno, gestaoAtiva]);

  const mesesParaSelecionar = mesesCobraveis.length > 0 ? mesesCobraveis : mesesDoAno;

  useEffect(() => {
    const gestaoSalva = obterGestaoAtualDoStorage();
    const anoSalvo = gestaoSalva.anoTrabalho || Number(localStorage.getItem("sigma_ano_trabalho") ?? anoAtualSistema());
    const mesesValidos = gerarMesesDoAno(anoSalvo).filter((mes) =>
      mesCobravelNaGestao(mes.id, gestaoSalva)
    );

    setGestaoAtiva(gestaoSalva);
    setAnoTrabalho(anoSalvo);
    setMesSelecionado(mesesValidos[0]?.id ?? mesAtualDoSistemaNoAno(anoSalvo));

    setObreiros(normalizarObreiros(lerLocalStorage<Obreiro[]>("sigma_obreiros", obreirosBase)));

    const regrasSalvas = lerLocalStorage<RegraMensalidade[]>("sigma_regras_mensalidade", [
      regraInicial,
    ]);

    setRegras(regrasSalvas.length > 0 ? regrasSalvas : [regraInicial]);
    setRecebimentos(lerLocalStorage<Recebimento[]>("sigma_recebimentos_tesouraria", []));
    setLancamentos(lerLocalStorage<Lancamento[]>("sigma_lancamentos_financeiros", []));
    setCustosLoja(lerLocalStorage<CustoLoja[]>("sigma_custos_loja", []));
    setSaldoAnterior(gestaoSalva.saldoLiquidoInicial);
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) localStorage.setItem("sigma_ano_trabalho", String(anoTrabalho));
  }, [anoTrabalho, carregado]);

  useEffect(() => {
    if (carregado) localStorage.setItem("sigma_recebimentos_tesouraria", JSON.stringify(recebimentos));
  }, [recebimentos, carregado]);

  useEffect(() => {
    if (carregado) localStorage.setItem("sigma_regras_mensalidade", JSON.stringify(regras));
  }, [regras, carregado]);

  useEffect(() => {
    if (carregado) localStorage.setItem("sigma_lancamentos_financeiros", JSON.stringify(lancamentos));
  }, [lancamentos, carregado]);

  useEffect(() => {
    if (carregado) localStorage.setItem("sigma_custos_loja", JSON.stringify(custosLoja));
  }, [custosLoja, carregado]);

  useEffect(() => {
    if (carregado) localStorage.setItem("sigma_saldo_anterior", String(saldoAnterior));
  }, [saldoAnterior, carregado]);

  const regrasOrdenadas = useMemo(() => {
    return [...regras].sort(
      (a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
    );
  }, [regras]);

  function valorVigenteDoMes(mes: string) {
    const dataReferencia = new Date(`${mes}-01T12:00:00`);

    const regrasValidas = regrasOrdenadas.filter((regra) => {
      return new Date(`${regra.dataInicio}T12:00:00`) <= dataReferencia;
    });

    return regrasValidas.at(-1)?.valor ?? 100;
  }

  function valorTotalAno() {
    return mesesCobraveis.reduce((total, mes) => total + valorVigenteDoMes(mes.id), 0);
  }

  function nomeMes(mesId: string) {
    return (
      mesesCobraveis.find((mes) => mes.id === mesId)?.nome ??
      mesesDoAno.find((mes) => mes.id === mesId)?.nome ??
      mesId
    );
  }

  function hojeDoSistema() {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    return hoje;
  }

  function dataVencimentoDoMes(mes: string) {
    const [ano, numeroMes] = mes.split("-").map(Number);
    return new Date(ano, numeroMes - 1, 5, 12, 0, 0);
  }

  function mesEstaVencido(mes: string) {
    return dataVencimentoDoMes(mes).getTime() <= hojeDoSistema().getTime();
  }

  const obreirosDaLoja = useMemo(() => {
    return [...obreiros]
      .filter((obreiro) => obreiro.tipo !== "Visitante")
      .filter((obreiro) => obreiro.situacao === "Ativo")
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [obreiros]);

  const obreirosFiltrados = useMemo(() => {
    return obreirosDaLoja.filter((obreiro) =>
      obreiro.nome.toLowerCase().includes(busca.toLowerCase())
    );
  }, [obreirosDaLoja, busca]);

  function recebidoNoMesDoObreiro(obreiroId: string) {
    return recebimentos
      .filter((item) => item.obreiroId === obreiroId && item.mesLancamento === mesSelecionado)
      .reduce((total, item) => total + item.valor, 0);
  }

  function totalPagoAcumuladoObreiro(obreiroId: string) {
    return recebimentos
      .filter((item) => item.obreiroId === obreiroId)
      .reduce((total, item) => total + item.valor, 0);
  }

  function distribuicaoFinanceiraIrmao(obreiroId: string) {
    const totalPago = totalPagoAcumuladoObreiro(obreiroId);
    let saldoPago = totalPago;

    const meses = mesesCobraveis.map((mes) => {
      const valorDevido = valorVigenteDoMes(mes.id);
      const valorPago = Math.min(valorDevido, Math.max(saldoPago, 0));

      saldoPago = Math.max(saldoPago - valorDevido, 0);

      const emAberto = Math.max(valorDevido - valorPago, 0);
      const vencido = mesEstaVencido(mes.id);

      return {
        mes: mes.id,
        valorDevido,
        valorPago,
        emAberto,
        vencido,
        status: calcularStatus(valorDevido, valorPago),
      };
    });

    const vencidos = meses.filter((item) => item.vencido);

    const totalEmAberto = vencidos.reduce((total, item) => total + item.emAberto, 0);
    const mesesEmAberto = vencidos.filter((item) => item.emAberto > 0).length;

    return {
      totalPago,
      totalEmAberto,
      mesesEmAberto,
      saldoAdiantado: saldoPago,
      meses,
    };
  }

  function situacaoFinanceiraIrmao(obreiroId: string) {
    const distribuicao = distribuicaoFinanceiraIrmao(obreiroId);

    return {
      totalDevido: distribuicao.totalEmAberto,
      mesesEmAberto: distribuicao.mesesEmAberto,
    };
  }

  function situacaoDoMes(obreiroId: string, mes: string) {
    const distribuicao = distribuicaoFinanceiraIrmao(obreiroId);

    return (
      distribuicao.meses.find((item) => item.mes === mes) ?? {
        mes,
        valorDevido: valorVigenteDoMes(mes),
        valorPago: 0,
        emAberto: valorVigenteDoMes(mes),
        vencido: mesEstaVencido(mes),
        status: "Pendente" as StatusMensalidade,
      }
    );
  }

  function scoreFinanceiro(obreiroId: string) {
    const distribuicao = distribuicaoFinanceiraIrmao(obreiroId);
    const anuidade = valorTotalAno();

    const mesesQuitadosEmSequencia = [];

    for (const mes of distribuicao.meses) {
      if (mes.valorPago >= mes.valorDevido) {
        mesesQuitadosEmSequencia.push(mes);
      } else {
        break;
      }
    }

    const ultimoMesQuitado = mesesQuitadosEmSequencia.at(-1);
    const pagoAte = ultimoMesQuitado ? `Pago até ${nomeMes(ultimoMesQuitado.mes)}` : "Nenhum mês quitado";

    if (distribuicao.totalPago >= anuidade) {
      return {
        texto: pagoAte,
        detalhe:
          distribuicao.saldoAdiantado > 0
            ? `Anuidade quitada | Crédito: ${formatarMoeda(distribuicao.saldoAdiantado)}`
            : "Anuidade quitada",
        classe: "border-amber-300/40 bg-amber-400/15 text-amber-200",
        estrela: true,
      };
    }

    if (distribuicao.mesesEmAberto >= 3) {
      return {
        texto: "Notificar Tesouraria",
        detalhe: `${distribuicao.mesesEmAberto} meses em aberto | ${pagoAte}`,
        classe: "border-red-400/30 bg-red-400/10 text-red-300",
        estrela: false,
      };
    }

    if (distribuicao.mesesEmAberto > 0) {
      return {
        texto: "Atenção",
        detalhe: `${distribuicao.mesesEmAberto} mês(es) em aberto | ${pagoAte}`,
        classe: "border-amber-400/30 bg-amber-400/10 text-amber-300",
        estrela: false,
      };
    }

    return {
      texto: pagoAte,
      detalhe: "Sem dívida vencida",
      classe: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
      estrela: false,
    };
  }

  function salvarPagamentoRapido(obreiroId: string) {
    const valorInformado = Number(pagamentosRapidos[obreiroId] ?? 0);

    if (!valorInformado || valorInformado <= 0) {
      alert("Informe o valor a pagar no mês.");
      return;
    }

    setRecebimentos((atuais) => [
      ...atuais,
      {
        id: gerarId(),
        obreiroId,
        mesLancamento: mesSelecionado,
        valor: valorInformado,
      },
    ]);

    setPagamentosRapidos((atuais) => ({
      ...atuais,
      [obreiroId]: "",
    }));
  }

  function marcarTodosPagosMesAtual() {
    const confirmar = confirm("Deseja marcar todos como pagos no mês selecionado?");
    if (!confirmar) return;

    setRecebimentos((atuais) => [
      ...atuais,
      ...obreirosDaLoja.map((obreiro) => ({
        id: gerarId(),
        obreiroId: obreiro.id,
        mesLancamento: mesSelecionado,
        valor: valorVigenteDoMes(mesSelecionado),
      })),
    ]);
  }

  function limparMes() {
    const confirmar = confirm("Deseja limpar os recebimentos do mês selecionado?");
    if (!confirmar) return;

    setRecebimentos((atuais) => atuais.filter((item) => item.mesLancamento !== mesSelecionado));
  }

  function cadastrarRegra(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!novaRegra.dataInicio) {
      alert("Informe a data de início da vigência.");
      return;
    }

    if (novaRegra.valor <= 0) {
      alert("Informe um valor maior que zero.");
      return;
    }

    setRegras((atuais) => [
      ...atuais,
      {
        id: gerarId(),
        dataInicio: novaRegra.dataInicio,
        valor: Number(novaRegra.valor),
        descricao:
          novaRegra.descricao.trim() ||
          `Mensalidade vigente a partir de ${formatarDataBR(novaRegra.dataInicio)}`,
      },
    ]);

    setNovaRegra(regraVazia);
  }

  function removerRegra(id: string) {
    if (regras.length === 1) {
      alert("É necessário manter pelo menos uma regra.");
      return;
    }

    const confirmar = confirm("Deseja remover esta regra?");
    if (!confirmar) return;

    setRegras((atuais) => atuais.filter((regra) => regra.id !== id));
  }

  function cadastrarLancamento(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!novoLancamento.data) {
      alert("Informe a data.");
      return;
    }

    if (!novoLancamento.descricao.trim()) {
      alert("Informe a descrição.");
      return;
    }

    if (novoLancamento.valor <= 0) {
      alert("Informe um valor maior que zero.");
      return;
    }

    setLancamentos((atuais) => [
      ...atuais,
      {
        id: gerarId(),
        data: novoLancamento.data,
        tipo: novoLancamento.tipo,
        descricao: novoLancamento.descricao.trim(),
        valor: Number(novoLancamento.valor),
      },
    ]);

    setNovoLancamento(lancamentoVazio);
  }

  function removerLancamento(id: string) {
    const confirmar = confirm("Deseja remover este lançamento?");
    if (!confirmar) return;

    setLancamentos((atuais) => atuais.filter((item) => item.id !== id));
  }

  function cadastrarCusto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!novoCusto.fornecedorNome.trim()) {
      alert("Informe o nome da empresa, órgão ou fornecedor.");
      return;
    }

    if (!novoCusto.dataInicio) {
      alert("Informe a data da primeira parcela.");
      return;
    }

    if (novoCusto.valorTotal <= 0) {
      alert("Informe o valor total da dívida.");
      return;
    }

    if (novoCusto.parcelasQtd <= 0) {
      alert("Informe a quantidade de parcelas.");
      return;
    }

    const parcelas = gerarParcelasCusto(
      Number(novoCusto.valorTotal),
      Number(novoCusto.parcelasQtd),
      novoCusto.dataInicio
    );

    setCustosLoja((atuais) => [
      {
        id: gerarId(),
        fornecedorNome: novoCusto.fornecedorNome.trim(),
        cnpj: novoCusto.cnpj.trim(),
        tipoDivida: novoCusto.tipoDivida,
        descricao: novoCusto.descricao.trim(),
        valorTotal: Number(novoCusto.valorTotal),
        parcelasQtd: Number(novoCusto.parcelasQtd),
        dataInicio: novoCusto.dataInicio,
        dataFim: parcelas.at(-1)?.vencimento ?? novoCusto.dataInicio,
        parcelas,
      },
      ...atuais,
    ]);

    setNovoCusto(custoVazio);
  }

  function alternarPagamentoParcela(custoId: string, parcelaId: string) {
    setCustosLoja((atuais) =>
      atuais.map((custo) => {
        if (custo.id !== custoId) return custo;

        return {
          ...custo,
          parcelas: custo.parcelas.map((parcela) =>
            parcela.id === parcelaId
              ? {
                  ...parcela,
                  pago: !parcela.pago,
                  dataPagamento: parcela.pago ? "" : hojeISO(),
                }
              : parcela
          ),
        };
      })
    );
  }

  function removerCusto(id: string) {
    const confirmar = confirm("Deseja remover este custo da Loja?");
    if (!confirmar) return;

    setCustosLoja((atuais) => atuais.filter((item) => item.id !== id));
  }

  const resumoCustos = useMemo(() => {
    const todasParcelas = custosLoja.flatMap((custo) =>
      custo.parcelas.map((parcela) => ({
        ...parcela,
        custo,
      }))
    );

    const hoje = hojeDoSistema();

    const totalCadastrado = todasParcelas.reduce((total, parcela) => total + parcela.valor, 0);

    const totalPago = todasParcelas
      .filter((parcela) => parcela.pago)
      .reduce((total, parcela) => total + parcela.valor, 0);

    const totalEmAberto = todasParcelas
      .filter((parcela) => !parcela.pago)
      .reduce((total, parcela) => total + parcela.valor, 0);

    const totalVencido = todasParcelas
      .filter((parcela) => !parcela.pago && new Date(`${parcela.vencimento}T12:00:00`) <= hoje)
      .reduce((total, parcela) => total + parcela.valor, 0);

    const proximasParcelas = todasParcelas
      .filter((parcela) => !parcela.pago)
      .sort(
        (a, b) =>
          new Date(`${a.vencimento}T12:00:00`).getTime() -
          new Date(`${b.vencimento}T12:00:00`).getTime()
      )
      .slice(0, 6);

    return {
      totalCadastrado,
      totalPago,
      totalEmAberto,
      totalVencido,
      proximasParcelas,
    };
  }, [custosLoja]);

  const resumoMes = useMemo(() => {
    const recebido = recebimentos
      .filter((item) => item.mesLancamento === mesSelecionado)
      .reduce((total, item) => total + item.valor, 0);

    return {
      recebido,
    };
  }, [recebimentos, mesSelecionado]);

  const resumoDivida = useMemo(() => {
    return obreirosDaLoja.reduce((total, obreiro) => {
      return total + situacaoFinanceiraIrmao(obreiro.id).totalDevido;
    }, 0);
  }, [obreirosDaLoja, recebimentos, mesSelecionado, regras]);

  const resumoGeral = useMemo(() => {
    const totalMensalidades = recebimentos.reduce((total, item) => total + item.valor, 0);

    const tronco = lancamentos
      .filter((item) => item.tipo === "Tronco de Solidariedade")
      .reduce((total, item) => total + item.valor, 0);

    const receitas = lancamentos
      .filter((item) => item.tipo === "Receita Extra")
      .reduce((total, item) => total + item.valor, 0);

    const despesasAvulsas = lancamentos
      .filter((item) => item.tipo === "Despesa")
      .reduce((total, item) => total + item.valor, 0);

    const totalDespesas = despesasAvulsas + resumoCustos.totalPago;

    return {
      totalMensalidades,
      tronco,
      receitas,
      despesasAvulsas,
      custosPagos: resumoCustos.totalPago,
      totalDespesas,
      saldoAtual: saldoAnterior + totalMensalidades + tronco + receitas - totalDespesas,
    };
  }, [recebimentos, lancamentos, saldoAnterior, resumoCustos]);

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Mensalidade vigente</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">
            {formatarMoeda(valorVigenteDoMes(mesSelecionado))}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">Valor do mês selecionado</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Dívida vencida</p>
          <h3 className="mt-3 text-3xl font-bold text-red-300">
            {formatarMoeda(resumoDivida)}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">Mensalidades vencidas até hoje</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Recebido no mês</p>
          <h3 className="mt-3 text-3xl font-bold text-emerald-300">
            {formatarMoeda(resumoMes.recebido)}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">Valores lançados neste mês</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Custos pagos</p>
          <h3 className="mt-3 text-3xl font-bold text-red-300">
            {formatarMoeda(resumoCustos.totalPago)}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">Abatidos do saldo</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Custos em aberto</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">
            {formatarMoeda(resumoCustos.totalEmAberto)}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Vencido: {formatarMoeda(resumoCustos.totalVencido)}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Saldo atual</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">
            {formatarMoeda(resumoGeral.saldoAtual)}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">Já desconta custos pagos</p>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Valor da Mensalidade por Vigência</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Cadastre reajustes com data de início. O valor na linha do irmão é apenas informativo.
        </p>

        <form onSubmit={cadastrarRegra} className="mt-6 grid gap-3 md:grid-cols-4">
          <input
            type="date"
            value={novaRegra.dataInicio}
            onChange={(evento) =>
              setNovaRegra((atual) => ({ ...atual, dataInicio: evento.target.value }))
            }
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
          />

          <input
            type="number"
            min="0"
            value={novaRegra.valor}
            onChange={(evento) =>
              setNovaRegra((atual) => ({ ...atual, valor: Number(evento.target.value) }))
            }
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            placeholder="Valor"
          />

          <input
            value={novaRegra.descricao}
            onChange={(evento) =>
              setNovaRegra((atual) => ({ ...atual, descricao: evento.target.value }))
            }
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            placeholder="Descrição"
          />

          <button
            type="submit"
            className="rounded-full bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
          >
            Cadastrar valor
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white/[0.06] text-zinc-300">
              <tr>
                <th className="px-5 py-4">Vigência</th>
                <th className="px-5 py-4">Valor</th>
                <th className="px-5 py-4">Descrição</th>
                <th className="px-5 py-4">Ação</th>
              </tr>
            </thead>

            <tbody>
              {regrasOrdenadas.map((regra) => (
                <tr key={regra.id} className="border-t border-white/10">
                  <td className="px-5 py-4 text-zinc-300">{formatarDataBR(regra.dataInicio)}</td>
                  <td className="px-5 py-4 font-bold text-amber-300">
                    {formatarMoeda(regra.valor)}
                  </td>
                  <td className="px-5 py-4 text-zinc-300">{regra.descricao}</td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => removerRegra(regra.id)}
                      className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-2xl font-bold">Mensalidades</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Lance somente o valor que o irmão está pagando no mês. O sistema distribui automaticamente no ano.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="number"
              value={anoTrabalho}
              onChange={(evento) => {
                const novoAno = Number(evento.target.value);
                const mesesValidos = gerarMesesDoAno(novoAno).filter((mes) =>
                  mesCobravelNaGestao(mes.id, gestaoAtiva)
                );

                setAnoTrabalho(novoAno);
                setMesSelecionado(mesesValidos[0]?.id ?? mesAtualDoSistemaNoAno(novoAno));
              }}
              className="w-32 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Ano"
            />

            <select
              value={mesSelecionado}
              onChange={(evento) => setMesSelecionado(evento.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            >
              {mesesParaSelecionar.map((mes) => (
                <option key={mes.id} value={mes.id}>
                  {mes.nome}
                </option>
              ))}
            </select>

            <input
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Buscar obreiro"
            />

            <button
              type="button"
              onClick={marcarTodosPagosMesAtual}
              className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300"
            >
              Todos pagos no mês
            </button>

            <button
              type="button"
              onClick={limparMes}
              className="rounded-full border border-red-400/30 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
            >
              Limpar mês
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[1350px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.06] text-zinc-300">
              <tr>
                <th className="px-5 py-4">Obreiro</th>
                <th className="px-5 py-4">Total pago acumulado</th>
                <th className="px-5 py-4">Em aberto</th>
                <th className="px-5 py-4">Mensalidade vigente</th>
                <th className="px-5 py-4">Situação do mês</th>
                <th className="px-5 py-4">Score Financeiro</th>
                <th className="px-5 py-4">Valor a pagar no mês</th>
              </tr>
            </thead>

            <tbody>
              {obreirosFiltrados.map((obreiro) => {
                const situacao = situacaoFinanceiraIrmao(obreiro.id);
                const totalPagoAcumulado = totalPagoAcumuladoObreiro(obreiro.id);
                const situacaoMes = situacaoDoMes(obreiro.id, mesSelecionado);
                const score = scoreFinanceiro(obreiro.id);

                return (
                  <tr key={obreiro.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{obreiro.nome}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {obreiro.grau} | {obreiro.cargo || "Sem cargo"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="w-fit rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2">
                        <p className="font-bold text-emerald-300">
                          {formatarMoeda(totalPagoAcumulado)}
                        </p>
                        <p className="mt-1 text-[11px] text-emerald-200">
                          Pago na Tesouraria
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="w-fit rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-2">
                        <p className="font-bold text-red-300">
                          {formatarMoeda(situacao.totalDevido)}
                        </p>
                        <p className="mt-1 text-[11px] text-red-200">
                          {situacao.mesesEmAberto} mês(es) vencido(s)
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="w-fit rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-2">
                        <p className="font-bold text-amber-300">
                          {formatarMoeda(valorVigenteDoMes(mesSelecionado))}
                        </p>
                        <p className="mt-1 text-[11px] text-amber-200">
                          Apenas informativo
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className={`w-fit rounded-2xl border px-4 py-2 ${classeStatus(situacaoMes.status)}`}>
                        <p className="text-xs font-bold">{situacaoMes.status}</p>
                        <p className="mt-1 text-[11px]">
                          Recebido no mês: {formatarMoeda(recebidoNoMesDoObreiro(obreiro.id))}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className={`w-fit rounded-2xl border px-4 py-2 ${score.classe}`}>
                        <div className="flex items-center gap-2">
                          {score.estrela && (
                            <span
                              aria-label="Estrela"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-base text-black shadow-lg shadow-amber-400/20"
                            >
                              ★
                            </span>
                          )}

                          <p className="text-xs font-bold">{score.texto}</p>
                        </div>

                        <p className="mt-1 text-[11px]">{score.detalhe}</p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex min-w-[230px] gap-2">
                        <input
                          type="number"
                          min="0"
                          value={pagamentosRapidos[obreiro.id] ?? ""}
                          onChange={(evento) =>
                            setPagamentosRapidos((atuais) => ({
                              ...atuais,
                              [obreiro.id]: evento.target.value,
                            }))
                          }
                          className="w-32 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-amber-400"
                          placeholder="Valor"
                        />

                        <button
                          type="button"
                          onClick={() => salvarPagamentoRapido(obreiro.id)}
                          className="rounded-full bg-amber-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-amber-300"
                        >
                          Salvar
                        </button>
                      </div>

                      <p className="mt-2 text-[11px] text-zinc-500">
                        Abate os meses mais antigos.
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Custos Fixos e Obrigações da Loja</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Cadastre dívidas, fornecedores, parcelas e vencimentos. Ao marcar uma parcela como paga, o valor é abatido automaticamente do saldo da Loja.
        </p>

        <form onSubmit={cadastrarCusto} className="mt-6 grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={novoCusto.fornecedorNome}
              onChange={(evento) =>
                setNovoCusto((atual) => ({ ...atual, fornecedorNome: evento.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Nome da empresa, órgão ou fornecedor"
            />

            <input
              value={novoCusto.cnpj}
              onChange={(evento) =>
                setNovoCusto((atual) => ({ ...atual, cnpj: evento.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="CNPJ"
            />

            <select
              value={novoCusto.tipoDivida}
              onChange={(evento) =>
                setNovoCusto((atual) => ({
                  ...atual,
                  tipoDivida: evento.target.value as TipoCustoLoja,
                }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            >
              <option>Aluguel do Templo</option>
              <option>Mensalidade GOB Amapá</option>
              <option>GOB Brasil</option>
              <option>Taxa de Iniciação</option>
              <option>Custo variável por obreiro</option>
              <option>Outro</option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="number"
              min="0"
              value={novoCusto.valorTotal}
              onChange={(evento) =>
                setNovoCusto((atual) => ({ ...atual, valorTotal: Number(evento.target.value) }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Valor total"
            />

            <input
              type="number"
              min="1"
              value={novoCusto.parcelasQtd}
              onChange={(evento) =>
                setNovoCusto((atual) => ({ ...atual, parcelasQtd: Number(evento.target.value) }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Parcelas"
            />

            <input
              type="date"
              value={novoCusto.dataInicio}
              onChange={(evento) =>
                setNovoCusto((atual) => ({ ...atual, dataInicio: evento.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            />

            <button
              type="submit"
              className="rounded-full bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              Cadastrar custo
            </button>
          </div>

          <input
            value={novoCusto.descricao}
            onChange={(evento) =>
              setNovoCusto((atual) => ({ ...atual, descricao: evento.target.value }))
            }
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            placeholder="Descrição ou observação da dívida"
          />
        </form>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-zinc-400">Total cadastrado</p>
            <h4 className="mt-2 text-2xl font-bold text-white">
              {formatarMoeda(resumoCustos.totalCadastrado)}
            </h4>
          </article>

          <article className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-sm text-emerald-200">Total pago</p>
            <h4 className="mt-2 text-2xl font-bold text-emerald-300">
              {formatarMoeda(resumoCustos.totalPago)}
            </h4>
          </article>

          <article className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-sm text-amber-200">Em aberto</p>
            <h4 className="mt-2 text-2xl font-bold text-amber-300">
              {formatarMoeda(resumoCustos.totalEmAberto)}
            </h4>
          </article>

          <article className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
            <p className="text-sm text-red-200">Vencido</p>
            <h4 className="mt-2 text-2xl font-bold text-red-300">
              {formatarMoeda(resumoCustos.totalVencido)}
            </h4>
          </article>
        </div>

        <div className="mt-6 space-y-4">
          {custosLoja.map((custo) => {
            const pago = custo.parcelas
              .filter((parcela) => parcela.pago)
              .reduce((total, parcela) => total + parcela.valor, 0);

            const aberto = custo.valorTotal - pago;

            return (
              <div key={custo.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">{custo.fornecedorNome}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {custo.tipoDivida} | CNPJ: {custo.cnpj || "Não informado"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {custo.descricao || "Sem descrição."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">
                      Total: {formatarMoeda(custo.valorTotal)}
                    </span>
                    <span className="rounded-full border border-emerald-400/30 px-3 py-1 text-emerald-300">
                      Pago: {formatarMoeda(pago)}
                    </span>
                    <span className="rounded-full border border-amber-400/30 px-3 py-1 text-amber-300">
                      Aberto: {formatarMoeda(Math.max(aberto, 0))}
                    </span>
                    <button
                      type="button"
                      onClick={() => removerCusto(custo.id)}
                      className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
                    >
                      Remover custo
                    </button>
                  </div>
                </div>

                <div className="mt-4 overflow-auto rounded-xl border border-white/10">
                  <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                    <thead className="bg-white/[0.06] text-zinc-300">
                      <tr>
                        <th className="px-4 py-3">Parcela</th>
                        <th className="px-4 py-3">Vencimento</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Pagamento</th>
                        <th className="px-4 py-3">Ação</th>
                      </tr>
                    </thead>

                    <tbody>
                      {custo.parcelas.map((parcela) => (
                        <tr key={parcela.id} className="border-t border-white/10">
                          <td className="px-4 py-3 text-zinc-300">
                            {parcela.numero}/{custo.parcelasQtd}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">
                            {formatarDataBR(parcela.vencimento)}
                          </td>
                          <td className="px-4 py-3 font-bold text-white">
                            {formatarMoeda(parcela.valor)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                parcela.pago
                                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                  : new Date(`${parcela.vencimento}T12:00:00`) <= hojeDoSistema()
                                    ? "border-red-400/30 bg-red-400/10 text-red-300"
                                    : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                              }`}
                            >
                              {parcela.pago
                                ? "Pago"
                                : new Date(`${parcela.vencimento}T12:00:00`) <= hojeDoSistema()
                                  ? "Vencido"
                                  : "Aberto"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {parcela.dataPagamento ? formatarDataBR(parcela.dataPagamento) : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => alternarPagamentoParcela(custo.id, parcela.id)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                parcela.pago
                                  ? "border border-red-400/30 text-red-300 hover:bg-red-400/10"
                                  : "bg-emerald-400 text-black hover:bg-emerald-300"
                              }`}
                            >
                              {parcela.pago ? "Desfazer pagamento" : "Marcar como paga"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {custosLoja.length === 0 && (
            <p className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-zinc-500">
              Nenhum custo fixo ou obrigação cadastrado.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-2xl font-bold">Saldo da Gestão</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Saldo líquido inicial vindo do Cadastro de Gestão. Para alterar, edite a gestão atual.
          </p>

          <input
            type="number"
            value={saldoAnterior}
            readOnly
            className="mt-6 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
          />

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between text-zinc-300">
              <span>Mensalidades recebidas</span>
              <strong className="text-emerald-300">
                {formatarMoeda(resumoGeral.totalMensalidades)}
              </strong>
            </div>

            <div className="flex justify-between text-zinc-300">
              <span>Tronco</span>
              <strong className="text-sky-300">{formatarMoeda(resumoGeral.tronco)}</strong>
            </div>

            <div className="flex justify-between text-zinc-300">
              <span>Receitas extras</span>
              <strong className="text-emerald-300">{formatarMoeda(resumoGeral.receitas)}</strong>
            </div>

            <div className="flex justify-between text-zinc-300">
              <span>Despesas avulsas</span>
              <strong className="text-red-300">{formatarMoeda(resumoGeral.despesasAvulsas)}</strong>
            </div>

            <div className="flex justify-between text-zinc-300">
              <span>Custos da Loja pagos</span>
              <strong className="text-red-300">{formatarMoeda(resumoGeral.custosPagos)}</strong>
            </div>

            <div className="border-t border-white/10 pt-3">
              <div className="flex justify-between text-white">
                <span>Saldo atual</span>
                <strong className="text-amber-300">
                  {formatarMoeda(resumoGeral.saldoAtual)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-2xl font-bold">Tronco, Receitas e Despesas Avulsas</h3>
          <p className="mt-2 text-sm text-zinc-400">
            O tronco fica separado das mensalidades. Despesas avulsas são diferentes dos custos fixos cadastrados.
          </p>

          <form onSubmit={cadastrarLancamento} className="mt-6 grid gap-3 md:grid-cols-5">
            <input
              type="date"
              value={novoLancamento.data}
              onChange={(evento) =>
                setNovoLancamento((atual) => ({ ...atual, data: evento.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            />

            <select
              value={novoLancamento.tipo}
              onChange={(evento) =>
                setNovoLancamento((atual) => ({
                  ...atual,
                  tipo: evento.target.value as TipoLancamento,
                }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            >
              <option>Tronco de Solidariedade</option>
              <option>Receita Extra</option>
              <option>Despesa</option>
            </select>

            <input
              value={novoLancamento.descricao}
              onChange={(evento) =>
                setNovoLancamento((atual) => ({ ...atual, descricao: evento.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Descrição"
            />

            <input
              type="number"
              min="0"
              value={novoLancamento.valor}
              onChange={(evento) =>
                setNovoLancamento((atual) => ({ ...atual, valor: Number(evento.target.value) }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Valor"
            />

            <button
              type="submit"
              className="rounded-full bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              Lançar
            </button>
          </form>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/[0.06] text-zinc-300">
                <tr>
                  <th className="px-5 py-4">Data</th>
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">Descrição</th>
                  <th className="px-5 py-4">Valor</th>
                  <th className="px-5 py-4">Ação</th>
                </tr>
              </thead>

              <tbody>
                {[...lancamentos].reverse().map((item) => (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="px-5 py-4 text-zinc-300">{formatarDataBR(item.data)}</td>
                    <td className="px-5 py-4 text-zinc-300">{item.tipo}</td>
                    <td className="px-5 py-4 text-white">{item.descricao}</td>
                    <td
                      className={`px-5 py-4 font-bold ${
                        item.tipo === "Despesa" ? "text-red-300" : "text-emerald-300"
                      }`}
                    >
                      {formatarMoeda(item.valor)}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => removerLancamento(item.id)}
                        className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}

                {lancamentos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-zinc-500">
                      Nenhum lançamento cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
