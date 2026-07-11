"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { carregarSecretaria, carregarTesouraria, listarGestoes, listarObreiros, listarPresencas, listarSessoes } from "@/lib/supabase/operacional";
import { obreirosBase } from "@/lib/mock-data";
import { carregarObreiros, normalizarObreiros } from "@/lib/obreiros";
import type { Obreiro } from "@/types";

type TipoRelatorio = "Gestão";

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

type GestaoLoja = {
  id: string;
  nomeGestao: string;
  gestaoAnteriorRepasse: string;
  dataInicioGestao: string;
  dataFimGestao: string;
  anoTrabalho: number;
  financeiroPositivoRecebido: number;
  financeiroNegativoRecebido: number;
  observacaoRepasse?: string;
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
  sessaoId?: string;
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

type Sessao = {
  id: string;
  data: string;
  tipo?: string;
  grau?: string;
  titulo?: string;
  observacao?: string;
};

type RegistroPresenca = {
  sessaoId: string;
  obreiroId: string;
  status: "Não marcado" | "Presente" | "Falta" | "Justificado";
  observacao?: string;
  cargoSessao?: string;
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

function hojeLocal() {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  return hoje;
}

function vencimentoDoMes(mesId: string) {
  return `${mesId}-05`;
}

function gerarMesesEntreDatas(dataInicio: string, dataFim?: string) {
  const inicio = dataLocal(dataInicio);
  const fimInformado = dataLocal(dataFim ?? "");
  const fim = fimInformado && fimInformado < hojeLocal() ? fimInformado : hojeLocal();

  if (!inicio) return [];

  const meses: string[] = [];
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1, 12, 0, 0);

  while (cursor <= fim) {
    const ano = cursor.getFullYear();
    const mes = String(cursor.getMonth() + 1).padStart(2, "0");
    meses.push(`${ano}-${mes}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return meses;
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

function saldoInicialGestao(gestao: GestaoLoja | null) {
  if (!gestao) {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem("sigma_saldo_anterior") ?? 0);
  }

  return (
    Number(gestao.financeiroPositivoRecebido || 0) -
    Number(gestao.financeiroNegativoRecebido || 0)
  );
}

function obterGestaoAtual() {
  if (typeof window === "undefined") return null;

  const gestoes = lerLocalStorage<GestaoLoja[]>("sigma_gestoes", []);
  const gestaoAtualId = localStorage.getItem("sigma_gestao_atual_id") ?? "";
  const gestao = gestoes.find((item) => item.id === gestaoAtualId);

  return gestao ?? null;
}

export function DashboardClient() {
  const [gestaoAtual, setGestaoAtual] = useState<GestaoLoja | null>(null);
  const [obreiros, setObreiros] = useState<Obreiro[]>(normalizarObreiros(obreirosBase));
  const [regras, setRegras] = useState<RegraMensalidade[]>([regraInicial]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [custosLoja, setCustosLoja] = useState<CustoLoja[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [presencas, setPresencas] = useState<RegistroPresenca[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoSecretaria[]>([]);
  const [acoes, setAcoes] = useState<AcaoPendente[]>([]);
  const [processos, setProcessos] = useState<ProcessoSecretaria[]>([]);
  const [pecas, setPecas] = useState<PecaArquitetura[]>([]);
  const [decisoes, setDecisoes] = useState<DecisaoLoja[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    Promise.all([listarGestoes(), listarObreiros(), listarSessoes(), listarPresencas(), carregarTesouraria(), carregarSecretaria()])
      .then(([gestoes, obreirosBanco, sessoesBanco, presencasBanco, financeiro, secretaria]) => {
        setGestaoAtual((gestoes.find((item) => item.ativa) ?? null) as GestaoLoja | null);
        setObreiros(obreirosBanco); setSessoes(sessoesBanco as Sessao[]); setPresencas(presencasBanco);
        setRegras(financeiro.regras as RegraMensalidade[]); setRecebimentos(financeiro.recebimentos as Recebimento[]);
        setLancamentos(financeiro.lancamentos as Lancamento[]); setCustosLoja(financeiro.custos as CustoLoja[]);
        setDocumentos(secretaria.documentos as DocumentoSecretaria[]); setAcoes(secretaria.acoes as AcaoPendente[]);
        setProcessos(secretaria.processos as ProcessoSecretaria[]); setPecas(secretaria.pecas as PecaArquitetura[]); setDecisoes(secretaria.decisoes as DecisaoLoja[]);
      }).finally(() => setCarregado(true));
  }, []);

  const obreirosDaLoja = useMemo(() => {
    return [...obreiros]
      .filter((obreiro) => obreiro.tipo !== "Visitante")
      .filter((obreiro) => obreiro.situacao === "Ativo")
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [obreiros]);

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

  function totalPagoObreiro(obreiroId: string) {
    return recebimentos
      .filter((item) => item.obreiroId === obreiroId)
      .filter((item) => dataDentroDaGestao(vencimentoDoMes(item.mesLancamento), gestaoAtual))
      .reduce((total, item) => total + item.valor, 0);
  }

  function inadimplenciaObreiro(obreiroId: string) {
    const mesesCobranca = gerarMesesEntreDatas(
      gestaoAtual?.dataInicioGestao || `${new Date().getFullYear()}-01-01`,
      gestaoAtual?.dataFimGestao
    );

    let saldoPago = totalPagoObreiro(obreiroId);
    let emAberto = 0;
    let mesesEmAberto = 0;

    mesesCobranca.forEach((mesId) => {
      const vencimento = dataLocal(vencimentoDoMes(mesId));

      if (!vencimento || vencimento > hojeLocal()) return;

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

  const financeiro = useMemo(() => {
    const saldoInicial = saldoInicialGestao(gestaoAtual);

    const mensalidades = recebimentos
      .filter((item) => dataDentroDaGestao(vencimentoDoMes(item.mesLancamento), gestaoAtual))
      .reduce((total, item) => total + item.valor, 0);

    const tronco = lancamentos
      .filter((item) => item.tipo === "Tronco de Solidariedade")
      .filter((item) => dataDentroDaGestao(item.data, gestaoAtual))
      .reduce((total, item) => total + item.valor, 0);

    const receitasExtras = lancamentos
      .filter((item) => item.tipo === "Receita Extra")
      .filter((item) => dataDentroDaGestao(item.data, gestaoAtual))
      .reduce((total, item) => total + item.valor, 0);

    const despesasAvulsas = lancamentos
      .filter((item) => item.tipo === "Despesa")
      .filter((item) => dataDentroDaGestao(item.data, gestaoAtual))
      .reduce((total, item) => total + item.valor, 0);

    const custosPagos = parcelasCustos
      .filter((parcela) => parcela.pago)
      .filter((parcela) =>
        dataDentroDaGestao(parcela.dataPagamento || parcela.vencimento, gestaoAtual)
      )
      .reduce((total, parcela) => total + parcela.valor, 0);

    const custosEmAberto = parcelasCustos
      .filter((parcela) => !parcela.pago)
      .filter((parcela) => dataDentroDaGestao(parcela.vencimento, gestaoAtual))
      .reduce((total, parcela) => total + parcela.valor, 0);

    const custosVencidos = parcelasCustos
      .filter((parcela) => !parcela.pago)
      .filter((parcela) => dataDentroDaGestao(parcela.vencimento, gestaoAtual))
      .filter((parcela) => {
        const vencimento = dataLocal(parcela.vencimento);
        return vencimento && vencimento <= hojeLocal();
      })
      .reduce((total, parcela) => total + parcela.valor, 0);

    const dividaObreiros = obreirosDaLoja.reduce((total, obreiro) => {
      return total + inadimplenciaObreiro(obreiro.id).emAberto;
    }, 0);

    const entradas = mensalidades + tronco + receitasExtras;
    const saidas = despesasAvulsas + custosPagos;
    const saldoAtual = saldoInicial + entradas - saidas;
    const saldoProjetado = saldoAtual + dividaObreiros - custosEmAberto;

    return {
      saldoInicial,
      mensalidades,
      tronco,
      receitasExtras,
      despesasAvulsas,
      custosPagos,
      custosEmAberto,
      custosVencidos,
      dividaObreiros,
      entradas,
      saidas,
      saldoAtual,
      saldoProjetado,
    };
  }, [gestaoAtual, recebimentos, lancamentos, parcelasCustos, obreirosDaLoja, regras]);

  const inadimplentes = useMemo(() => {
    return obreirosDaLoja
      .map((obreiro) => ({
        obreiro,
        ...inadimplenciaObreiro(obreiro.id),
      }))
      .filter((item) => item.emAberto > 0)
      .sort((a, b) => b.emAberto - a.emAberto)
      .slice(0, 8);
  }, [obreirosDaLoja, recebimentos, regras, gestaoAtual]);

  const chancelaria = useMemo(() => {
    const sessoesGestao = sessoes
      .filter((sessao) => dataDentroDaGestao(sessao.data, gestaoAtual))
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    const proximas = sessoesGestao.filter((sessao) => {
      const data = dataLocal(sessao.data);
      return data && data >= hojeLocal();
    });

    const proximaSessao = proximas[0];

    const baixaFrequencia = obreirosDaLoja
      .map((obreiro) => {
        const registros = presencas.filter((presenca) => presenca.obreiroId === obreiro.id);

        const sessoesValidas = sessoesGestao.filter((sessao) =>
          registros.some(
            (registro) =>
              registro.sessaoId === sessao.id &&
              (registro.status === "Presente" || registro.status === "Falta")
          )
        );

        const presentes = registros.filter((registro) => {
          const sessaoExiste = sessoesGestao.some((sessao) => sessao.id === registro.sessaoId);
          return sessaoExiste && registro.status === "Presente";
        }).length;

        const faltas = registros.filter((registro) => {
          const sessaoExiste = sessoesGestao.some((sessao) => sessao.id === registro.sessaoId);
          return sessaoExiste && registro.status === "Falta";
        }).length;

        const totalComputado = presentes + faltas;
        const frequencia = totalComputado > 0 ? (presentes / totalComputado) * 100 : 100;

        return {
          obreiro,
          frequencia,
          faltas,
          sessoesComputadas: sessoesValidas.length,
        };
      })
      .filter((item) => item.faltas > 0 && item.frequencia < 50)
      .sort((a, b) => a.frequencia - b.frequencia)
      .slice(0, 6);

    return {
      sessoesGestao,
      proximaSessao,
      baixaFrequencia,
    };
  }, [sessoes, presencas, obreirosDaLoja, gestaoAtual]);

  const secretaria = useMemo(() => {
    const documentosGestao = documentos.filter((documento) =>
      dataDentroDaGestao(documento.data, gestaoAtual)
    );

    const documentosPendentes = documentosGestao.filter(
      (documento) => documento.status === "Rascunho" || documento.status === "Em revisão"
    );

    const documentosAprovados = documentosGestao.filter(
      (documento) => documento.status === "Aprovado" || documento.status === "Arquivado"
    );

    const acoesPendentes = acoes.filter((acao) => acao.status !== "Concluída");
    const processosAbertos = processos.filter((processo) => processo.status !== "Concluído");
    const pecasPrevistas = pecas.filter((peca) => peca.status === "Prevista");
    const decisoesVigentes = decisoes.filter((decisao) => decisao.status === "Vigente");

    return {
      documentosPendentes,
      documentosAprovados,
      acoesPendentes,
      processosAbertos,
      pecasPrevistas,
      decisoesVigentes,
    };
  }, [documentos, acoes, processos, pecas, decisoes, gestaoAtual]);

  const fluxoSessoes = useMemo(() => {
    return sessoes
      .filter((sessao) => dataDentroDaGestao(sessao.data, gestaoAtual))
      .sort((a, b) => b.data.localeCompare(a.data))
      .map((sessao) => {
        const chamadaConcluida = presencas.some(
          (registro) =>
            registro.sessaoId === sessao.id && registro.status !== "Não marcado"
        );
        const tronco = lancamentos
          .filter(
            (lancamento) =>
              lancamento.tipo === "Tronco de Solidariedade" && lancamento.sessaoId === sessao.id
          )
          .reduce((total, lancamento) => total + lancamento.valor, 0);
        const balaustre = documentos.find(
          (documento) => documento.sessaoId === sessao.id && documento.tipo === "Balaústre"
        );

        return {
          sessao,
          chamadaConcluida,
          tronco,
          balaustre,
          pendencias: [
            !chamadaConcluida ? "Frequência" : "",
            tronco <= 0 ? "Tronco" : "",
            !balaustre ? "Balaústre" : "",
          ].filter(Boolean),
        };
      });
  }, [sessoes, gestaoAtual, presencas, lancamentos, documentos]);

  const resumoFluxoSessoes = useMemo(
    () => ({
      total: fluxoSessoes.length,
      frequenciaPendente: fluxoSessoes.filter((item) => !item.chamadaConcluida).length,
      troncoPendente: fluxoSessoes.filter((item) => item.tronco <= 0).length,
      balaustrePendente: fluxoSessoes.filter((item) => !item.balaustre).length,
    }),
    [fluxoSessoes]
  );

  const alertas = useMemo(() => {
    const lista = [];

    if (!gestaoAtual) {
      lista.push({
        titulo: "Nenhuma gestão atual definida",
        texto: "Cadastre uma gestão e marque como atual para o sistema trabalhar corretamente.",
        href: "/configuracoes",
        cor: "red",
      });
    }

    if (financeiro.custosVencidos > 0) {
      lista.push({
        titulo: "Custos vencidos",
        texto: `Existem ${formatarMoeda(financeiro.custosVencidos)} em custos vencidos ou obrigações em aberto.`,
        href: "/tesouraria",
        cor: "red",
      });
    }

    if (financeiro.dividaObreiros > 0) {
      lista.push({
        titulo: "Pendência de obreiros",
        texto: `Existem ${formatarMoeda(financeiro.dividaObreiros)} em mensalidades vencidas.`,
        href: "/tesouraria",
        cor: "amber",
      });
    }

    if (secretaria.documentosPendentes.length > 0) {
      lista.push({
        titulo: "Documentos pendentes",
        texto: `${secretaria.documentosPendentes.length} documento(s) aguardando revisão ou aprovação.`,
        href: "/secretaria",
        cor: "amber",
      });
    }

    if (secretaria.acoesPendentes.length > 0) {
      lista.push({
        titulo: "Ações da Secretaria",
        texto: `${secretaria.acoesPendentes.length} ação(ões) pendente(s) de acompanhamento.`,
        href: "/secretaria",
        cor: "sky",
      });
    }

    if (lista.length === 0) {
      lista.push({
        titulo: "Gestão sem alertas críticos",
        texto: "Não há pendências críticas no momento.",
        href: "/dashboard",
        cor: "emerald",
      });
    }

    return lista;
  }, [gestaoAtual, financeiro, secretaria]);

  if (!carregado) {
    return (
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
        Carregando painel da gestão...
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/15 to-white/[0.03] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Gestão atual</p>
            <h3 className="mt-3 text-3xl font-bold text-white">
              {gestaoAtual?.nomeGestao || "Nenhuma gestão atual definida"}
            </h3>

            <p className="mt-2 text-sm text-zinc-300">
              Repasse recebido de: {gestaoAtual?.gestaoAnteriorRepasse || "Não informado"}
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              Período: {formatarDataBR(gestaoAtual?.dataInicioGestao || "")} até{" "}
              {formatarDataBR(gestaoAtual?.dataFimGestao || "")}
            </p>
          </div>

          <Link
            href="/prestacao-contas"
            className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
          >
            Ver Prestação de Contas
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Venerável Mestre", gestaoAtual?.cargos?.veneravelMestre],
            ["Secretário", gestaoAtual?.cargos?.secretario],
            ["Tesoureiro", gestaoAtual?.cargos?.tesoureiro],
            ["Chanceler", gestaoAtual?.cargos?.chanceler],
          ].map(([cargo, nome]) => (
            <div key={cargo} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-300">{cargo}</p>
              <p className="mt-2 font-semibold text-white">{nome || "Não informado"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          ["Saldo inicial", financeiro.saldoInicial, "text-amber-300", "Recebido líquido"],
          ["Entradas", financeiro.entradas, "text-emerald-300", "Gestão atual"],
          ["Saídas", financeiro.saidas, "text-red-300", "Gestão atual"],
          ["Saldo atual", financeiro.saldoAtual, "text-amber-300", "Caixa atual"],
          ["A receber", financeiro.dividaObreiros, "text-emerald-300", "Obreiros"],
          ["Saldo projetado", financeiro.saldoProjetado, financeiro.saldoProjetado >= 0 ? "text-emerald-300" : "text-red-300", "Repasse futuro"],
        ].map(([titulo, valor, cor, detalhe]) => (
          <article key={String(titulo)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-zinc-400">{titulo}</p>
            <h4 className={`mt-3 text-2xl font-bold ${cor}`}>
              {formatarMoeda(Number(valor))}
            </h4>
            <p className="mt-2 text-xs text-zinc-500">{detalhe}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.09] to-white/[0.03] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Fluxo operacional</p>
            <h3 className="mt-2 text-2xl font-bold">Acompanhamento das sessões</h3>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Confira o que falta concluir entre Secretaria, Chancelaria e Tesouraria antes de finalizar o Balaústre.
            </p>
          </div>
          <Link
            href="/secretaria#sessoes"
            className="w-fit rounded-full border border-amber-400/35 px-5 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/10"
          >
            Criar sessão
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Sessões", resumoFluxoSessoes.total, "text-white"],
            ["Sem frequência", resumoFluxoSessoes.frequenciaPendente, "text-red-300"],
            ["Sem Tronco", resumoFluxoSessoes.troncoPendente, "text-amber-300"],
            ["Sem Balaústre", resumoFluxoSessoes.balaustrePendente, "text-sky-300"],
          ].map(([titulo, valor, cor]) => (
            <div key={String(titulo)} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-zinc-400">{titulo}</p>
              <p className={`mt-2 text-2xl font-bold ${cor}`}>{valor}</p>
            </div>
          ))}
        </div>

        {fluxoSessoes.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/10 p-6 text-sm text-zinc-400">
            Nenhuma sessão cadastrada na gestão atual. Crie a primeira sessão na Secretaria para iniciar o fluxo.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {fluxoSessoes.slice(0, 6).map((item) => (
              <article key={item.sessao.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="font-semibold text-white">
                      {formatarDataBR(item.sessao.data)} · {item.sessao.titulo || item.sessao.tipo || "Sessão"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {item.pendencias.length > 0
                        ? `Pendente: ${item.pendencias.join(", ")}`
                        : "Fluxo concluído para esta sessão."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <Link
                      href="/chancelaria#controle-frequencia"
                      className={`rounded-full border px-3 py-2 transition ${item.chamadaConcluida ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20"}`}
                    >
                      {item.chamadaConcluida ? "Frequência concluída" : "Registrar frequência"}
                    </Link>
                    <Link
                      href="/tesouraria#caixa"
                      className={`rounded-full border px-3 py-2 transition ${item.tronco > 0 ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"}`}
                    >
                      {item.tronco > 0 ? `Tronco: ${formatarMoeda(item.tronco)}` : "Registrar Tronco"}
                    </Link>
                    <Link
                      href="/secretaria#documentos"
                      className={`rounded-full border px-3 py-2 transition ${item.balaustre ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-sky-400/30 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20"}`}
                    >
                      {item.balaustre ? `Balaústre: ${item.balaustre.status}` : "Gerar Balaústre"}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-2xl font-bold">Resumo Financeiro da Gestão</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Visão rápida do caixa, custos, recebimentos e previsão de repasse.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <p className="text-sm text-emerald-200">Receitas acumuladas</p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-300">Mensalidades</span>
                  <strong className="text-emerald-300">{formatarMoeda(financeiro.mensalidades)}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-300">Tronco</span>
                  <strong className="text-emerald-300">{formatarMoeda(financeiro.tronco)}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-300">Receitas extras</span>
                  <strong className="text-emerald-300">{formatarMoeda(financeiro.receitasExtras)}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
              <p className="text-sm text-red-200">Despesas e obrigações</p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-300">Despesas avulsas</span>
                  <strong className="text-red-300">{formatarMoeda(financeiro.despesasAvulsas)}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-300">Custos pagos</span>
                  <strong className="text-red-300">{formatarMoeda(financeiro.custosPagos)}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-300">Custos em aberto</span>
                  <strong className="text-red-300">{formatarMoeda(financeiro.custosEmAberto)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-black/20 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-zinc-400">Resumo do caixa até o momento</p>
                <h4 className="mt-2 text-2xl font-bold text-white">
                  Saldo atual:{" "}
                  <span className="text-amber-300">{formatarMoeda(financeiro.saldoAtual)}</span>
                </h4>
              </div>

              <div className="text-left md:text-right">
                <p className="text-sm text-zinc-400">Saldo projetado para repasse</p>
                <h4
                  className={`mt-2 text-2xl font-bold ${
                    financeiro.saldoProjetado >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {formatarMoeda(financeiro.saldoProjetado)}
                </h4>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-2xl font-bold">Alertas</h3>
          <p className="mt-2 text-sm text-zinc-400">O que precisa de atenção agora.</p>

          <div className="mt-6 space-y-3">
            {alertas.map((alerta) => (
              <Link
                key={alerta.titulo}
                href={alerta.href}
                className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/[0.05]"
              >
                <p className="font-semibold text-white">{alerta.titulo}</p>
                <p className="mt-1 text-sm text-zinc-400">{alerta.texto}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-bold">Tesouraria</h3>

          <div className="mt-5 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Obreiros com pendência</span>
              <strong className="text-red-300">{inadimplentes.length}</strong>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total em aberto</span>
              <strong className="text-red-300">{formatarMoeda(financeiro.dividaObreiros)}</strong>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Custos vencidos</span>
              <strong className="text-red-300">{formatarMoeda(financeiro.custosVencidos)}</strong>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {inadimplentes.slice(0, 4).map((item) => (
              <div key={item.obreiro.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold text-white">{item.obreiro.nome}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.mesesEmAberto} mês(es) | {formatarMoeda(item.emAberto)}
                </p>
              </div>
            ))}

            {inadimplentes.length === 0 && (
              <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-500">
                Nenhuma pendência financeira vencida.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-bold">Chancelaria</h3>

          <div className="mt-5 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Sessões na gestão</span>
              <strong className="text-white">{chancelaria.sessoesGestao.length}</strong>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Baixa frequência</span>
              <strong className="text-red-300">{chancelaria.baixaFrequencia.length}</strong>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-zinc-500">Próxima sessão</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {chancelaria.proximaSessao
                  ? `${formatarDataBR(chancelaria.proximaSessao.data)} - ${
                      chancelaria.proximaSessao.titulo || chancelaria.proximaSessao.tipo || "Sessão"
                    }`
                  : "Nenhuma sessão futura cadastrada"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {chancelaria.baixaFrequencia.slice(0, 4).map((item) => (
              <div key={item.obreiro.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold text-white">{item.obreiro.nome}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Frequência: {item.frequencia.toFixed(0)}% | Faltas: {item.faltas}
                </p>
              </div>
            ))}

            {chancelaria.baixaFrequencia.length === 0 && (
              <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-500">
                Nenhum alerta grave de frequência.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-bold">Secretaria</h3>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["Pendentes", secretaria.documentosPendentes.length],
              ["Aprovados", secretaria.documentosAprovados.length],
              ["Ações", secretaria.acoesPendentes.length],
              ["Processos", secretaria.processosAbertos.length],
              ["Peças", secretaria.pecasPrevistas.length],
              ["Decisões", secretaria.decisoesVigentes.length],
            ].map(([titulo, valor]) => (
              <div key={String(titulo)} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-zinc-500">{titulo}</p>
                <p className="mt-1 text-xl font-bold text-white">{valor}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            {secretaria.acoesPendentes.slice(0, 3).map((acao) => (
              <div key={acao.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold text-white">{acao.titulo}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {acao.status} | Prazo: {formatarDataBR(acao.prazo)}
                </p>
              </div>
            ))}

            {secretaria.acoesPendentes.length === 0 && (
              <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-500">
                Nenhuma ação pendente.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Link
          href="/configuracoes"
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:bg-white/[0.08]"
        >
          <p className="font-bold text-white">Cadastro de Gestão</p>
          <p className="mt-2 text-sm text-zinc-500">Gestão, repasse e diretoria.</p>
        </Link>

        <Link
          href="/tesouraria"
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:bg-white/[0.08]"
        >
          <p className="font-bold text-white">Tesouraria</p>
          <p className="mt-2 text-sm text-zinc-500">Mensalidades, custos e saldo.</p>
        </Link>

        <Link
          href="/chancelaria"
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:bg-white/[0.08]"
        >
          <p className="font-bold text-white">Chancelaria</p>
          <p className="mt-2 text-sm text-zinc-500">Sessões, cargos e frequência.</p>
        </Link>

        <Link
          href="/secretaria"
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:bg-white/[0.08]"
        >
          <p className="font-bold text-white">Secretaria</p>
          <p className="mt-2 text-sm text-zinc-500">Atas, decisões e processos.</p>
        </Link>
      </section>
    </div>
  );
}
