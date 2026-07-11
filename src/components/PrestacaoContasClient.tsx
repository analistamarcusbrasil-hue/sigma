"use client";

import { useEffect, useMemo, useState } from "react";
import { carregarSecretaria, carregarTesouraria, listarGestoes, listarObreiros } from "@/lib/supabase/operacional";
import { jsPDF } from "jspdf";
import type { Obreiro } from "@/types";

type TipoRelatorio = "Mensal" | "Anual";

type CargosGestao = {
  veneravelMestre?: string;
  primeiroVigilante?: string;
  segundoVigilante?: string;
  orador?: string;
  secretario?: string;
  tesoureiro?: string;
  chanceler?: string;
  mestreCerimonias?: string;
};
type VisaoRelatorio = "Sintética" | "Analítica";

type GestaoLoja = {
  id: string;
  nomeGestao: string;
  gestaoAnteriorRepasse: string;
  dataInicioGestao: string;
  dataFimGestao: string;
  anoTrabalho: number;
  financeiroPositivoRecebido: number;
  financeiroNegativoRecebido: number;
  cargos?: CargosGestao;
};

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
  tipo: "Tronco de Solidariedade" | "Receita Extra" | "Despesa";
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
  tipoDivida: string;
  descricao: string;
  valorTotal: number;
  parcelasQtd: number;
  dataInicio: string;
  dataFim: string;
  parcelas: ParcelaCustoLoja[];
};

type DecisaoLoja = {
  id: string;
  documentoId: string;
  sessaoId: string;
  data: string;
  texto: string;
  status: "Vigente" | "Revogada";
  origem: string;
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

const regraInicial: RegraMensalidade = {
  id: "regra-inicial",
  dataInicio: "2025-01-01",
  valor: 100,
  descricao: "Valor inicial da mensalidade",
};

function gerarMesesDoAno(ano: number) {
  return nomesMeses.map((nome, index) => {
    const mes = String(index + 1).padStart(2, "0");

    return {
      id: `${ano}-${mes}`,
      nome: `${nome}/${ano}`,
    };
  });
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataBR(dataISO: string) {
  if (!dataISO) return "Não informado";
  const partes = dataISO.split("-");
  if (partes.length !== 3) return dataISO;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function dataLocal(dataISO: string) {
  if (!dataISO) return null;

  const dataTratada = dataISO.length === 7 ? `${dataISO}-01` : dataISO;
  const partes = dataTratada.split("-").map(Number);

  if (partes.length !== 3) return null;

  const [ano, mes, dia] = partes;
  return new Date(ano, mes - 1, dia, 12, 0, 0);
}

function dataDentroDaGestao(dataISO: string, gestao: GestaoLoja | null) {
  if (!gestao) return true;

  const data = dataLocal(dataISO);
  const inicio = dataLocal(gestao.dataInicioGestao);
  const fim = dataLocal(gestao.dataFimGestao);

  if (!data) return false;
  if (inicio && data < inicio) return false;
  if (fim && data > fim) return false;

  return true;
}

function vencimentoDoMes(mesId: string) {
  return `${mesId}-05`;
}

function mesCobravel(mesId: string, gestao: GestaoLoja | null) {
  return dataDentroDaGestao(vencimentoDoMes(mesId), gestao);
}

function nomeMes(mesId: string) {
  const [, mes] = mesId.split("-");
  const indice = Number(mes) - 1;
  return `${nomesMeses[indice] ?? mes}/${mesId.slice(0, 4)}`;
}

function saldoInicialGestao(gestao: GestaoLoja | null) {
  if (!gestao) return 0;

  return (
    Number(gestao.financeiroPositivoRecebido || 0) -
    Number(gestao.financeiroNegativoRecebido || 0)
  );
}

function gerarMesesCobrancaGestao(gestao: GestaoLoja | null, anoTrabalho: number) {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);

  const inicio = dataLocal(gestao?.dataInicioGestao ?? `${anoTrabalho}-01-01`);
  const fimGestao = dataLocal(gestao?.dataFimGestao ?? "");

  const fim = fimGestao && fimGestao < hoje ? fimGestao : hoje;

  const meses: string[] = [];

  if (!inicio) return gerarMesesDoAno(anoTrabalho).map((mes) => mes.id);

  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1, 12, 0, 0);

  while (cursor <= fim) {
    const ano = cursor.getFullYear();
    const mes = String(cursor.getMonth() + 1).padStart(2, "0");
    const mesId = `${ano}-${mes}`;

    if (mesCobravel(mesId, gestao)) {
      meses.push(mesId);
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return meses;
}

export function PrestacaoContasClient() {
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>("Mensal");
  const [visaoRelatorio, setVisaoRelatorio] = useState<VisaoRelatorio>("Sintética");
  const [anoTrabalho, setAnoTrabalho] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState("");
  const [gestaoAtual, setGestaoAtual] = useState<GestaoLoja | null>(null);

  const [obreiros, setObreiros] = useState<Obreiro[]>([]);
  const [regras, setRegras] = useState<RegraMensalidade[]>([regraInicial]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [custosLoja, setCustosLoja] = useState<CustoLoja[]>([]);
  const [decisoesLoja, setDecisoesLoja] = useState<DecisaoLoja[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    Promise.all([listarGestoes(), listarObreiros(), carregarTesouraria(), carregarSecretaria()])
      .then(([gestoes, obreirosBanco, financeiro, secretaria]) => {
        const gestao = (gestoes.find((item) => item.ativa) ?? null) as GestaoLoja | null;
        const ano = gestao?.anoTrabalho ?? new Date().getFullYear();
        setGestaoAtual(gestao); setAnoTrabalho(ano); setMesSelecionado(`${ano}-01`); setObreiros(obreirosBanco);
        setRegras(financeiro.regras as RegraMensalidade[]); setRecebimentos(financeiro.recebimentos as Recebimento[]);
        setLancamentos(financeiro.lancamentos as Lancamento[]); setCustosLoja(financeiro.custos as CustoLoja[]);
        setDecisoesLoja(secretaria.decisoes as DecisaoLoja[]);
      }).finally(() => setCarregado(true));
  }, []);

  const mesesDoAno = useMemo(() => gerarMesesDoAno(anoTrabalho), [anoTrabalho]);

  const mesesParaSelecionar = useMemo(() => {
    const validos = mesesDoAno.filter((mes) => mesCobravel(mes.id, gestaoAtual));
    return validos.length > 0 ? validos : mesesDoAno;
  }, [mesesDoAno, gestaoAtual]);

  const regrasOrdenadas = useMemo(() => {
    return [...regras].sort(
      (a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
    );
  }, [regras]);

  function valorVigenteDoMes(mesId: string) {
    const referencia = dataLocal(vencimentoDoMes(mesId));

    const regrasValidas = regrasOrdenadas.filter((regra) => {
      const dataRegra = dataLocal(regra.dataInicio);
      return dataRegra && referencia && dataRegra <= referencia;
    });

    return regrasValidas.at(-1)?.valor ?? 100;
  }

  function estaNoPeriodo(dataOuMes: string) {
    if (!dataOuMes) return false;

    const dataReferencia = dataOuMes.length === 7 ? vencimentoDoMes(dataOuMes) : dataOuMes;

    if (!dataDentroDaGestao(dataReferencia, gestaoAtual)) return false;

    if (tipoRelatorio === "Anual") {
      return dataReferencia.startsWith(String(anoTrabalho));
    }

    return dataReferencia.startsWith(mesSelecionado);
  }

  const obreirosDaLoja = useMemo(() => {
    return [...obreiros]
      .filter((obreiro) => obreiro.tipo !== "Visitante")
      .filter((obreiro) => obreiro.situacao === "Ativo")
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [obreiros]);

  function nomeObreiro(id: string) {
    return obreiros.find((obreiro) => obreiro.id === id)?.nome ?? "Não informado";
  }

  const parcelasCustos = useMemo(() => {
    return custosLoja.flatMap((custo) =>
      custo.parcelas.map((parcela) => ({
        ...parcela,
        custoId: custo.id,
        fornecedorNome: custo.fornecedorNome,
        tipoDivida: custo.tipoDivida,
      }))
    );
  }, [custosLoja]);

  function totalPagoObreiro(obreiroId: string) {
    return recebimentos
      .filter((item) => item.obreiroId === obreiroId)
      .filter((item) => dataDentroDaGestao(vencimentoDoMes(item.mesLancamento), gestaoAtual))
      .reduce((total, item) => total + item.valor, 0);
  }

  function inadimplenciaObreiro(obreiroId: string) {
    const mesesCobranca = gerarMesesCobrancaGestao(gestaoAtual, anoTrabalho);
    let saldoPago = totalPagoObreiro(obreiroId);

    let emAberto = 0;
    let mesesEmAberto = 0;

    mesesCobranca.forEach((mesId) => {
      const devido = valorVigenteDoMes(mesId);
      const pago = Math.min(devido, Math.max(saldoPago, 0));

      saldoPago = Math.max(saldoPago - devido, 0);

      const aberto = Math.max(devido - pago, 0);

      if (aberto > 0) {
        emAberto += aberto;
        mesesEmAberto += 1;
      }
    });

    return {
      totalPago: totalPagoObreiro(obreiroId),
      emAberto,
      mesesEmAberto,
    };
  }

  const resumo = useMemo(() => {
    const saldoInicial = saldoInicialGestao(gestaoAtual);

    const mensalidadesPeriodo = recebimentos
      .filter((item) => estaNoPeriodo(item.mesLancamento))
      .reduce((total, item) => total + item.valor, 0);

    const troncoPeriodo = lancamentos
      .filter((item) => item.tipo === "Tronco de Solidariedade")
      .filter((item) => estaNoPeriodo(item.data))
      .reduce((total, item) => total + item.valor, 0);

    const receitasExtrasPeriodo = lancamentos
      .filter((item) => item.tipo === "Receita Extra")
      .filter((item) => estaNoPeriodo(item.data))
      .reduce((total, item) => total + item.valor, 0);

    const despesasAvulsasPeriodo = lancamentos
      .filter((item) => item.tipo === "Despesa")
      .filter((item) => estaNoPeriodo(item.data))
      .reduce((total, item) => total + item.valor, 0);

    const custosPagosPeriodo = parcelasCustos
      .filter((parcela) => parcela.pago)
      .filter((parcela) => estaNoPeriodo(parcela.dataPagamento || parcela.vencimento))
      .reduce((total, parcela) => total + parcela.valor, 0);

    const totalMensalidadesGeral = recebimentos
      .filter((item) => dataDentroDaGestao(vencimentoDoMes(item.mesLancamento), gestaoAtual))
      .reduce((total, item) => total + item.valor, 0);

    const totalReceitasGeral = lancamentos
      .filter((item) => dataDentroDaGestao(item.data, gestaoAtual))
      .filter((item) => item.tipo !== "Despesa")
      .reduce((total, item) => total + item.valor, 0);

    const totalDespesasGeral = lancamentos
      .filter((item) => dataDentroDaGestao(item.data, gestaoAtual))
      .filter((item) => item.tipo === "Despesa")
      .reduce((total, item) => total + item.valor, 0);

    const totalCustosPagosGeral = parcelasCustos
      .filter((parcela) => parcela.pago)
      .filter((parcela) =>
        dataDentroDaGestao(parcela.dataPagamento || parcela.vencimento, gestaoAtual)
      )
      .reduce((total, parcela) => total + parcela.valor, 0);

    const custosEmAberto = parcelasCustos
      .filter((parcela) => !parcela.pago)
      .filter((parcela) => dataDentroDaGestao(parcela.vencimento, gestaoAtual))
      .reduce((total, parcela) => total + parcela.valor, 0);

    const dividaObreiros = obreirosDaLoja.reduce((total, obreiro) => {
      return total + inadimplenciaObreiro(obreiro.id).emAberto;
    }, 0);

    const receitaPeriodo = mensalidadesPeriodo + troncoPeriodo + receitasExtrasPeriodo;
    const despesaPeriodo = despesasAvulsasPeriodo + custosPagosPeriodo;

    return {
      saldoInicial,
      mensalidadesPeriodo,
      troncoPeriodo,
      receitasExtrasPeriodo,
      despesasAvulsasPeriodo,
      custosPagosPeriodo,
      receitaPeriodo,
      despesaPeriodo,
      resultadoPeriodo: receitaPeriodo - despesaPeriodo,
      custosEmAberto,
      dividaObreiros,
      saldoAtual:
        saldoInicial +
        totalMensalidadesGeral +
        totalReceitasGeral -
        totalDespesasGeral -
        totalCustosPagosGeral,
    };
  }, [
    gestaoAtual,
    recebimentos,
    lancamentos,
    parcelasCustos,
    tipoRelatorio,
    mesSelecionado,
    anoTrabalho,
    obreirosDaLoja,
    regras,
  ]);

  const movimentosPeriodo = useMemo(() => {
    const mensalidades = recebimentos
      .filter((item) => estaNoPeriodo(item.mesLancamento))
      .map((item) => ({
        id: item.id,
        data: vencimentoDoMes(item.mesLancamento),
        tipo: "Receita",
        origem: "Mensalidade",
        descricao: nomeObreiro(item.obreiroId),
        valor: item.valor,
      }));

    const avulsos = lancamentos
      .filter((item) => estaNoPeriodo(item.data))
      .map((item) => ({
        id: item.id,
        data: item.data,
        tipo: item.tipo === "Despesa" ? "Despesa" : "Receita",
        origem: item.tipo,
        descricao: item.descricao,
        valor: item.tipo === "Despesa" ? -item.valor : item.valor,
      }));

    const custos = parcelasCustos
      .filter((parcela) => parcela.pago)
      .filter((parcela) => estaNoPeriodo(parcela.dataPagamento || parcela.vencimento))
      .map((parcela) => ({
        id: parcela.id,
        data: parcela.dataPagamento || parcela.vencimento,
        tipo: "Despesa",
        origem: parcela.tipoDivida,
        descricao: `${parcela.fornecedorNome} - Parcela ${parcela.numero}`,
        valor: -parcela.valor,
      }));

    return [...mensalidades, ...avulsos, ...custos].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }, [recebimentos, lancamentos, parcelasCustos, tipoRelatorio, mesSelecionado, anoTrabalho, obreiros]);

  const inadimplentes = useMemo(() => {
    return obreirosDaLoja
      .map((obreiro) => ({
        obreiro,
        ...inadimplenciaObreiro(obreiro.id),
      }))
      .filter((item) => item.emAberto > 0)
      .sort((a, b) => b.emAberto - a.emAberto);
  }, [obreirosDaLoja, recebimentos, regras, gestaoAtual, anoTrabalho]);

  const custosEmAbertoLista = useMemo(() => {
    return parcelasCustos
      .filter((parcela) => !parcela.pago)
      .filter((parcela) => dataDentroDaGestao(parcela.vencimento, gestaoAtual))
      .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
      .slice(0, 12);
  }, [parcelasCustos, gestaoAtual]);

  const decisoesFinanceiras = useMemo(() => {
    const termos = ["financeiro", "tesouraria", "mensalidade", "custo", "gob", "aluguel", "taxa"];

    return decisoesLoja.filter((decisao) => {
      const texto = decisao.texto.toLowerCase();

      return (
        decisao.status === "Vigente" &&
        dataDentroDaGestao(decisao.data, gestaoAtual) &&
        termos.some((termo) => texto.includes(termo))
      );
    });
  }, [decisoesLoja, gestaoAtual]);

  const receitasPorOrigem = useMemo(() => {
    const mapa = new Map<string, number>();

    movimentosPeriodo
      .filter((item) => item.valor > 0)
      .forEach((item) => {
        mapa.set(item.origem, (mapa.get(item.origem) ?? 0) + item.valor);
      });

    return Array.from(mapa.entries())
      .map(([origem, valor]) => ({ origem, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [movimentosPeriodo]);

  const gastosPorOrigem = useMemo(() => {
    const mapa = new Map<string, number>();

    movimentosPeriodo
      .filter((item) => item.valor < 0)
      .forEach((item) => {
        mapa.set(item.origem, (mapa.get(item.origem) ?? 0) + Math.abs(item.valor));
      });

    return Array.from(mapa.entries())
      .map(([origem, valor]) => ({ origem, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [movimentosPeriodo]);

  const financeiroPositivoRecebido = Number(gestaoAtual?.financeiroPositivoRecebido ?? resumo.saldoInicial);
  const financeiroNegativoRecebido = Number(gestaoAtual?.financeiroNegativoRecebido ?? 0);
  const saldoProjetadoRepasse = resumo.saldoAtual + resumo.dividaObreiros - resumo.custosEmAberto;

  function veneravelVigente() {
    return gestaoAtual?.cargos?.veneravelMestre?.trim() || "Não informado";
  }

  function tesoureiroVigente() {
    return gestaoAtual?.cargos?.tesoureiro?.trim() || "Não informado";
  }

  function tituloPeriodo() {
    if (tipoRelatorio === "Anual") return `Ano de ${anoTrabalho}`;
    return nomeMes(mesSelecionado);
  }

  function textoRelatorio() {
    const movimentos = movimentosPeriodo
      .map(
        (item) =>
          `${formatarDataBR(item.data)} | ${item.origem} | ${item.descricao} | ${formatarMoeda(
            item.valor
          )}`
      )
      .join("\n");

    const pendentes = inadimplentes
      .map(
        (item) =>
          `${item.obreiro.nome} | ${item.mesesEmAberto} mês(es) | ${formatarMoeda(item.emAberto)}`
      )
      .join("\n");

    const custos = custosEmAbertoLista
      .map(
        (item) =>
          `${formatarDataBR(item.vencimento)} | ${item.tipoDivida} | ${
            item.fornecedorNome
          } | ${formatarMoeda(item.valor)}`
      )
      .join("\n");

    return `PRESTAÇÃO DE CONTAS
Gestão: ${gestaoAtual?.nomeGestao || "Não informada"}
Repasse recebido de: ${gestaoAtual?.gestaoAnteriorRepasse || "Não informado"}
Início da gestão: ${formatarDataBR(gestaoAtual?.dataInicioGestao || "")}
Venerável Mestre vigente: ${veneravelVigente()}
Tesoureiro vigente: ${tesoureiroVigente()}
Período do relatório: ${tituloPeriodo()}

RESUMO
Saldo líquido inicial: ${formatarMoeda(resumo.saldoInicial)}
Mensalidades recebidas: ${formatarMoeda(resumo.mensalidadesPeriodo)}
Tronco de solidariedade: ${formatarMoeda(resumo.troncoPeriodo)}
Receitas extras: ${formatarMoeda(resumo.receitasExtrasPeriodo)}
Despesas avulsas: ${formatarMoeda(resumo.despesasAvulsasPeriodo)}
Custos fixos pagos: ${formatarMoeda(resumo.custosPagosPeriodo)}
Resultado do período: ${formatarMoeda(resumo.resultadoPeriodo)}
Saldo atual da Loja: ${formatarMoeda(resumo.saldoAtual)}

REPASSE RECEBIDO DA GESTÃO ANTERIOR
Gestão que repassou: ${gestaoAtual?.gestaoAnteriorRepasse || "Não informado"}
Financeiro positivo recebido: ${formatarMoeda(financeiroPositivoRecebido)}
Financeiro negativo/dívidas herdadas: ${formatarMoeda(financeiroNegativoRecebido)}
Saldo líquido inicial: ${formatarMoeda(resumo.saldoInicial)}

COMO ESTAMOS REPASSANDO
Saldo atual em caixa: ${formatarMoeda(resumo.saldoAtual)}
Custos/obrigações em aberto: ${formatarMoeda(resumo.custosEmAberto)}
Valores a receber dos obreiros: ${formatarMoeda(resumo.dividaObreiros)}
Saldo projetado para repasse: ${formatarMoeda(saldoProjetadoRepasse)}

PENDÊNCIAS
Custos em aberto: ${formatarMoeda(resumo.custosEmAberto)}
Pendências de obreiros: ${formatarMoeda(resumo.dividaObreiros)}

MOVIMENTOS DO PERÍODO
${movimentos || "Sem movimentos no período."}

IRMÃOS COM PENDÊNCIA FINANCEIRA
${pendentes || "Não há irmãos com pendência financeira vencida."}

CUSTOS EM ABERTO
${custos || "Não há custos em aberto."}

Documento gerado pelo SIGMA LUMP.`;
  }

  function baixarPDF() {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const linhas = pdf.splitTextToSize(textoRelatorio(), 180);

    let y = 18;

    pdf.setFont("times", "normal");
    pdf.setFontSize(12);

    linhas.forEach((linha: string) => {
      if (y > 280) {
        pdf.addPage();
        y = 18;
      }

      pdf.text(linha, 15, y);
      y += 6;
    });

    pdf.save(`prestacao_de_contas_${tipoRelatorio === "Anual" ? anoTrabalho : mesSelecionado}.pdf`);
  }

  if (!carregado) {
    return (
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
        Carregando prestação de contas...
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-2xl font-bold">Prestação de Contas</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Relatório consolidado respeitando a gestão atual, seu início operacional e o saldo líquido recebido.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="number"
              value={anoTrabalho}
              onChange={(evento) => {
                const novoAno = Number(evento.target.value);
                const mesesValidos = gerarMesesDoAno(novoAno).filter((mes) =>
                  mesCobravel(mes.id, gestaoAtual)
                );

                setAnoTrabalho(novoAno);
                setMesSelecionado(mesesValidos[0]?.id ?? `${novoAno}-01`);
              }}
              className="w-32 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            />

            <select
              value={tipoRelatorio}
              onChange={(evento) => setTipoRelatorio(evento.target.value as TipoRelatorio)}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            >
              <option>Mensal</option>
              <option>Anual</option>
            </select>

            <select
              value={mesSelecionado}
              onChange={(evento) => setMesSelecionado(evento.target.value)}
              disabled={tipoRelatorio === "Anual"}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400 disabled:opacity-40"
            >
              {mesesParaSelecionar.map((mes) => (
                <option key={mes.id} value={mes.id}>
                  {mes.nome}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={baixarPDF}
              className="rounded-full bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              Baixar PDF
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Gestão atual</p>
        <h3 className="mt-3 text-2xl font-bold text-white">
          {gestaoAtual?.nomeGestao || "Nenhuma gestão atual definida"}
        </h3>
        <p className="mt-2 text-sm text-zinc-300">
          Repasse recebido de: {gestaoAtual?.gestaoAnteriorRepasse || "Não informado"}
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Início operacional: {formatarDataBR(gestaoAtual?.dataInicioGestao || "")}
        </p>
      </section>

      {visaoRelatorio === "Sintética" && (
        <section className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-2xl font-bold">Resumo Sintético da Prestação</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Leitura simples para apresentar aos irmãos: o que foi recebido, o que foi pago,
              o que ficou pendente e como a Loja será repassada para a próxima gestão.
            </p>

            <div className="mt-6 grid gap-4 xl:grid-cols-4">
              <article className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-5">
                <p className="text-sm text-sky-200">Repasse da gestão anterior</p>
                <h4 className="mt-2 text-xl font-bold text-white">
                  {gestaoAtual?.gestaoAnteriorRepasse || "Não informado"}
                </h4>
                <p className="mt-2 text-xs text-sky-100/70">
                  Gestão que entregou os valores iniciais.
                </p>
              </article>

              <article className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-sm text-emerald-200">Financeiro positivo recebido</p>
                <h4 className="mt-2 text-2xl font-bold text-emerald-300">
                  {formatarMoeda(financeiroPositivoRecebido)}
                </h4>
                <p className="mt-2 text-xs text-emerald-100/70">
                  Valor em caixa recebido no início.
                </p>
              </article>

              <article className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
                <p className="text-sm text-red-200">Financeiro negativo recebido</p>
                <h4 className="mt-2 text-2xl font-bold text-red-300">
                  {formatarMoeda(financeiroNegativoRecebido)}
                </h4>
                <p className="mt-2 text-xs text-red-100/70">
                  Dívidas herdadas ou obrigações vencidas.
                </p>
              </article>

              <article className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
                <p className="text-sm text-amber-200">Saldo líquido inicial</p>
                <h4 className="mt-2 text-2xl font-bold text-amber-300">
                  {formatarMoeda(resumo.saldoInicial)}
                </h4>
                <p className="mt-2 text-xs text-amber-100/70">
                  Positivo recebido menos negativo herdado.
                </p>
              </article>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
              <h3 className="text-xl font-bold text-emerald-300">Quanto recebemos</h3>
              <p className="mt-2 text-sm text-emerald-100/70">{tituloPeriodo()}</p>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-300">Mensalidades</span>
                  <strong className="text-emerald-300">
                    {formatarMoeda(resumo.mensalidadesPeriodo)}
                  </strong>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-300">Tronco de solidariedade</span>
                  <strong className="text-emerald-300">
                    {formatarMoeda(resumo.troncoPeriodo)}
                  </strong>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-300">Receitas extras</span>
                  <strong className="text-emerald-300">
                    {formatarMoeda(resumo.receitasExtrasPeriodo)}
                  </strong>
                </div>

                <div className="border-t border-emerald-400/20 pt-3">
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-white">Total recebido</span>
                    <strong className="text-xl text-emerald-300">
                      {formatarMoeda(resumo.receitaPeriodo)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-red-400/20 bg-red-400/10 p-6">
              <h3 className="text-xl font-bold text-red-300">Quanto gastamos</h3>
              <p className="mt-2 text-sm text-red-100/70">Saídas registradas no período.</p>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-300">Despesas avulsas</span>
                  <strong className="text-red-300">
                    {formatarMoeda(resumo.despesasAvulsasPeriodo)}
                  </strong>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-300">Custos fixos pagos</span>
                  <strong className="text-red-300">
                    {formatarMoeda(resumo.custosPagosPeriodo)}
                  </strong>
                </div>

                <div className="border-t border-red-400/20 pt-3">
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-white">Total gasto</span>
                    <strong className="text-xl text-red-300">
                      {formatarMoeda(resumo.despesaPeriodo)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Com o que gastamos</p>

                <div className="mt-3 space-y-2">
                  {gastosPorOrigem.slice(0, 5).map((item) => (
                    <div key={item.origem} className="flex justify-between gap-4 text-sm">
                      <span className="text-zinc-400">{item.origem}</span>
                      <strong className="text-red-300">{formatarMoeda(item.valor)}</strong>
                    </div>
                  ))}

                  {gastosPorOrigem.length === 0 && (
                    <p className="text-sm text-zinc-500">Nenhum gasto no período.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
              <h3 className="text-xl font-bold text-amber-300">Como estamos repassando</h3>
              <p className="mt-2 text-sm text-amber-100/70">
                Posição atual para conferência ou futura transição.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-300">Saldo atual em caixa</span>
                  <strong className="text-amber-300">{formatarMoeda(resumo.saldoAtual)}</strong>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-300">Custos em aberto</span>
                  <strong className="text-red-300">{formatarMoeda(resumo.custosEmAberto)}</strong>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-300">Valores a receber dos obreiros</span>
                  <strong className="text-emerald-300">
                    {formatarMoeda(resumo.dividaObreiros)}
                  </strong>
                </div>

                <div className="border-t border-amber-400/20 pt-3">
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-white">Saldo projetado</span>
                    <strong
                      className={`text-xl ${
                        saldoProjetadoRepasse >= 0 ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {formatarMoeda(saldoProjetadoRepasse)}
                    </strong>
                  </div>

                  <p className="mt-2 text-xs text-zinc-500">
                    Saldo atual + valores a receber - obrigações em aberto.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-bold">Leitura simples para apresentação</h3>

            <p className="mt-4 leading-7 text-zinc-300">
              A gestão <strong className="text-white">{gestaoAtual?.nomeGestao || "atual"}</strong>{" "}
              recebeu da gestão{" "}
              <strong className="text-white">
                {gestaoAtual?.gestaoAnteriorRepasse || "anterior"}
              </strong>{" "}
              o valor positivo de{" "}
              <strong className="text-emerald-300">
                {formatarMoeda(financeiroPositivoRecebido)}
              </strong>
              , bem como o valor negativo/dívidas herdadas de{" "}
              <strong className="text-red-300">
                {formatarMoeda(financeiroNegativoRecebido)}
              </strong>
              , iniciando com saldo líquido de{" "}
              <strong className="text-amber-300">{formatarMoeda(resumo.saldoInicial)}</strong>.
              No período de <strong className="text-white">{tituloPeriodo()}</strong>, foram
              recebidos <strong className="text-emerald-300">{formatarMoeda(resumo.receitaPeriodo)}</strong>{" "}
              e gastos <strong className="text-red-300">{formatarMoeda(resumo.despesaPeriodo)}</strong>,
              resultando em <strong className="text-amber-300">{formatarMoeda(resumo.resultadoPeriodo)}</strong>.
              A posição atual para repasse apresenta saldo em caixa de{" "}
              <strong className="text-amber-300">{formatarMoeda(resumo.saldoAtual)}</strong>,
              obrigações em aberto de{" "}
              <strong className="text-red-300">{formatarMoeda(resumo.custosEmAberto)}</strong>{" "}
              e valores a receber de obreiros de{" "}
              <strong className="text-emerald-300">{formatarMoeda(resumo.dividaObreiros)}</strong>.
            </p>
          </section>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          ["Saldo inicial", resumo.saldoInicial, "text-white"],
          ["Receitas", resumo.receitaPeriodo, "text-emerald-300"],
          ["Despesas", resumo.despesaPeriodo, "text-red-300"],
          ["Resultado", resumo.resultadoPeriodo, "text-amber-300"],
          ["Pendências", resumo.custosEmAberto + resumo.dividaObreiros, "text-red-300"],
          ["Saldo atual", resumo.saldoAtual, "text-amber-300"],
        ].map(([titulo, valor, cor]) => (
          <article key={String(titulo)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-zinc-400">{titulo}</p>
            <h3 className={`mt-3 text-2xl font-bold ${cor}`}>{formatarMoeda(Number(valor))}</h3>
            <p className="mt-2 text-xs text-zinc-500">{tituloPeriodo()}</p>
          </article>
        ))}
      </section>

      {visaoRelatorio === "Analítica" && (
        <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Mensalidades", resumo.mensalidadesPeriodo, "text-emerald-300"],
          ["Tronco", resumo.troncoPeriodo, "text-sky-300"],
          ["Receitas extras", resumo.receitasExtrasPeriodo, "text-emerald-300"],
          ["Despesas avulsas", resumo.despesasAvulsasPeriodo, "text-red-300"],
          ["Custos pagos", resumo.custosPagosPeriodo, "text-red-300"],
        ].map(([titulo, valor, cor]) => (
          <article key={String(titulo)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-zinc-400">{titulo}</p>
            <h3 className={`mt-3 text-2xl font-bold ${cor}`}>{formatarMoeda(Number(valor))}</h3>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Movimentos do Período</h3>

        <div className="mt-6 overflow-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[850px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.06] text-zinc-300">
              <tr>
                <th className="px-5 py-4">Data</th>
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4">Origem</th>
                <th className="px-5 py-4">Descrição</th>
                <th className="px-5 py-4">Valor</th>
              </tr>
            </thead>

            <tbody>
              {movimentosPeriodo.map((item) => (
                <tr key={`${item.origem}-${item.id}`} className="border-t border-white/10">
                  <td className="px-5 py-4 text-zinc-300">{formatarDataBR(item.data)}</td>
                  <td className="px-5 py-4 text-zinc-300">{item.tipo}</td>
                  <td className="px-5 py-4 text-zinc-300">{item.origem}</td>
                  <td className="px-5 py-4 text-white">{item.descricao}</td>
                  <td className={`px-5 py-4 font-bold ${item.valor >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {formatarMoeda(item.valor)}
                  </td>
                </tr>
              ))}

              {movimentosPeriodo.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-zinc-500">
                    Nenhum movimento encontrado no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-2xl font-bold">Irmãos com Pendência Financeira</h3>

          <div className="mt-6 space-y-3">
            {inadimplentes.map((item) => (
              <div key={item.obreiro.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{item.obreiro.nome}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.mesesEmAberto} mês(es) em aberto
                    </p>
                  </div>

                  <p className="font-bold text-red-300">{formatarMoeda(item.emAberto)}</p>
                </div>
              </div>
            ))}

            {inadimplentes.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-sm text-zinc-500">
                Não há pendências financeiras vencidas.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-2xl font-bold">Custos em Aberto</h3>

          <div className="mt-6 space-y-3">
            {custosEmAbertoLista.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{item.fornecedorNome}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.tipoDivida} | Vencimento: {formatarDataBR(item.vencimento)}
                    </p>
                  </div>

                  <p className="font-bold text-amber-300">{formatarMoeda(item.valor)}</p>
                </div>
              </div>
            ))}

            {custosEmAbertoLista.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-sm text-zinc-500">
                Não há custos em aberto.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Decisões Financeiras da Loja</h3>

        <div className="mt-6 space-y-3">
          {decisoesFinanceiras.map((decisao) => (
            <div key={decisao.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">{decisao.texto}</p>
              <p className="mt-2 text-xs text-zinc-500">
                {formatarDataBR(decisao.data)} | {decisao.origem}
              </p>
            </div>
          ))}

          {decisoesFinanceiras.length === 0 && (
            <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-sm text-zinc-500">
              Nenhuma decisão financeira registrada.
            </p>
          )}
        </div>
      </section>
        </>
      )}
    </div>
  );
}
