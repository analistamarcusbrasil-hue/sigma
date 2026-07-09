"use client";

import { useEffect, useMemo, useState } from "react";
import { obreirosBase } from "@/lib/mock-data";
import type { Obreiro, RegistroPresenca } from "@/types";

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

type Sessao = {
  id: string;
  data: string;
  tipo?: string;
  grau?: string;
  titulo?: string;
  observacao?: string;
};

type DocumentoSecretaria = {
  id: string;
  numero: string;
  tipo: "Ata" | "Balaústre";
  sessaoId: string;
  data: string;
  titulo: string;
  grau: string;
  status: "Rascunho" | "Em revisão" | "Aprovado" | "Arquivado";
  textoGerado?: string;
};

type AcaoPendente = {
  id: string;
  titulo: string;
  responsavelId: string;
  prazo: string;
  status: "Pendente" | "Em andamento" | "Concluída";
  observacao: string;
};

type ProcessoSecretaria = {
  id: string;
  nome: string;
  tipo: string;
  etapa: string;
  responsavelId: string;
  dataPrevista: string;
  status: "Aberto" | "Em andamento" | "Concluído" | "Suspenso";
  observacao: string;
};

type PecaArquitetura = {
  id: string;
  titulo: string;
  obreiroId: string;
  grau: string;
  dataPrevista: string;
  status: "Prevista" | "Apresentada" | "Adiada";
  observacao: string;
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

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

function lerLocalStorage<T>(chave: string, fallback: T): T {
  try {
    const valor = localStorage.getItem(chave);
    if (!valor) return fallback;
    return JSON.parse(valor) as T;
  } catch {
    return fallback;
  }
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

function mesAtualDoSistema() {
  const hoje = hojeDoSistema();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const mesAtual = `${ano}-${mes}`;

  return meses2026.some((item) => item.id === mesAtual) ? mesAtual : "2026-07";
}

function calcularStatusFrequencia(percentual: number, faltas: number) {
  if (faltas > 0 && percentual < 50) {
    return {
      texto: "Notificar Chancelaria",
      classe: "border-red-400/30 bg-red-400/10 text-red-300",
    };
  }

  if (faltas > 0 && percentual < 75) {
    return {
      texto: "Atenção",
      classe: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    };
  }

  return {
    texto: "Regular",
    classe: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  };
}

export function DashboardClient() {
  const [obreiros, setObreiros] = useState<Obreiro[]>(normalizarObreiros(obreirosBase));
  const [regras, setRegras] = useState<RegraMensalidade[]>([regraInicial]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [saldoAnterior, setSaldoAnterior] = useState(0);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [presencas, setPresencas] = useState<RegistroPresenca[]>([]);
  const [documentosSecretaria, setDocumentosSecretaria] = useState<DocumentoSecretaria[]>([]);
  const [acoesSecretaria, setAcoesSecretaria] = useState<AcaoPendente[]>([]);
  const [processosSecretaria, setProcessosSecretaria] = useState<ProcessoSecretaria[]>([]);
  const [pecasSecretaria, setPecasSecretaria] = useState<PecaArquitetura[]>([]);
  const [decisoesLoja, setDecisoesLoja] = useState<DecisaoLoja[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    setObreiros(
      normalizarObreiros(lerLocalStorage<Obreiro[]>("sigma_obreiros", obreirosBase))
    );

    const regrasSalvas = lerLocalStorage<RegraMensalidade[]>("sigma_regras_mensalidade", [
      regraInicial,
    ]);

    setRegras(regrasSalvas.length > 0 ? regrasSalvas : [regraInicial]);
    setRecebimentos(lerLocalStorage<Recebimento[]>("sigma_recebimentos_tesouraria", []));
    setLancamentos(lerLocalStorage<Lancamento[]>("sigma_lancamentos_financeiros", []));
    setSaldoAnterior(Number(localStorage.getItem("sigma_saldo_anterior") ?? 0));
    setSessoes(lerLocalStorage<Sessao[]>("sigma_sessoes", []));
    setPresencas(lerLocalStorage<RegistroPresenca[]>("sigma_presencas", []));
    setDocumentosSecretaria(lerLocalStorage<DocumentoSecretaria[]>("sigma_documentos_secretaria", []));
    setAcoesSecretaria(lerLocalStorage<AcaoPendente[]>("sigma_acoes_secretaria", []));
    setProcessosSecretaria(lerLocalStorage<ProcessoSecretaria[]>("sigma_processos_secretaria", []));
    setPecasSecretaria(lerLocalStorage<PecaArquitetura[]>("sigma_pecas_secretaria", []));
    setDecisoesLoja(lerLocalStorage<DecisaoLoja[]>("sigma_decisoes_loja", []));
    setCarregado(true);
  }, []);

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

  function mesesVencidosAteHoje() {
    const hoje = hojeDoSistema();

    return meses2026.filter((mes) => {
      return dataVencimentoDoMes(mes.id).getTime() <= hoje.getTime();
    });
  }

  function valorTotalAno() {
    return meses2026.reduce((total, mes) => total + valorVigenteDoMes(mes.id), 0);
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
      const vencido = dataVencimentoDoMes(mes.id).getTime() <= hojeDoSistema().getTime();

      return {
        mes: mes.id,
        nome: mes.nome,
        valorDevido,
        valorPago,
        emAberto,
        vencido,
      };
    });

    const vencidos = meses.filter((item) => item.vencido);

    const totalEmAberto = vencidos.reduce((total, item) => total + item.emAberto, 0);
    const mesesEmAberto = vencidos.filter((item) => item.emAberto > 0).length;

    const mesesQuitadosEmSequencia = [];

    for (const mes of meses) {
      if (mes.valorPago >= mes.valorDevido) {
        mesesQuitadosEmSequencia.push(mes);
      } else {
        break;
      }
    }

    const ultimoMesQuitado = mesesQuitadosEmSequencia.at(-1);

    return {
      totalPago,
      totalEmAberto,
      mesesEmAberto,
      ultimoMesQuitado,
      pagoAnoTodo: totalPago >= valorTotalAno(),
      credito: Math.max(totalPago - valorTotalAno(), 0),
    };
  }

  function scoreTesouraria(obreiroId: string) {
    const distribuicao = distribuicaoFinanceiraIrmao(obreiroId);

    if (distribuicao.pagoAnoTodo) {
      return {
        texto: `★ Pago até ${distribuicao.ultimoMesQuitado?.nome ?? "Dezembro/2026"}`,
        detalhe:
          distribuicao.credito > 0
            ? `Anuidade quitada | Crédito: ${formatarMoeda(distribuicao.credito)}`
            : "Anuidade quitada",
        classe: "border-amber-300/40 bg-amber-400/15 text-amber-200",
        ordem: 4,
      };
    }

    if (distribuicao.mesesEmAberto >= 3) {
      return {
        texto: "Notificar Tesouraria",
        detalhe: `${distribuicao.mesesEmAberto} meses em aberto`,
        classe: "border-red-400/30 bg-red-400/10 text-red-300",
        ordem: 1,
      };
    }

    if (distribuicao.mesesEmAberto > 0) {
      return {
        texto: "Atenção",
        detalhe: `${distribuicao.mesesEmAberto} mês(es) em aberto`,
        classe: "border-amber-400/30 bg-amber-400/10 text-amber-300",
        ordem: 2,
      };
    }

    return {
      texto: distribuicao.ultimoMesQuitado
        ? `Pago até ${distribuicao.ultimoMesQuitado.nome}`
        : "Adimplente",
      detalhe: "Sem dívida vencida",
      classe: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
      ordem: 3,
    };
  }

  const obreirosDaLoja = useMemo(() => {
    return [...obreiros]
      .filter((obreiro) => obreiro.tipo !== "Visitante")
      .filter((obreiro) => obreiro.situacao === "Ativo")
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [obreiros]);

  const financeiroPorObreiro = useMemo(() => {
    return obreirosDaLoja
      .map((obreiro) => {
        const distribuicao = distribuicaoFinanceiraIrmao(obreiro.id);
        const score = scoreTesouraria(obreiro.id);

        return {
          obreiro,
          totalPago: distribuicao.totalPago,
          totalEmAberto: distribuicao.totalEmAberto,
          mesesEmAberto: distribuicao.mesesEmAberto,
          score,
        };
      })
      .sort((a, b) => {
        if (a.score.ordem !== b.score.ordem) return a.score.ordem - b.score.ordem;
        return b.totalEmAberto - a.totalEmAberto;
      });
  }, [obreirosDaLoja, recebimentos, regras]);

  const chancelariaPorObreiro = useMemo(() => {
    const hoje = hojeDoSistema();
    const limite = new Date(hoje);
    limite.setFullYear(limite.getFullYear() - 1);

    const sessoesPeriodo = sessoes.filter((sessao) => {
      if (!sessao.data) return false;

      const dataSessao = new Date(`${sessao.data}T12:00:00`);
      return dataSessao >= limite && dataSessao <= hoje;
    });

    return obreirosDaLoja.map((obreiro) => {
      const registros = sessoesPeriodo
        .map((sessao) =>
          presencas.find(
            (presenca) =>
              presenca.obreiroId === obreiro.id && presenca.sessaoId === sessao.id
          )
        )
        .filter(Boolean) as RegistroPresenca[];

      const presentes = registros.filter((item) => item.status === "Presente").length;
      const faltas = registros.filter((item) => item.status === "Falta").length;
      const totalConsiderado = presentes + faltas;
      const percentual = totalConsiderado > 0 ? Math.round((presentes / totalConsiderado) * 100) : 100;
      const status = calcularStatusFrequencia(percentual, faltas);

      return {
        obreiro,
        presentes,
        faltas,
        percentual,
        status,
      };
    });
  }, [obreirosDaLoja, sessoes, presencas]);

  const resumoSecretaria = useMemo(() => {
    const documentosPendentes = documentosSecretaria.filter((item) =>
      item.status === "Rascunho" || item.status === "Em revisão"
    );

    const documentosAprovados = documentosSecretaria.filter((item) =>
      item.status === "Aprovado" || item.status === "Arquivado"
    );

    const acoesPendentes = acoesSecretaria.filter((item) => item.status !== "Concluída");
    const processosAbertos = processosSecretaria.filter((item) => item.status !== "Concluído");
    const pecasPrevistas = pecasSecretaria.filter((item) => item.status === "Prevista");
    const decisoesVigentes = decisoesLoja.filter((item) => item.status === "Vigente");

    return {
      documentosPendentes,
      documentosAprovados,
      acoesPendentes,
      processosAbertos,
      pecasPrevistas,
      decisoesVigentes,
    };
  }, [
    documentosSecretaria,
    acoesSecretaria,
    processosSecretaria,
    pecasSecretaria,
    decisoesLoja,
  ]);

  const resumo = useMemo(() => {
    const mesAtual = mesAtualDoSistema();

    const recebidoMes = recebimentos
      .filter((item) => item.mesLancamento === mesAtual)
      .reduce((total, item) => total + item.valor, 0);

    const totalRecebidoMensalidades = recebimentos.reduce(
      (total, item) => total + item.valor,
      0
    );

    const tronco = lancamentos
      .filter((item) => item.tipo === "Tronco de Solidariedade")
      .reduce((total, item) => total + item.valor, 0);

    const receitas = lancamentos
      .filter((item) => item.tipo === "Receita Extra")
      .reduce((total, item) => total + item.valor, 0);

    const despesas = lancamentos
      .filter((item) => item.tipo === "Despesa")
      .reduce((total, item) => total + item.valor, 0);

    const dividaTotal = financeiroPorObreiro.reduce(
      (total, item) => total + item.totalEmAberto,
      0
    );

    const notificarTesouraria = financeiroPorObreiro.filter(
      (item) => item.score.texto === "Notificar Tesouraria"
    ).length;

    const baixaFrequencia = chancelariaPorObreiro.filter(
      (item) => item.status.texto === "Notificar Chancelaria"
    ).length;

    return {
      mesAtual,
      recebidoMes,
      totalRecebidoMensalidades,
      dividaTotal,
      notificarTesouraria,
      baixaFrequencia,
      saldoAtual: saldoAnterior + totalRecebidoMensalidades + tronco + receitas - despesas,
      mesesVencidos: mesesVencidosAteHoje().length,
    };
  }, [
    recebimentos,
    lancamentos,
    saldoAnterior,
    financeiroPorObreiro,
    chancelariaPorObreiro,
    regras,
  ]);

  const proximaSessao = useMemo(() => {
    const hoje = hojeDoSistema();

    return [...sessoes]
      .filter((sessao) => sessao.data && new Date(`${sessao.data}T12:00:00`) >= hoje)
      .sort(
        (a, b) =>
          new Date(`${a.data}T12:00:00`).getTime() -
          new Date(`${b.data}T12:00:00`).getTime()
      )[0];
  }, [sessoes]);

  if (!carregado) {
    return (
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
        Carregando painel...
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Obreiros ativos</p>
          <h3 className="mt-3 text-3xl font-bold text-white">{obreirosDaLoja.length}</h3>
          <p className="mt-2 text-sm text-zinc-500">Cadastro principal da Loja</p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Recebido no mês</p>
          <h3 className="mt-3 text-3xl font-bold text-emerald-300">
            {formatarMoeda(resumo.recebidoMes)}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">{resumo.mesAtual}</p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Dívida vencida</p>
          <h3 className="mt-3 text-3xl font-bold text-red-300">
            {formatarMoeda(resumo.dividaTotal)}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            {resumo.mesesVencidos} mês(es) vencido(s) no ano
          </p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Saldo atual</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">
            {formatarMoeda(resumo.saldoAtual)}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">Com saldo anterior e lançamentos</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-red-400/20 bg-red-400/10 p-5">
          <p className="text-sm text-red-200">Notificar Tesouraria</p>
          <h3 className="mt-3 text-3xl font-bold text-red-300">
            {resumo.notificarTesouraria}
          </h3>
          <p className="mt-2 text-sm text-red-200/80">Irmãos com 3 ou mais meses em aberto</p>
        </article>

        <article className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
          <p className="text-sm text-amber-200">Baixa frequência</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">
            {resumo.baixaFrequencia}
          </h3>
          <p className="mt-2 text-sm text-amber-200/80">Alertas da Chancelaria</p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Próxima sessão</p>
          <h3 className="mt-3 text-xl font-bold text-white">
            {proximaSessao ? formatarDataBR(proximaSessao.data) : "Não cadastrada"}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            {proximaSessao?.titulo || proximaSessao?.tipo || "Cadastre sessões na Chancelaria"}
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Resumo da Secretaria</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Situação dos documentos, decisões, ações pendentes, processos e peças de arquitetura.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <article className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-sm text-amber-200">Documentos pendentes</p>
            <h4 className="mt-2 text-3xl font-bold text-amber-300">
              {resumoSecretaria.documentosPendentes.length}
            </h4>
            <p className="mt-1 text-xs text-amber-100/70">Rascunho ou revisão</p>
          </article>

          <article className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-sm text-emerald-200">Aprovados</p>
            <h4 className="mt-2 text-3xl font-bold text-emerald-300">
              {resumoSecretaria.documentosAprovados.length}
            </h4>
            <p className="mt-1 text-xs text-emerald-100/70">Atas e balaústres</p>
          </article>

          <article className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
            <p className="text-sm text-red-200">Ações pendentes</p>
            <h4 className="mt-2 text-3xl font-bold text-red-300">
              {resumoSecretaria.acoesPendentes.length}
            </h4>
            <p className="mt-1 text-xs text-red-100/70">Providências abertas</p>
          </article>

          <article className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
            <p className="text-sm text-sky-200">Processos</p>
            <h4 className="mt-2 text-3xl font-bold text-sky-300">
              {resumoSecretaria.processosAbertos.length}
            </h4>
            <p className="mt-1 text-xs text-sky-100/70">Em andamento</p>
          </article>

          <article className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4">
            <p className="text-sm text-violet-200">Peças previstas</p>
            <h4 className="mt-2 text-3xl font-bold text-violet-300">
              {resumoSecretaria.pecasPrevistas.length}
            </h4>
            <p className="mt-1 text-xs text-violet-100/70">Arquitetura</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm text-zinc-300">Decisões vigentes</p>
            <h4 className="mt-2 text-3xl font-bold text-white">
              {resumoSecretaria.decisoesVigentes.length}
            </h4>
            <p className="mt-1 text-xs text-zinc-500">Registro da Loja</p>
          </article>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h4 className="font-semibold text-white">Próximas ações da Secretaria</h4>

            <div className="mt-4 space-y-3">
              {resumoSecretaria.acoesPendentes.slice(0, 5).map((acao) => (
                <div key={acao.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm font-semibold text-white">{acao.titulo}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Status: {acao.status} | Prazo: {formatarDataBR(acao.prazo)}
                  </p>
                </div>
              ))}

              {resumoSecretaria.acoesPendentes.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhuma ação pendente.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h4 className="font-semibold text-white">Últimas decisões registradas</h4>

            <div className="mt-4 space-y-3">
              {resumoSecretaria.decisoesVigentes.slice(0, 5).map((decisao) => (
                <div key={decisao.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm font-semibold text-white">{decisao.texto}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatarDataBR(decisao.data)} | {decisao.origem}
                  </p>
                </div>
              ))}

              {resumoSecretaria.decisoesVigentes.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhuma decisão registrada.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Resumo Financeiro</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Visão rápida da Tesouraria, com dívida vencida, total pago e score financeiro por irmão.
        </p>

        <div className="mt-6 overflow-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.06] text-zinc-300">
              <tr>
                <th className="px-5 py-4">Obreiro</th>
                <th className="px-5 py-4">Total pago</th>
                <th className="px-5 py-4">Em aberto</th>
                <th className="px-5 py-4">Meses em aberto</th>
                <th className="px-5 py-4">Score</th>
              </tr>
            </thead>

            <tbody>
              {financeiroPorObreiro.slice(0, 12).map((item) => (
                <tr key={item.obreiro.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{item.obreiro.nome}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.obreiro.grau} | {item.obreiro.cargo || "Sem cargo"}
                    </p>
                  </td>

                  <td className="px-5 py-4 font-bold text-emerald-300">
                    {formatarMoeda(item.totalPago)}
                  </td>

                  <td className="px-5 py-4 font-bold text-red-300">
                    {formatarMoeda(item.totalEmAberto)}
                  </td>

                  <td className="px-5 py-4 text-zinc-300">{item.mesesEmAberto}</td>

                  <td className="px-5 py-4">
                    <div className={`w-fit rounded-2xl border px-4 py-2 ${item.score.classe}`}>
                      <p className="text-xs font-bold">{item.score.texto}</p>
                      <p className="mt-1 text-[11px]">{item.score.detalhe}</p>
                    </div>
                  </td>
                </tr>
              ))}

              {financeiroPorObreiro.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-zinc-500">
                    Nenhum obreiro ativo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Resumo da Chancelaria</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Frequência dos irmãos considerando as sessões registradas nos últimos 12 meses.
        </p>

        <div className="mt-6 overflow-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.06] text-zinc-300">
              <tr>
                <th className="px-5 py-4">Obreiro</th>
                <th className="px-5 py-4">Presenças</th>
                <th className="px-5 py-4">Faltas</th>
                <th className="px-5 py-4">Frequência</th>
                <th className="px-5 py-4">Situação</th>
              </tr>
            </thead>

            <tbody>
              {chancelariaPorObreiro
                .sort((a, b) => a.percentual - b.percentual)
                .slice(0, 12)
                .map((item) => (
                  <tr key={item.obreiro.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{item.obreiro.nome}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.obreiro.grau} | {item.obreiro.cargo || "Sem cargo"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-emerald-300">{item.presentes}</td>
                    <td className="px-5 py-4 text-red-300">{item.faltas}</td>
                    <td className="px-5 py-4 font-bold text-white">{item.percentual}%</td>

                    <td className="px-5 py-4">
                      <div className={`w-fit rounded-2xl border px-4 py-2 ${item.status.classe}`}>
                        <p className="text-xs font-bold">{item.status.texto}</p>
                      </div>
                    </td>
                  </tr>
                ))}

              {chancelariaPorObreiro.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-zinc-500">
                    Nenhum dado de frequência encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
