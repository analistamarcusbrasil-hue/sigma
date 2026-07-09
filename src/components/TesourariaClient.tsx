"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { obreirosBase } from "@/lib/mock-data";
import type { Obreiro } from "@/types";

type StatusMensalidade = "Pendente" | "Parcial" | "Pago" | "Isento";
type TipoLancamento = "Tronco de Solidariedade" | "Receita Extra" | "Despesa";

type RegraMensalidade = {
  id: string;
  dataInicio: string;
  valor: number;
  descricao: string;
};

type Mensalidade = {
  id: string;
  obreiroId: string;
  mes: string;
  valorDevido: number;
  valorPago: number;
  status: StatusMensalidade;
  observacao: string;
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

const meses2026 = [
  { id: "2026-01", nome: "Janeiro/2026" },
  { id: "2026-02", nome: "Fevereiro/2026" },
  { id: "2026-03", nome: "Março/2026" },
  { id: "2026-04", nome: "Abril/2026" },
  { id: "2026-05", nome: "Maio/2026" },
  { id: "2026-06", nome: "Junho/2026" },
  { id: "2026-07", nome: "Julho/2026" },
  { id: "2026-08", nome: "Agosto/2026" },
  { id: "2026-09", nome: "Setembro/2026" },
  { id: "2026-10", nome: "Outubro/2026" },
  { id: "2026-11", nome: "Novembro/2026" },
  { id: "2026-12", nome: "Dezembro/2026" },
];

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

function gerarId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataBR(dataISO: string) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
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


function consolidarMensalidades(lista: Mensalidade[]) {
  const mapa = new Map<string, Mensalidade>();

  for (const item of lista) {
    const chave = `${item.obreiroId}_${item.mes}`;
    const anterior = mapa.get(chave);

    if (!anterior) {
      mapa.set(chave, {
        ...item,
        status: calcularStatus(item.valorDevido, item.valorPago),
      });
      continue;
    }

    const valorDevido = item.valorDevido || anterior.valorDevido;
    const valorPago = Math.min(valorDevido, anterior.valorPago + item.valorPago);

    mapa.set(chave, {
      ...anterior,
      valorDevido,
      valorPago,
      status: calcularStatus(valorDevido, valorPago),
      observacao: [anterior.observacao, item.observacao].filter(Boolean).join(" | "),
    });
  }

  return Array.from(mapa.values());
}

export function TesourariaClient() {
  const [obreiros, setObreiros] = useState<Obreiro[]>(normalizarObreiros(obreirosBase));
  const [mesSelecionado, setMesSelecionado] = useState("2026-07");
  const [busca, setBusca] = useState("");
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [regras, setRegras] = useState<RegraMensalidade[]>([regraInicial]);
  const [novaRegra, setNovaRegra] = useState(regraVazia);
  const [pagamentosRapidos, setPagamentosRapidos] = useState<Record<string, string>>({});
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [novoLancamento, setNovoLancamento] = useState(lancamentoVazio);
  const [saldoAnterior, setSaldoAnterior] = useState(0);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const obreirosSalvos = localStorage.getItem("sigma_obreiros");
    const mensalidadesSalvas = localStorage.getItem("sigma_mensalidades");
    const recebimentosSalvos = localStorage.getItem("sigma_recebimentos_tesouraria");
    const regrasSalvas = localStorage.getItem("sigma_regras_mensalidade");
    const lancamentosSalvos = localStorage.getItem("sigma_lancamentos_financeiros");
    const saldoSalvo = localStorage.getItem("sigma_saldo_anterior");

    if (obreirosSalvos) setObreiros(normalizarObreiros(JSON.parse(obreirosSalvos)));
    if (mensalidadesSalvas) setMensalidades(consolidarMensalidades(JSON.parse(mensalidadesSalvas)));
    if (recebimentosSalvos) setRecebimentos(JSON.parse(recebimentosSalvos));

    if (regrasSalvas) {
      const regrasCarregadas = JSON.parse(regrasSalvas);
      if (Array.isArray(regrasCarregadas) && regrasCarregadas.length > 0) {
        setRegras(regrasCarregadas);
      }
    }

    if (lancamentosSalvos) setLancamentos(JSON.parse(lancamentosSalvos));
    if (saldoSalvo) setSaldoAnterior(Number(saldoSalvo));

    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) localStorage.setItem("sigma_mensalidades", JSON.stringify(consolidarMensalidades(mensalidades)));
  }, [mensalidades, carregado]);

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

  function nomeMes(mesId: string) {
    return meses2026.find((mes) => mes.id === mesId)?.nome ?? mesId;
  }

  function valorTotalAno() {
    return meses2026.reduce((total, mes) => {
      return total + valorVigenteDoMes(mes.id);
    }, 0);
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

  function mesesVencidosAteHoje() {
    return meses2026.filter((mes) => mesEstaVencido(mes.id));
  }

  function mesesParaBaixaDoPagamento() {
    return meses2026;
  }

  function recebidoNoMesDoObreiro(obreiroId: string) {
    return recebimentos
      .filter((item) => item.obreiroId === obreiroId && item.mesLancamento === mesSelecionado)
      .reduce((total, item) => total + item.valor, 0);
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

  function buscarMensalidade(obreiroId: string, mes: string) {
    const registros = mensalidades.filter(
      (item) => item.obreiroId === obreiroId && item.mes === mes
    );

    return consolidarMensalidades(registros)[0];
  }

  function obterMensalidade(obreiroId: string, mes: string): Mensalidade {
    const existente = buscarMensalidade(obreiroId, mes);

    if (existente) return existente;

    return {
      id: "",
      obreiroId,
      mes,
      valorDevido: valorVigenteDoMes(mes),
      valorPago: 0,
      status: "Pendente",
      observacao: "",
    };
  }

  function mesesAteSelecionado() {
    return mesesVencidosAteHoje();
  }

  function mesesAntesDoSelecionado() {
    return mesesVencidosAteHoje();
  }

  function distribuicaoFinanceiraIrmao(obreiroId: string) {
    const totalPago = recebimentos
      .filter((item) => item.obreiroId === obreiroId)
      .reduce((total, item) => total + item.valor, 0);

    let saldoPago = totalPago;

    const meses = meses2026.map((mes) => {
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

    const totalEmAberto = vencidos.reduce((total, item) => {
      return total + item.emAberto;
    }, 0);

    const mesesEmAberto = vencidos.filter((item) => item.emAberto > 0).length;

    return {
      totalPago,
      totalEmAberto,
      mesesEmAberto,
      saldoAdiantado: saldoPago,
      meses,
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

  function situacaoFinanceiraIrmao(obreiroId: string) {
    const distribuicao = distribuicaoFinanceiraIrmao(obreiroId);

    return {
      totalDevido: distribuicao.totalEmAberto,
      mesesEmAberto: distribuicao.mesesEmAberto,
    };
  }

  function totalPagoAcumuladoObreiro(obreiroId: string) {
    return distribuicaoFinanceiraIrmao(obreiroId).totalPago;
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

    let saldoParaDistribuir = valorInformado;

    setMensalidades((atuais) => {
      let lista: Mensalidade[] = [...atuais];

      for (const mes of mesesParaBaixaDoPagamento()) {
        if (saldoParaDistribuir <= 0) break;

        const existente = lista.find(
          (item) => item.obreiroId === obreiroId && item.mes === mes.id
        );

        const valorDevido = existente?.valorDevido ?? valorVigenteDoMes(mes.id);
        const valorPagoAtual = existente?.valorPago ?? 0;
        const valorEmAberto = Math.max(valorDevido - valorPagoAtual, 0);

        if (valorEmAberto <= 0) continue;

        const valorAbatido = Math.min(saldoParaDistribuir, valorEmAberto);
        const novoValorPago = valorPagoAtual + valorAbatido;

        const atualizado: Mensalidade = {
          id: existente?.id ?? gerarId(),
          obreiroId,
          mes: mes.id,
          valorDevido,
          valorPago: novoValorPago,
          status: calcularStatus(valorDevido, novoValorPago),
          observacao: existente?.observacao
            ? `${existente.observacao} | Baixa automática de ${formatarMoeda(valorAbatido)} em ${mesSelecionado}`
            : `Baixa automática de ${formatarMoeda(valorAbatido)} em ${mesSelecionado}`,
        };

        if (existente) {
          lista = lista.map((item) =>
            item.obreiroId === obreiroId && item.mes === mes.id ? atualizado : item
          );
        } else {
          lista = [...lista, atualizado];
        }

        saldoParaDistribuir -= valorAbatido;
      }

      return consolidarMensalidades(lista);
    });

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

    const novosRecebimentos: Recebimento[] = [];

    setMensalidades((atuais) => {
      let lista: Mensalidade[] = [...atuais];

      for (const obreiro of obreirosDaLoja) {
        const existente = lista.find(
          (item) => item.obreiroId === obreiro.id && item.mes === mesSelecionado
        );

        const valorDevido = existente?.valorDevido ?? valorVigenteDoMes(mesSelecionado);

        const atualizado: Mensalidade = {
          id: existente?.id ?? gerarId(),
          obreiroId: obreiro.id,
          mes: mesSelecionado,
          valorDevido,
          valorPago: valorDevido,
          status: "Pago",
          observacao: "Pagamento marcado em lote.",
        };

        if (existente) {
          lista = lista.map((item) =>
            item.obreiroId === obreiro.id && item.mes === mesSelecionado ? atualizado : item
          );
        } else {
          lista = [...lista, atualizado];
        }

        novosRecebimentos.push({
          id: gerarId(),
          obreiroId: obreiro.id,
          mesLancamento: mesSelecionado,
          valor: valorDevido,
        });
      }

      return consolidarMensalidades(lista);
    });

    setRecebimentos((atuais) => [...atuais, ...novosRecebimentos]);
  }

  function limparMes() {
    const confirmar = confirm("Deseja limpar os registros do mês selecionado?");
    if (!confirmar) return;

    setMensalidades((atuais) => atuais.filter((item) => item.mes !== mesSelecionado));
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

  const resumoMes = useMemo(() => {
    const recebido = recebimentos
      .filter((item) => item.mesLancamento === mesSelecionado)
      .reduce((total, item) => total + item.valor, 0);

    const vencidoNoMes =
      mesEstaVencido(mesSelecionado) ? obreirosDaLoja.length * valorVigenteDoMes(mesSelecionado) : 0;

    return {
      recebido,
      vencidoNoMes,
    };
  }, [recebimentos, mesSelecionado, obreirosDaLoja, regras]);

  const resumoDivida = useMemo(() => {
    return obreirosDaLoja.reduce((total, obreiro) => {
      return total + situacaoFinanceiraIrmao(obreiro.id).totalDevido;
    }, 0);
  }, [obreirosDaLoja, mensalidades, recebimentos, mesSelecionado, regras]);

  const resumoGeral = useMemo(() => {
    const totalMensalidades = recebimentos.reduce((total, item) => total + item.valor, 0);

    const tronco = lancamentos
      .filter((item) => item.tipo === "Tronco de Solidariedade")
      .reduce((total, item) => total + item.valor, 0);

    const receitas = lancamentos
      .filter((item) => item.tipo === "Receita Extra")
      .reduce((total, item) => total + item.valor, 0);

    const despesas = lancamentos
      .filter((item) => item.tipo === "Despesa")
      .reduce((total, item) => total + item.valor, 0);

    return {
      totalMensalidades,
      tronco,
      receitas,
      despesas,
      saldoAtual: saldoAnterior + totalMensalidades + tronco + receitas - despesas,
    };
  }, [recebimentos, lancamentos, saldoAnterior]);

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
          <p className="text-sm text-zinc-400">Tronco</p>
          <h3 className="mt-3 text-3xl font-bold text-sky-300">
            {formatarMoeda(resumoGeral.tronco)}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">Separado da mensalidade</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Saldo atual</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">
            {formatarMoeda(resumoGeral.saldoAtual)}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">Com saldo anterior</p>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Valor da Mensalidade por Vigência</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Cadastre reajustes com data de início. O valor da linha do irmão é apenas informativo e segue esta vigência.
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
              Lance somente o valor que o irmão está pagando no mês. O sistema abate automaticamente os meses vencidos mais antigos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={mesSelecionado}
              onChange={(evento) => setMesSelecionado(evento.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            >
              {meses2026.map((mes) => (
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
                          Pago da mensalidade: {formatarMoeda(situacaoMes.valorPago)}
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
                        Abate os meses vencidos mais antigos.
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-2xl font-bold">Saldo da Gestão</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Informe o saldo recebido da gestão anterior.
          </p>

          <input
            type="number"
            value={saldoAnterior}
            onChange={(evento) => setSaldoAnterior(Number(evento.target.value))}
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
              <span>Despesas</span>
              <strong className="text-red-300">{formatarMoeda(resumoGeral.despesas)}</strong>
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
          <h3 className="text-2xl font-bold">Tronco, Receitas e Despesas</h3>
          <p className="mt-2 text-sm text-zinc-400">
            O tronco fica separado das mensalidades, mas entra no saldo geral.
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
