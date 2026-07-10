"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { obreirosBase } from "@/lib/mock-data";
import { carregarObreiros, normalizarObreiros } from "@/lib/obreiros";
import type { Obreiro, RegistroPresenca } from "@/types";

type Sessao = {
  id: string;
  data: string;
  tipo?: string;
  grau?: string;
  titulo?: string;
  observacao?: string;
};

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

type DocumentoSecretaria = {
  id: string;
  numero: string;
  tipo: "Ata" | "Balaústre";
  sessaoId: string;
  data: string;
  titulo: string;
  grau: string;
  status: "Rascunho" | "Em revisão" | "Aprovado" | "Arquivado";
  ordemDoDia: string;
  resumo: string;
  deliberacoes: string;
  tronco: string;
  observacoes: string;
  relatoBruto: string;
  decisoesLoja: string;
  textoGerado: string;
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
  tipo: "Admissão" | "Iniciação" | "Elevação" | "Exaltação" | "Regularização" | "Filiação";
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

const documentoVazio: Omit<DocumentoSecretaria, "id"> = {
  numero: "",
  tipo: "Balaústre",
  sessaoId: "",
  data: "",
  titulo: "",
  grau: "Aprendiz",
  status: "Rascunho",
  ordemDoDia: "",
  resumo: "",
  deliberacoes: "",
  tronco: "",
  observacoes: "",
  relatoBruto: "",
  decisoesLoja: "",
  textoGerado: "",
};

const acaoVazia: Omit<AcaoPendente, "id"> = {
  titulo: "",
  responsavelId: "",
  prazo: "",
  status: "Pendente",
  observacao: "",
};

const processoVazio: Omit<ProcessoSecretaria, "id"> = {
  nome: "",
  tipo: "Admissão",
  etapa: "",
  responsavelId: "",
  dataPrevista: "",
  status: "Aberto",
  observacao: "",
};

const pecaVazia: Omit<PecaArquitetura, "id"> = {
  titulo: "",
  obreiroId: "",
  grau: "Aprendiz",
  dataPrevista: "",
  status: "Prevista",
  observacao: "",
};

function gerarId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

function formatarDataBR(dataISO: string) {
  if (!dataISO) return "Sem data";
  const partes = dataISO.split("-");
  if (partes.length !== 3) return dataISO;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
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

function separarDecisoes(texto: string) {
  return texto
    .split("\n")
    .map((linha) =>
      linha
        .replace(/^[-•*]\s*/, "")
        .replace(/^decisão[:\-]?\s*/i, "")
        .trim()
    )
    .filter(Boolean);
}

function classeStatus(status: string) {
  if (status === "Concluído" || status === "Concluída" || status === "Aprovado" || status === "Arquivado" || status === "Apresentada") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "Em andamento" || status === "Em revisão") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }

  if (status === "Suspenso" || status === "Adiada") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  return "border-zinc-400/30 bg-white/[0.04] text-zinc-300";
}

function obterGestaoAtualDaLoja(): GestaoLoja | null {
  if (typeof window === "undefined") return null;

  try {
    const gestoesRaw = localStorage.getItem("sigma_gestoes");
    const gestaoAtualId = localStorage.getItem("sigma_gestao_atual_id") ?? "";

    if (!gestoesRaw) return null;

    const gestoes = JSON.parse(gestoesRaw) as GestaoLoja[];
    return gestoes.find((gestao) => gestao.id === gestaoAtualId) ?? null;
  } catch {
    return null;
  }
}

function formatarDataDocumento(dataISO: string) {
  if (!dataISO) return "Não informado";

  const partes = dataISO.split("-");
  if (partes.length !== 3) return dataISO;

  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function normalizarCargo(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[ºª.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function SecretariaClient() {
  const [obreiros, setObreiros] = useState<Obreiro[]>(normalizarObreiros(obreirosBase));
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [presencas, setPresencas] = useState<RegistroPresenca[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoSecretaria[]>([]);
  const [acoes, setAcoes] = useState<AcaoPendente[]>([]);
  const [processos, setProcessos] = useState<ProcessoSecretaria[]>([]);
  const [pecas, setPecas] = useState<PecaArquitetura[]>([]);
  const [decisoes, setDecisoes] = useState<DecisaoLoja[]>([]);
  const [mesInformativo, setMesInformativo] = useState("2026-07");
  const [documentoAbertoId, setDocumentoAbertoId] = useState("");
  const [documentoEmEdicaoId, setDocumentoEmEdicaoId] = useState("");
  const [novoDocumento, setNovoDocumento] = useState(documentoVazio);
  const [novaAcao, setNovaAcao] = useState(acaoVazia);
  const [novoProcesso, setNovoProcesso] = useState(processoVazio);
  const [novaPeca, setNovaPeca] = useState(pecaVazia);
  const [gestaoAtual, setGestaoAtual] = useState<GestaoLoja | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    setGestaoAtual(obterGestaoAtualDaLoja());
    setObreiros(carregarObreiros());
    setSessoes(lerLocalStorage<Sessao[]>("sigma_sessoes", []));
    setPresencas(lerLocalStorage<RegistroPresenca[]>("sigma_presencas", []));
    setDocumentos(lerLocalStorage<DocumentoSecretaria[]>("sigma_documentos_secretaria", []));
    setAcoes(lerLocalStorage<AcaoPendente[]>("sigma_acoes_secretaria", []));
    setProcessos(lerLocalStorage<ProcessoSecretaria[]>("sigma_processos_secretaria", []));
    setPecas(lerLocalStorage<PecaArquitetura[]>("sigma_pecas_secretaria", []));
    setDecisoes(lerLocalStorage<DecisaoLoja[]>("sigma_decisoes_loja", []));
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) localStorage.setItem("sigma_documentos_secretaria", JSON.stringify(documentos));
  }, [documentos, carregado]);

  useEffect(() => {
    if (carregado) localStorage.setItem("sigma_acoes_secretaria", JSON.stringify(acoes));
  }, [acoes, carregado]);

  useEffect(() => {
    if (carregado) localStorage.setItem("sigma_processos_secretaria", JSON.stringify(processos));
  }, [processos, carregado]);

  useEffect(() => {
    if (carregado) localStorage.setItem("sigma_pecas_secretaria", JSON.stringify(pecas));
  }, [pecas, carregado]);

  const obreirosDaLoja = useMemo(() => {
    return [...obreiros]
      .filter((obreiro) => obreiro.tipo !== "Visitante")
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [obreiros]);

  const sessoesOrdenadas = useMemo(() => {
    return [...sessoes].sort(
      (a, b) => new Date(`${b.data}T12:00:00`).getTime() - new Date(`${a.data}T12:00:00`).getTime()
    );
  }, [sessoes]);

  function nomeObreiro(id: string) {
    return obreiros.find((obreiro) => obreiro.id === id)?.nome ?? "Não informado";
  }

  function normalizarTexto(valor: string) {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function nomePorCargoDaSessao(sessaoId: string, termos: string[]) {
    const termosNormalizados = termos.map(normalizarTexto);

    const registroDaSessao = presencas.find((presenca) => {
      const cargo = normalizarTexto(presenca.cargoSessao ?? "");
      return (
        presenca.sessaoId === sessaoId &&
        termosNormalizados.some((termo) => cargo.includes(termo))
      );
    });

    if (registroDaSessao) {
      return nomeObreiro(registroDaSessao.obreiroId);
    }

    const obreiroPeloCadastro = obreirosDaLoja.find((obreiro) => {
      const cargo = normalizarTexto(obreiro.cargo ?? "");
      return termosNormalizados.some((termo) => cargo.includes(termo));
    });

    return obreiroPeloCadastro?.nome ?? "Não informado";
  }

  function sessaoPorId(id: string) {
    return sessoes.find((sessao) => sessao.id === id);
  }

    function nomeCargoSessao(cargoBuscado: string, sessaoId: string) {
    if (!sessaoId) return "";

    const cargoNormalizado = normalizarCargo(cargoBuscado);

    const registro = presencas.find((item) => {
      const cargoSessao = normalizarCargo(item.cargoSessao ?? "");

      return (
        item.sessaoId === sessaoId &&
        item.status === "Presente" &&
        cargoSessao.includes(cargoNormalizado)
      );
    });

    if (!registro) return "";

    return obreiros.find((obreiro) => obreiro.id === registro.obreiroId)?.nome ?? "";
  }

  function nomeCargoDocumento(cargo: keyof CargosGestao, sessaoId: string) {
    const mapaCargo: Record<keyof CargosGestao, string> = {
      veneravelMestre: "veneravel mestre",
      primeiroVigilante: "primeiro vigilante",
      segundoVigilante: "segundo vigilante",
      orador: "orador",
      secretario: "secretario",
      tesoureiro: "tesoureiro",
      chanceler: "chanceler",
      mestreCerimonias: "mestre de cerimonias",
    };

    return (
      nomeCargoSessao(mapaCargo[cargo], sessaoId) ||
      gestaoAtual?.cargos?.[cargo]?.trim() ||
      "Não informado"
    );
  }

  function cabecalhoGestaoDocumento(documento: DocumentoSecretaria) {
    return `À GLÓRIA DO G∴A∴D∴U∴
A∴R∴L∴S∴ Universitária Mensageiros da Paz nº 3934

GESTÃO
Gestão: ${gestaoAtual?.nomeGestao || "Não informada"}
Repasse recebido de: ${gestaoAtual?.gestaoAnteriorRepasse || "Não informado"}
Período da gestão: ${formatarDataDocumento(gestaoAtual?.dataInicioGestao || "")} até ${formatarDataDocumento(gestaoAtual?.dataFimGestao || "")}

DIREÇÃO VIGENTE
Venerável Mestre: ${nomeCargoDocumento("veneravelMestre", documento.sessaoId)}
Secretário: ${nomeCargoDocumento("secretario", documento.sessaoId)}
Tesoureiro: ${nomeCargoDocumento("tesoureiro", documento.sessaoId)}`;
  }

  function rodapeAssinaturasDocumento(documento: DocumentoSecretaria) {
    return `

ASSINATURAS

________________________________________
${nomeCargoDocumento("veneravelMestre", documento.sessaoId)}
Venerável Mestre

________________________________________
${nomeCargoDocumento("secretario", documento.sessaoId)}
Secretário`;
  }

function montarBalaustrePadrao(documento: Omit<DocumentoSecretaria, "id"> | DocumentoSecretaria) {
    const sessao = sessaoPorId(documento.sessaoId);
    const data = documento.data || sessao?.data || "";
    const tituloSessao = documento.titulo || sessao?.titulo || sessao?.tipo || "Sessão";
    const grau = documento.grau || sessao?.grau || "Grau não informado";
    const veneravelMestre = nomePorCargoDaSessao(documento.sessaoId, ["veneravel"]);
    const secretarioSessao = nomePorCargoDaSessao(documento.sessaoId, ["secretario"]);
    const decisoesTexto = separarDecisoes(documento.decisoesLoja);

    const decisoesFormatadas =
      decisoesTexto.length > 0
        ? decisoesTexto.map((decisao, index) => `${index + 1}. ${decisao}`).join("\n")
        : "Não foram registradas decisões deliberativas para arquivamento permanente.";

    return `À GLÓRIA DO G∴A∴D∴U∴

${documento.tipo.toUpperCase()} Nº ${documento.numero || "____"}/2026
A∴R∴L∴S∴ UNIVERSITÁRIA MENSAGEIROS DA PAZ Nº 3934
Rito Adonhiramita

Aos ${formatarDataBR(data)}, realizou-se ${tituloSessao}, em ${grau}, conforme registros da Loja.

COMPOSIÇÃO DA SESSÃO
Venerável Mestre: ${veneravelMestre}
Secretário: ${secretarioSessao}

RELATO DA SESSÃO
${documento.relatoBruto || "Relato bruto ainda não informado."}

ORDEM DO DIA
${documento.ordemDoDia || "A ordem do dia será consolidada pela Secretaria conforme os assuntos tratados em Loja."}

DELIBERAÇÕES E DECISÕES DA LOJA
${decisoesFormatadas}

TRONCO DE SOLIDARIEDADE
${documento.tronco || "Não informado."}

OBSERVAÇÕES DA SECRETARIA
${documento.observacoes || "Nada mais havendo a registrar, o presente documento segue para revisão e aprovação."}

Documento gerado pela Secretaria para conferência, ajustes finais e aprovação em Loja.`;
  }

  function gerarMinutaDocumento() {
    setNovoDocumento((atual) => ({
      ...atual,
      textoGerado: montarBalaustrePadrao(atual),
      resumo:
        atual.resumo ||
        "Minuta gerada a partir do relato bruto da sessão, pendente de revisão final da Secretaria.",
    }));
  }

  function gerarInformativoMensal() {
    const decisoesDoMes = decisoes.filter((decisao) => decisao.data.startsWith(mesInformativo));

    const linhasDecisoes =
      decisoesDoMes.length > 0
        ? decisoesDoMes
            .map((decisao, index) => `${index + 1}. ${decisao.texto}`)
            .join("\n")
        : "Não há decisões registradas para este mês.";

    return `INFORMATIVO MENSAL DA LOJA
A∴R∴L∴S∴ Universitária Mensageiros da Paz nº 3934
Referência: ${mesInformativo}

DECISÕES REGISTRADAS EM LOJA
${linhasDecisoes}

Observação: as decisões acima ficam registradas para ciência dos Irmãos e para evitar rediscussão de matéria já deliberada, salvo nova deliberação formal em Loja.`;
  }

  function preencherPelaSessao(sessaoId: string) {
    const sessao = sessaoPorId(sessaoId);

    setNovoDocumento((atual) => ({
      ...atual,
      sessaoId,
      data: sessao?.data ?? atual.data,
      titulo: sessao?.titulo || sessao?.tipo || atual.titulo,
      grau: sessao?.grau || atual.grau,
      resumo:
        atual.resumo ||
        `Sessão realizada em ${formatarDataBR(sessao?.data ?? "")}, em ${sessao?.grau || "grau não informado"}, conforme registros da Loja.`,
    }));
  }

  function salvarDocumento(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!novoDocumento.numero.trim()) {
      alert("Informe o número do documento.");
      return;
    }

    if (!novoDocumento.data) {
      alert("Informe a data.");
      return;
    }

    if (!novoDocumento.titulo.trim()) {
      alert("Informe o título.");
      return;
    }

    const documentoId = documentoEmEdicaoId || gerarId();

    const textoFinal =
      novoDocumento.textoGerado.trim().length > 0
        ? novoDocumento.textoGerado
        : montarBalaustrePadrao(novoDocumento);

    const documentoSalvo: DocumentoSecretaria = {
      id: documentoId,
      ...novoDocumento,
      numero: novoDocumento.numero.trim(),
      titulo: novoDocumento.titulo.trim(),
      textoGerado: textoFinal,
      resumo:
        novoDocumento.resumo.trim().length > 0
          ? novoDocumento.resumo
          : textoFinal.slice(0, 350),
    };

    setDocumentos((atuais) => {
      if (documentoEmEdicaoId) {
        return atuais.map((item) => (item.id === documentoEmEdicaoId ? documentoSalvo : item));
      }

      return [documentoSalvo, ...atuais];
    });

    const novasDecisoes = separarDecisoes(novoDocumento.decisoesLoja).map((decisao) => ({
      id: gerarId(),
      documentoId,
      sessaoId: novoDocumento.sessaoId,
      data: novoDocumento.data,
      texto: decisao,
      status: "Vigente" as const,
      origem: `${novoDocumento.tipo} nº ${novoDocumento.numero}`,
    }));

    setDecisoes((atuais) => [
      ...novasDecisoes,
      ...atuais.filter((decisao) => decisao.documentoId !== documentoId),
    ]);

    setNovoDocumento(documentoVazio);
    setDocumentoEmEdicaoId("");
    setDocumentoAbertoId(documentoId);
  }

  function visualizarDocumento(id: string) {
    setDocumentoAbertoId(id);
  }

  function editarDocumento(documento: DocumentoSecretaria) {
    setNovoDocumento({
      numero: documento.numero,
      tipo: documento.tipo,
      sessaoId: documento.sessaoId,
      data: documento.data,
      titulo: documento.titulo,
      grau: documento.grau,
      status: documento.status,
      ordemDoDia: documento.ordemDoDia,
      resumo: documento.resumo,
      deliberacoes: documento.deliberacoes,
      tronco: documento.tronco,
      observacoes: documento.observacoes,
      relatoBruto: documento.relatoBruto,
      decisoesLoja: documento.decisoesLoja,
      textoGerado: documento.textoGerado || montarBalaustrePadrao(documento),
    });

    setDocumentoEmEdicaoId(documento.id);
    setDocumentoAbertoId(documento.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function aprovarDocumento(id: string) {
    const confirmar = confirm("Deseja aprovar este documento?");
    if (!confirmar) return;

    setDocumentos((atuais) =>
      atuais.map((documento) =>
        documento.id === id ? { ...documento, status: "Aprovado" } : documento
      )
    );
  }

  function removerDocumento(id: string) {
    const confirmar = confirm("Deseja remover este documento?");
    if (!confirmar) return;
    setDocumentos((atuais) => atuais.filter((item) => item.id !== id));
  }

  function textoDoDocumento(documento: DocumentoSecretaria) {
    const base = documento.textoGerado?.trim()
      ? documento.textoGerado.trim()
      : montarBalaustrePadrao(documento).trim();

    const cabecalho = cabecalhoGestaoDocumento(documento);
    const rodape = rodapeAssinaturasDocumento(documento);

    const textoComCabecalho = base.includes("DIREÇÃO VIGENTE")
      ? base
      : `${cabecalho}

${base}`;

    return textoComCabecalho.includes("ASSINATURAS")
      ? textoComCabecalho
      : `${textoComCabecalho}${rodape}`;
  }

  function nomeArquivoDocumento(documento: DocumentoSecretaria) {
    return `${documento.tipo}_${documento.numero}_${documento.data || "sem-data"}`
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_");
  }

  function baixarDocumentoPDF(documento: DocumentoSecretaria) {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const margemX = 15;
    const margemY = 18;
    const larguraTexto = 180;
    const alturaMaxima = 280;
    const alturaLinha = 6;

    pdf.setFont("times", "normal");
    pdf.setFontSize(12);

    const linhas = pdf.splitTextToSize(textoDoDocumento(documento), larguraTexto);
    let y = margemY;

    linhas.forEach((linha: string) => {
      if (y > alturaMaxima) {
        pdf.addPage();
        y = margemY;
      }

      pdf.text(linha, margemX, y);
      y += alturaLinha;
    });

    pdf.save(`${nomeArquivoDocumento(documento)}.pdf`);
  }

  function salvarAcao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!novaAcao.titulo.trim()) {
      alert("Informe a ação pendente.");
      return;
    }

    setAcoes((atuais) => [
      {
        id: gerarId(),
        ...novaAcao,
        titulo: novaAcao.titulo.trim(),
      },
      ...atuais,
    ]);

    setNovaAcao(acaoVazia);
  }

  function atualizarStatusAcao(id: string, status: AcaoPendente["status"]) {
    setAcoes((atuais) =>
      atuais.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  function removerAcao(id: string) {
    const confirmar = confirm("Deseja remover esta ação?");
    if (!confirmar) return;
    setAcoes((atuais) => atuais.filter((item) => item.id !== id));
  }

  function salvarProcesso(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!novoProcesso.nome.trim()) {
      alert("Informe o nome do candidato ou irmão.");
      return;
    }

    setProcessos((atuais) => [
      {
        id: gerarId(),
        ...novoProcesso,
        nome: novoProcesso.nome.trim(),
      },
      ...atuais,
    ]);

    setNovoProcesso(processoVazio);
  }

  function atualizarStatusProcesso(id: string, status: ProcessoSecretaria["status"]) {
    setProcessos((atuais) =>
      atuais.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  function removerProcesso(id: string) {
    const confirmar = confirm("Deseja remover este processo?");
    if (!confirmar) return;
    setProcessos((atuais) => atuais.filter((item) => item.id !== id));
  }

  function salvarPeca(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!novaPeca.titulo.trim()) {
      alert("Informe o título da peça.");
      return;
    }

    if (!novaPeca.obreiroId) {
      alert("Informe o obreiro.");
      return;
    }

    setPecas((atuais) => [
      {
        id: gerarId(),
        ...novaPeca,
        titulo: novaPeca.titulo.trim(),
      },
      ...atuais,
    ]);

    setNovaPeca(pecaVazia);
  }

  function atualizarStatusPeca(id: string, status: PecaArquitetura["status"]) {
    setPecas((atuais) =>
      atuais.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  function removerPeca(id: string) {
    const confirmar = confirm("Deseja remover esta peça?");
    if (!confirmar) return;
    setPecas((atuais) => atuais.filter((item) => item.id !== id));
  }

  const resumo = useMemo(() => {
    return {
      documentos: documentos.length,
      rascunhos: documentos.filter((item) => item.status === "Rascunho").length,
      acoesPendentes: acoes.filter((item) => item.status !== "Concluída").length,
      processosAbertos: processos.filter((item) => item.status !== "Concluído").length,
      pecasPrevistas: pecas.filter((item) => item.status === "Prevista").length,
    };
  }, [documentos, acoes, processos, pecas]);

  if (!carregado) {
    return (
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
        Carregando Secretaria...
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Documentos</p>
          <h3 className="mt-3 text-3xl font-bold text-white">{resumo.documentos}</h3>
          <p className="mt-2 text-sm text-zinc-500">Atas e balaústres</p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Rascunhos</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">{resumo.rascunhos}</h3>
          <p className="mt-2 text-sm text-zinc-500">Aguardando revisão</p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Ações pendentes</p>
          <h3 className="mt-3 text-3xl font-bold text-red-300">{resumo.acoesPendentes}</h3>
          <p className="mt-2 text-sm text-zinc-500">Demandas da Secretaria</p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Processos</p>
          <h3 className="mt-3 text-3xl font-bold text-sky-300">{resumo.processosAbertos}</h3>
          <p className="mt-2 text-sm text-zinc-500">Em aberto</p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Peças previstas</p>
          <h3 className="mt-3 text-3xl font-bold text-emerald-300">{resumo.pecasPrevistas}</h3>
          <p className="mt-2 text-sm text-zinc-500">Arquitetura e instrução</p>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Atas e Balaústres</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Cadastre documentos oficiais vinculados às sessões registradas na Chancelaria.
        </p>

        <form onSubmit={salvarDocumento} className="mt-6 grid gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              value={novoDocumento.numero}
              onChange={(evento) =>
                setNovoDocumento((atual) => ({ ...atual, numero: evento.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Nº do documento"
            />

            <select
              value={novoDocumento.tipo}
              onChange={(evento) =>
                setNovoDocumento((atual) => ({
                  ...atual,
                  tipo: evento.target.value as DocumentoSecretaria["tipo"],
                }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            >
              <option>Ata</option>
              <option>Balaústre</option>
            </select>

            <input
              type="date"
              value={novoDocumento.data}
              onChange={(evento) =>
                setNovoDocumento((atual) => ({ ...atual, data: evento.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            />

            <select
              value={novoDocumento.status}
              onChange={(evento) =>
                setNovoDocumento((atual) => ({
                  ...atual,
                  status: evento.target.value as DocumentoSecretaria["status"],
                }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            >
              <option>Rascunho</option>
              <option>Em revisão</option>
              <option>Aprovado</option>
              <option>Arquivado</option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={novoDocumento.sessaoId}
              onChange={(evento) => preencherPelaSessao(evento.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            >
              <option value="">Vincular sessão</option>
              {sessoesOrdenadas.map((sessao) => (
                <option key={sessao.id} value={sessao.id}>
                  {formatarDataBR(sessao.data)} - {sessao.titulo || sessao.tipo || "Sessão"}
                </option>
              ))}
            </select>

            <input
              value={novoDocumento.titulo}
              onChange={(evento) =>
                setNovoDocumento((atual) => ({ ...atual, titulo: evento.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Título"
            />

            <input
              value={novoDocumento.grau}
              onChange={(evento) =>
                setNovoDocumento((atual) => ({ ...atual, grau: evento.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Grau"
            />
          </div>

          <textarea
            value={novoDocumento.relatoBruto}
            onChange={(evento) =>
              setNovoDocumento((atual) => ({ ...atual, relatoBruto: evento.target.value }))
            }
            className="min-h-44 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            placeholder="Cole aqui o relato bruto da sessão. Exemplo: abertura, expediente, visitantes, instruções, peças apresentadas, falas do Venerável, orador, decisões, tronco e encerramento."
          />

          <textarea
            value={novoDocumento.decisoesLoja}
            onChange={(evento) =>
              setNovoDocumento((atual) => ({ ...atual, decisoesLoja: evento.target.value }))
            }
            className="min-h-28 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-white outline-none focus:border-amber-400"
            placeholder="Decisões da Loja, uma por linha. Exemplo: Ficou decidido que os trabalhos de arquitetura deverão ser entregues ao Secretário antes da sessão."
          />

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={novoDocumento.tronco}
              onChange={(evento) =>
                setNovoDocumento((atual) => ({ ...atual, tronco: evento.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Tronco de solidariedade / registro financeiro da sessão"
            />

            <button
              type="button"
              onClick={gerarMinutaDocumento}
              className="rounded-full border border-amber-400/40 px-5 py-3 font-semibold text-amber-300 transition hover:bg-amber-400/10"
            >
              Gerar minuta
            </button>
          </div>

          <textarea
            value={novoDocumento.textoGerado}
            onChange={(evento) =>
              setNovoDocumento((atual) => ({ ...atual, textoGerado: evento.target.value }))
            }
            className="min-h-72 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-white outline-none focus:border-emerald-400"
            placeholder="A minuta do balaústre aparecerá aqui. Você poderá revisar e ajustar antes de salvar."
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="w-fit rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              {documentoEmEdicaoId ? "Salvar alterações" : "Salvar documento"}
            </button>

            {documentoEmEdicaoId && (
              <button
                type="button"
                onClick={() => {
                  setNovoDocumento(documentoVazio);
                  setDocumentoEmEdicaoId("");
                }}
                className="w-fit rounded-full border border-zinc-400/30 px-6 py-3 font-semibold text-zinc-300 transition hover:bg-white/10"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 overflow-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.06] text-zinc-300">
              <tr>
                <th className="px-5 py-4">Documento</th>
                <th className="px-5 py-4">Data</th>
                <th className="px-5 py-4">Sessão vinculada</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Ação</th>
              </tr>
            </thead>

            <tbody>
              {documentos.map((item) => {
                const sessao = sessaoPorId(item.sessaoId);

                return (
                  <tr key={item.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">
                        {item.tipo} nº {item.numero}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{item.titulo}</p>
                    </td>

                    <td className="px-5 py-4 text-zinc-300">{formatarDataBR(item.data)}</td>

                    <td className="px-5 py-4 text-zinc-300">
                      {sessao ? `${formatarDataBR(sessao.data)} - ${sessao.titulo || sessao.tipo || "Sessão"}` : "Não vinculada"}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${classeStatus(item.status)}`}>
                        {item.status}
                      </span>
                    </td>


                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => visualizarDocumento(item.id)}
                          className="rounded-full border border-amber-400/40 px-3 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/10"
                        >
                          Visualizar
                        </button>

                        <button
                          type="button"
                          onClick={() => editarDocumento(item)}
                          className="rounded-full border border-sky-400/40 px-3 py-1 text-xs font-semibold text-sky-300 transition hover:bg-sky-400/10"
                        >
                          Editar
                        </button>

                        {item.status !== "Aprovado" && (
                          <button
                            type="button"
                            onClick={() => aprovarDocumento(item.id)}
                            className="rounded-full border border-emerald-400/40 px-3 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/10"
                          >
                            Aprovar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => baixarDocumentoPDF(item)}
                          className="rounded-full border border-emerald-400/40 px-3 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/10"
                        >
                          Baixar PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => removerDocumento(item.id)}
                          className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {documentos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-zinc-500">
                    Nenhum documento cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-2xl font-bold">Ações Pendentes</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Controle de providências, prazos e responsáveis.
          </p>

          <form onSubmit={salvarAcao} className="mt-6 grid gap-3">
            <input
              value={novaAcao.titulo}
              onChange={(evento) => setNovaAcao((atual) => ({ ...atual, titulo: evento.target.value }))}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Ação pendente"
            />

            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={novaAcao.responsavelId}
                onChange={(evento) => setNovaAcao((atual) => ({ ...atual, responsavelId: evento.target.value }))}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              >
                <option value="">Responsável</option>
                {obreirosDaLoja.map((obreiro) => (
                  <option key={obreiro.id} value={obreiro.id}>
                    {obreiro.nome}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={novaAcao.prazo}
                onChange={(evento) => setNovaAcao((atual) => ({ ...atual, prazo: evento.target.value }))}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              />

              <select
                value={novaAcao.status}
                onChange={(evento) =>
                  setNovaAcao((atual) => ({ ...atual, status: evento.target.value as AcaoPendente["status"] }))
                }
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              >
                <option>Pendente</option>
                <option>Em andamento</option>
                <option>Concluída</option>
              </select>
            </div>

            <textarea
              value={novaAcao.observacao}
              onChange={(evento) => setNovaAcao((atual) => ({ ...atual, observacao: evento.target.value }))}
              className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Observação"
            />

            <button type="submit" className="w-fit rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300">
              Salvar ação
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {acoes.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-white">{item.titulo}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Responsável: {nomeObreiro(item.responsavelId)} | Prazo: {formatarDataBR(item.prazo)}
                    </p>
                    {item.observacao && <p className="mt-2 text-sm text-zinc-400">{item.observacao}</p>}
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={item.status}
                      onChange={(evento) => atualizarStatusAcao(item.id, evento.target.value as AcaoPendente["status"])}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                    >
                      <option>Pendente</option>
                      <option>Em andamento</option>
                      <option>Concluída</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => removerAcao(item.id)}
                      className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {acoes.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-sm text-zinc-500">
                Nenhuma ação pendente cadastrada.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-2xl font-bold">Processos e Cerimônias</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Acompanhe admissão, iniciação, elevação, exaltação, filiação e regularização.
          </p>

          <form onSubmit={salvarProcesso} className="mt-6 grid gap-3">
            <input
              value={novoProcesso.nome}
              onChange={(evento) => setNovoProcesso((atual) => ({ ...atual, nome: evento.target.value }))}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Nome do candidato ou irmão"
            />

            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={novoProcesso.tipo}
                onChange={(evento) =>
                  setNovoProcesso((atual) => ({ ...atual, tipo: evento.target.value as ProcessoSecretaria["tipo"] }))
                }
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              >
                <option>Admissão</option>
                <option>Iniciação</option>
                <option>Elevação</option>
                <option>Exaltação</option>
                <option>Regularização</option>
                <option>Filiação</option>
              </select>

              <input
                type="date"
                value={novoProcesso.dataPrevista}
                onChange={(evento) => setNovoProcesso((atual) => ({ ...atual, dataPrevista: evento.target.value }))}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              />

              <select
                value={novoProcesso.status}
                onChange={(evento) =>
                  setNovoProcesso((atual) => ({ ...atual, status: evento.target.value as ProcessoSecretaria["status"] }))
                }
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              >
                <option>Aberto</option>
                <option>Em andamento</option>
                <option>Concluído</option>
                <option>Suspenso</option>
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={novoProcesso.etapa}
                onChange={(evento) => setNovoProcesso((atual) => ({ ...atual, etapa: evento.target.value }))}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                placeholder="Etapa atual"
              />

              <select
                value={novoProcesso.responsavelId}
                onChange={(evento) => setNovoProcesso((atual) => ({ ...atual, responsavelId: evento.target.value }))}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              >
                <option value="">Responsável</option>
                {obreirosDaLoja.map((obreiro) => (
                  <option key={obreiro.id} value={obreiro.id}>
                    {obreiro.nome}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={novoProcesso.observacao}
              onChange={(evento) => setNovoProcesso((atual) => ({ ...atual, observacao: evento.target.value }))}
              className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Observação"
            />

            <button type="submit" className="w-fit rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300">
              Salvar processo
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {processos.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-white">
                      {item.tipo} - {item.nome}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Etapa: {item.etapa || "Não informada"} | Data: {formatarDataBR(item.dataPrevista)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Responsável: {nomeObreiro(item.responsavelId)}
                    </p>
                    {item.observacao && <p className="mt-2 text-sm text-zinc-400">{item.observacao}</p>}
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={item.status}
                      onChange={(evento) => atualizarStatusProcesso(item.id, evento.target.value as ProcessoSecretaria["status"])}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                    >
                      <option>Aberto</option>
                      <option>Em andamento</option>
                      <option>Concluído</option>
                      <option>Suspenso</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => removerProcesso(item.id)}
                      className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {processos.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-sm text-zinc-500">
                Nenhum processo cadastrado.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Peças de Arquitetura</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Controle das peças previstas, apresentadas ou adiadas.
        </p>

        <form onSubmit={salvarPeca} className="mt-6 grid gap-3 md:grid-cols-6">
          <input
            value={novaPeca.titulo}
            onChange={(evento) => setNovaPeca((atual) => ({ ...atual, titulo: evento.target.value }))}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400 md:col-span-2"
            placeholder="Título da peça"
          />

          <select
            value={novaPeca.obreiroId}
            onChange={(evento) => setNovaPeca((atual) => ({ ...atual, obreiroId: evento.target.value }))}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
          >
            <option value="">Obreiro</option>
            {obreirosDaLoja.map((obreiro) => (
              <option key={obreiro.id} value={obreiro.id}>
                {obreiro.nome}
              </option>
            ))}
          </select>

          <input
            value={novaPeca.grau}
            onChange={(evento) => setNovaPeca((atual) => ({ ...atual, grau: evento.target.value }))}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            placeholder="Grau"
          />

          <input
            type="date"
            value={novaPeca.dataPrevista}
            onChange={(evento) => setNovaPeca((atual) => ({ ...atual, dataPrevista: evento.target.value }))}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
          />

          <button
            type="submit"
            className="rounded-full bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
          >
            Salvar
          </button>

          <input
            value={novaPeca.observacao}
            onChange={(evento) => setNovaPeca((atual) => ({ ...atual, observacao: evento.target.value }))}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400 md:col-span-6"
            placeholder="Observação"
          />
        </form>

        <div className="mt-6 overflow-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.06] text-zinc-300">
              <tr>
                <th className="px-5 py-4">Peça</th>
                <th className="px-5 py-4">Obreiro</th>
                <th className="px-5 py-4">Grau</th>
                <th className="px-5 py-4">Data</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Ação</th>
              </tr>
            </thead>

            <tbody>
              {pecas.map((item) => (
                <tr key={item.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{item.titulo}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.observacao || "Sem observação"}</p>
                  </td>

                  <td className="px-5 py-4 text-zinc-300">{nomeObreiro(item.obreiroId)}</td>
                  <td className="px-5 py-4 text-zinc-300">{item.grau}</td>
                  <td className="px-5 py-4 text-zinc-300">{formatarDataBR(item.dataPrevista)}</td>

                  <td className="px-5 py-4">
                    <select
                      value={item.status}
                      onChange={(evento) => atualizarStatusPeca(item.id, evento.target.value as PecaArquitetura["status"])}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                    >
                      <option>Prevista</option>
                      <option>Apresentada</option>
                      <option>Adiada</option>
                    </select>
                  </td>

                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => removerPeca(item.id)}
                      className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}

              {pecas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-zinc-500">
                    Nenhuma peça cadastrada.
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
