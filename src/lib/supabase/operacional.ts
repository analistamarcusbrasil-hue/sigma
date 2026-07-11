import { createClient } from "@/lib/supabase/client";
import type { Obreiro, RegistroPresenca, Sessao } from "@/types";

type Loja = { id: string; nome: string };

export type GestaoOperacional = {
  id: string;
  nomeGestao: string;
  gestaoAnteriorRepasse: string;
  dataInicioGestao: string;
  dataFimGestao: string;
  anoTrabalho: number;
  financeiroPositivoRecebido: number;
  financeiroNegativoRecebido: number;
  observacaoRepasse: string;
  cargos: Record<string, string>;
  ativa?: boolean;
};

export type RegraFinanceira = { id: string; dataInicio: string; valor: number; descricao: string };
export type RecebimentoFinanceiro = { id: string; obreiroId: string; mesLancamento: string; valor: number };
export type LancamentoFinanceiro = { id: string; data: string; tipo: string; descricao: string; valor: number; sessaoId?: string };
export type CustoFinanceiro = { id: string; fornecedorNome: string; cnpj: string; tipoDivida: string; descricao: string; valorTotal: number; parcelasQtd: number; dataInicio: string; dataFim: string; parcelas: unknown[] };
export type TesourariaBanco = { regras: RegraFinanceira[]; recebimentos: RecebimentoFinanceiro[]; lancamentos: LancamentoFinanceiro[]; custos: CustoFinanceiro[] };
export type DocumentoBanco = { id: string; numero: string; tipo: string; sessaoId: string; data: string; titulo: string; grau: string; status: string; ordemDoDia: string; resumo: string; deliberacoes: string; tronco: string; observacoes: string; relatoBruto: string; decisoesLoja: string; textoGerado: string };
export type AcaoBanco = { id: string; titulo: string; responsavelId: string; prazo: string; status: string; observacao: string };
export type ProcessoBanco = { id: string; nome: string; tipo: string; etapa: string; responsavelId: string; dataPrevista: string; status: string; observacao: string };
export type PecaBanco = { id: string; titulo: string; obreiroId: string; grau: string; dataPrevista: string; status: string; observacao: string };
export type DecisaoBanco = { id: string; documentoId: string; sessaoId: string; data: string; texto: string; status: string; origem: string };
export type SecretariaBanco = { documentos: DocumentoBanco[]; acoes: AcaoBanco[]; processos: ProcessoBanco[]; pecas: PecaBanco[]; decisoes: DecisaoBanco[] };

function mensagem(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message);
  return fallback;
}

export async function obterLojaAtual(): Promise<Loja> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("loja_usuarios")
    .select("loja_id, lojas(id, nome)")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const loja = data?.lojas as unknown as Loja | null;
  if (!loja) throw new Error("Seu usuário ainda não está vinculado a uma Loja.");
  return loja;
}

export async function listarObreiros(): Promise<Obreiro[]> {
  const loja = await obterLojaAtual();
  const { data, error } = await createClient().from("obreiros").select("*").eq("loja_id", loja.id).order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => ({
    id: item.id, nome: item.nome, grau: item.grau, cargo: item.cargo ?? "", telefone: item.telefone ?? "",
    email: item.email ?? "", situacao: item.situacao, dataCadastro: item.data_cadastro,
    observacoes: item.observacoes ?? "", tipo: item.tipo, lojaOrigem: item.loja_origem ?? "",
  }));
}

export async function salvarObreiro(obreiro: Obreiro): Promise<Obreiro> {
  const loja = await obterLojaAtual();
  const payload = {
    loja_id: loja.id, nome: obreiro.nome.trim(), grau: obreiro.grau, cargo: obreiro.cargo || null,
    telefone: obreiro.telefone || null, email: obreiro.email.trim().toLowerCase() || null,
    situacao: obreiro.situacao, data_cadastro: obreiro.dataCadastro, observacoes: obreiro.observacoes || null,
    tipo: obreiro.tipo ?? "Obreiro da Loja", loja_origem: obreiro.lojaOrigem || null,
  };
  const query = obreiro.id
    ? createClient().from("obreiros").update(payload).eq("id", obreiro.id).eq("loja_id", loja.id)
    : createClient().from("obreiros").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(error.message);
  return { ...obreiro, id: data.id };
}

export async function excluirObreiro(id: string) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("obreiros").delete().eq("id", id).eq("loja_id", loja.id);
  mensagem(error, "");
}

export async function listarSessoes(): Promise<Sessao[]> {
  const loja = await obterLojaAtual();
  const { data, error } = await createClient().from("sessoes").select("id, data, tipo, grau, titulo, observacao").eq("loja_id", loja.id).order("data", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => ({ ...item, observacao: item.observacao ?? "" }));
}

export async function salvarSessao(sessao: Sessao): Promise<Sessao> {
  const loja = await obterLojaAtual();
  const payload = { loja_id: loja.id, data: sessao.data, tipo: sessao.tipo, grau: sessao.grau, titulo: sessao.titulo.trim(), observacao: sessao.observacao || null };
  const query = sessao.id
    ? createClient().from("sessoes").update(payload).eq("id", sessao.id).eq("loja_id", loja.id)
    : createClient().from("sessoes").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(error.message);
  return { ...sessao, id: data.id };
}

export async function excluirSessao(id: string) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("sessoes").delete().eq("id", id).eq("loja_id", loja.id);
  mensagem(error, "");
}

export async function listarPresencas(): Promise<RegistroPresenca[]> {
  const loja = await obterLojaAtual();
  const { data: sessoes, error: sessoesError } = await createClient().from("sessoes").select("id").eq("loja_id", loja.id);
  if (sessoesError) throw new Error(sessoesError.message);
  const ids = (sessoes ?? []).map((item) => item.id);
  if (!ids.length) return [];
  const { data, error } = await createClient().from("presencas").select("sessao_id, obreiro_id, status, observacao, cargo_sessao").in("sessao_id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => ({ sessaoId: item.sessao_id, obreiroId: item.obreiro_id, status: item.status, observacao: item.observacao ?? "", cargoSessao: item.cargo_sessao ?? "" }));
}

export async function salvarPresencas(registros: RegistroPresenca[]) {
  if (!registros.length) return;
  const payload = registros.map((item) => ({ sessao_id: item.sessaoId, obreiro_id: item.obreiroId, status: item.status, observacao: item.observacao || null, cargo_sessao: item.cargoSessao || null }));
  const { error } = await createClient().from("presencas").upsert(payload, { onConflict: "sessao_id,obreiro_id" });
  mensagem(error, "");
}

export async function listarGestoes(): Promise<GestaoOperacional[]> {
  const loja = await obterLojaAtual();
  const { data, error } = await createClient().from("administracoes").select("*").eq("loja_id", loja.id).order("data_inicio", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => ({
    id: item.id, nomeGestao: item.nome, gestaoAnteriorRepasse: item.gestao_anterior_repasse ?? "",
    dataInicioGestao: item.data_inicio, dataFimGestao: item.data_fim ?? "", anoTrabalho: item.ano_trabalho,
    financeiroPositivoRecebido: Number(item.saldo_positivo_inicial), financeiroNegativoRecebido: Number(item.saldo_negativo_inicial),
    observacaoRepasse: item.observacoes ?? "", cargos: (item.cargos ?? {}) as Record<string, string>, ativa: item.ativa,
  }));
}

export async function salvarGestaoBanco(gestao: GestaoOperacional): Promise<GestaoOperacional> {
  const loja = await obterLojaAtual();
  const supabase = createClient();
  if (gestao.ativa) {
    const { error } = await supabase.from("administracoes").update({ ativa: false }).eq("loja_id", loja.id).eq("ativa", true);
    if (error) throw new Error(error.message);
  }
  const payload = {
    loja_id: loja.id, nome: gestao.nomeGestao.trim(), gestao_anterior_repasse: gestao.gestaoAnteriorRepasse.trim() || null,
    data_inicio: gestao.dataInicioGestao, data_fim: gestao.dataFimGestao || null, ano_trabalho: gestao.anoTrabalho,
    saldo_positivo_inicial: gestao.financeiroPositivoRecebido, saldo_negativo_inicial: gestao.financeiroNegativoRecebido,
    observacoes: gestao.observacaoRepasse || null, cargos: gestao.cargos, ativa: Boolean(gestao.ativa),
  };
  const query = gestao.id ? supabase.from("administracoes").update(payload).eq("id", gestao.id).eq("loja_id", loja.id) : supabase.from("administracoes").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(error.message);
  return { ...gestao, id: data.id };
}

export async function ativarGestaoBanco(id: string) {
  const { error } = await createClient().rpc("ativar_administracao", {
    alvo_administracao: id,
  });
  if (error) throw new Error(error.message);
}

export async function excluirGestaoBanco(id: string) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("administracoes").delete().eq("id", id).eq("loja_id", loja.id);
  if (error) throw new Error(error.message);
}

export async function carregarTesouraria(): Promise<TesourariaBanco> {
  const loja = await obterLojaAtual();
  const supabase = createClient();
  const [regras, recebimentos, lancamentos, custos] = await Promise.all([
    supabase.from("regras_mensalidade").select("*").eq("loja_id", loja.id).order("data_inicio"),
    supabase.from("recebimentos").select("*").eq("loja_id", loja.id).order("data"),
    supabase.from("lancamentos_financeiros").select("*").eq("loja_id", loja.id).order("data"),
    supabase.from("custos_loja").select("*").eq("loja_id", loja.id).order("data_inicio", { ascending: false }),
  ]);
  for (const resultado of [regras, recebimentos, lancamentos, custos]) if (resultado.error) throw new Error(resultado.error.message);
  return {
    regras: (regras.data ?? []).map((i) => ({ id: i.id, dataInicio: i.data_inicio, valor: Number(i.valor), descricao: i.descricao ?? "" })),
    recebimentos: (recebimentos.data ?? []).map((i) => ({ id: i.id, obreiroId: i.obreiro_id, mesLancamento: String(i.data).slice(0, 7), valor: Number(i.valor) })),
    lancamentos: (lancamentos.data ?? []).map((i) => ({ id: i.id, data: i.data, tipo: i.tipo, descricao: i.descricao, valor: Number(i.valor), sessaoId: i.sessao_id ?? undefined })),
    custos: (custos.data ?? []).map((i) => ({ id: i.id, fornecedorNome: i.fornecedor_nome, cnpj: i.cnpj ?? "", tipoDivida: i.tipo_divida, descricao: i.descricao ?? "", valorTotal: Number(i.valor_total), parcelasQtd: i.parcelas_qtd, dataInicio: i.data_inicio, dataFim: i.data_fim ?? "", parcelas: Array.isArray(i.parcelas) ? i.parcelas : [] })),
  };
}

async function reconciliarTabela(tabela: string, lojaId: string, itens: Array<Record<string, unknown>>) {
  const supabase = createClient();
  const ids = itens.map((item) => String(item.id));
  let exclusao = supabase.from(tabela).delete().eq("loja_id", lojaId);
  if (ids.length) exclusao = exclusao.not("id", "in", `(${ids.join(",")})`);
  const { error: deleteError } = await exclusao;
  if (deleteError) throw new Error(deleteError.message);
  if (itens.length) {
    const { error } = await supabase.from(tabela).upsert(itens);
    if (error) throw new Error(error.message);
  }
}

/** @deprecated Use as mutações pontuais abaixo. Mantido temporariamente para compatibilidade. */
export async function sincronizarTesouraria(estado: TesourariaBanco) {
  const loja = await obterLojaAtual();
  await Promise.all([
    reconciliarTabela("regras_mensalidade", loja.id, estado.regras.map((i) => ({ id: i.id, loja_id: loja.id, data_inicio: i.dataInicio, valor: i.valor, descricao: i.descricao || null }))),
    reconciliarTabela("recebimentos", loja.id, estado.recebimentos.map((i) => ({ id: i.id, loja_id: loja.id, obreiro_id: i.obreiroId, data: `${i.mesLancamento}-01`, valor: i.valor, descricao: "Mensalidade" }))),
    reconciliarTabela("lancamentos_financeiros", loja.id, estado.lancamentos.map((i) => ({ id: i.id, loja_id: loja.id, sessao_id: i.sessaoId || null, data: i.data, tipo: i.tipo, descricao: i.descricao, valor: i.valor }))),
    reconciliarTabela("custos_loja", loja.id, estado.custos.map((i) => ({ id: i.id, loja_id: loja.id, fornecedor_nome: i.fornecedorNome, cnpj: i.cnpj || null, tipo_divida: i.tipoDivida, descricao: i.descricao || null, valor_total: i.valorTotal, parcelas_qtd: i.parcelasQtd, data_inicio: i.dataInicio, data_fim: i.dataFim || null, parcelas: i.parcelas }))),
  ]);
}

export async function salvarRegrasFinanceiras(itens: RegraFinanceira[]) {
  if (!itens.length) return;
  const loja = await obterLojaAtual();
  const payload = itens.map((i) => ({ id: i.id, loja_id: loja.id, data_inicio: i.dataInicio, valor: i.valor, descricao: i.descricao || null }));
  const { error } = await createClient().from("regras_mensalidade").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function excluirRegraFinanceira(id: string) {
  await excluirRegistroDaLoja("regras_mensalidade", id);
}

export async function salvarRecebimentosFinanceiros(itens: RecebimentoFinanceiro[]) {
  if (!itens.length) return;
  const loja = await obterLojaAtual();
  const payload = itens.map((i) => ({ id: i.id, loja_id: loja.id, obreiro_id: i.obreiroId, data: `${i.mesLancamento}-01`, valor: i.valor, descricao: "Mensalidade" }));
  const { error } = await createClient().from("recebimentos").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function excluirRecebimentosDaCompetencia(mes: string) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("recebimentos").delete().eq("loja_id", loja.id).eq("data", `${mes}-01`);
  if (error) throw new Error(error.message);
}

export async function salvarLancamentoFinanceiro(item: LancamentoFinanceiro) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("lancamentos_financeiros").upsert({ id: item.id, loja_id: loja.id, sessao_id: item.sessaoId || null, data: item.data, tipo: item.tipo, descricao: item.descricao, valor: item.valor });
  if (error) throw new Error(error.message);
}

export async function excluirLancamentoFinanceiro(id: string) {
  await excluirRegistroDaLoja("lancamentos_financeiros", id);
}

export async function salvarCustoFinanceiro(item: CustoFinanceiro) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("custos_loja").upsert({ id: item.id, loja_id: loja.id, fornecedor_nome: item.fornecedorNome, cnpj: item.cnpj || null, tipo_divida: item.tipoDivida, descricao: item.descricao || null, valor_total: item.valorTotal, parcelas_qtd: item.parcelasQtd, data_inicio: item.dataInicio, data_fim: item.dataFim || null, parcelas: item.parcelas });
  if (error) throw new Error(error.message);
}

export async function excluirCustoFinanceiro(id: string) {
  await excluirRegistroDaLoja("custos_loja", id);
}

async function excluirRegistroDaLoja(tabela: string, id: string) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from(tabela).delete().eq("id", id).eq("loja_id", loja.id);
  if (error) throw new Error(error.message);
}

export async function carregarSecretaria(): Promise<SecretariaBanco> {
  const loja = await obterLojaAtual();
  const supabase = createClient();
  const [documentos, acoes, processos, pecas, decisoes] = await Promise.all([
    supabase.from("documentos_secretaria").select("*").eq("loja_id", loja.id).order("data", { ascending: false }),
    supabase.from("acoes_secretaria").select("*").eq("loja_id", loja.id).order("prazo"),
    supabase.from("processos_secretaria").select("*").eq("loja_id", loja.id).order("data_prevista"),
    supabase.from("pecas_arquitetura").select("*").eq("loja_id", loja.id).order("data_prevista"),
    supabase.from("decisoes_loja").select("*").eq("loja_id", loja.id).order("data", { ascending: false }),
  ]);
  for (const resultado of [documentos, acoes, processos, pecas, decisoes]) if (resultado.error) throw new Error(resultado.error.message);
  return {
    documentos: (documentos.data ?? []).map((i) => ({ id:i.id, numero:i.numero, tipo:i.tipo, sessaoId:i.sessao_id ?? "", data:i.data, titulo:i.titulo, grau:i.grau ?? "", status:i.status, ordemDoDia:i.ordem_do_dia ?? "", resumo:i.resumo ?? "", deliberacoes:i.deliberacoes ?? "", tronco:i.tronco ?? "", observacoes:i.observacoes ?? "", relatoBruto:i.relato_bruto ?? "", decisoesLoja:i.decisoes_loja ?? "", textoGerado:i.texto_gerado ?? "" })),
    acoes: (acoes.data ?? []).map((i) => ({ id:i.id, titulo:i.titulo, responsavelId:i.responsavel_id ?? "", prazo:i.prazo ?? "", status:i.status, observacao:i.observacao ?? "" })),
    processos: (processos.data ?? []).map((i) => ({ id:i.id, nome:i.nome, tipo:i.tipo, etapa:i.etapa ?? "", responsavelId:i.responsavel_id ?? "", dataPrevista:i.data_prevista ?? "", status:i.status, observacao:i.observacao ?? "" })),
    pecas: (pecas.data ?? []).map((i) => ({ id:i.id, titulo:i.titulo, obreiroId:i.obreiro_id ?? "", grau:i.grau ?? "", dataPrevista:i.data_prevista ?? "", status:i.status, observacao:i.observacao ?? "" })),
    decisoes: (decisoes.data ?? []).map((i) => ({ id:i.id, documentoId:i.documento_id ?? "", sessaoId:i.sessao_id ?? "", data:i.data, texto:i.texto, status:i.status, origem:i.origem ?? "" })),
  };
}

export async function sincronizarSecretaria(estado: SecretariaBanco) {
  const loja = await obterLojaAtual();
  await Promise.all([
    reconciliarTabela("documentos_secretaria", loja.id, estado.documentos.map((i) => ({ id:i.id, loja_id:loja.id, numero:i.numero, tipo:i.tipo, sessao_id:i.sessaoId || null, data:i.data, titulo:i.titulo, grau:i.grau || null, status:i.status, ordem_do_dia:i.ordemDoDia || null, resumo:i.resumo || null, deliberacoes:i.deliberacoes || null, tronco:i.tronco || null, observacoes:i.observacoes || null, relato_bruto:i.relatoBruto || null, decisoes_loja:i.decisoesLoja || null, texto_gerado:i.textoGerado || null }))),
    reconciliarTabela("acoes_secretaria", loja.id, estado.acoes.map((i) => ({ id:i.id, loja_id:loja.id, titulo:i.titulo, responsavel_id:i.responsavelId || null, prazo:i.prazo || null, status:i.status, observacao:i.observacao || null }))),
    reconciliarTabela("processos_secretaria", loja.id, estado.processos.map((i) => ({ id:i.id, loja_id:loja.id, nome:i.nome, tipo:i.tipo, etapa:i.etapa || null, responsavel_id:i.responsavelId || null, data_prevista:i.dataPrevista || null, status:i.status, observacao:i.observacao || null }))),
    reconciliarTabela("pecas_arquitetura", loja.id, estado.pecas.map((i) => ({ id:i.id, loja_id:loja.id, titulo:i.titulo, obreiro_id:i.obreiroId || null, grau:i.grau || null, data_prevista:i.dataPrevista || null, status:i.status, observacao:i.observacao || null }))),
    reconciliarTabela("decisoes_loja", loja.id, estado.decisoes.map((i) => ({ id:i.id, loja_id:loja.id, documento_id:i.documentoId || null, sessao_id:i.sessaoId || null, data:i.data, texto:i.texto, status:i.status, origem:i.origem || null }))),
  ]);
}

export async function salvarAcaoSecretaria(item: AcaoBanco) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("acoes_secretaria").upsert({ id: item.id, loja_id: loja.id, titulo: item.titulo, responsavel_id: item.responsavelId || null, prazo: item.prazo || null, status: item.status, observacao: item.observacao || null });
  if (error) throw new Error(error.message);
}

export async function excluirAcaoSecretaria(id: string) {
  await excluirRegistroDaLoja("acoes_secretaria", id);
}

export async function salvarProcessoSecretaria(item: ProcessoBanco) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("processos_secretaria").upsert({ id: item.id, loja_id: loja.id, nome: item.nome, tipo: item.tipo, etapa: item.etapa || null, responsavel_id: item.responsavelId || null, data_prevista: item.dataPrevista || null, status: item.status, observacao: item.observacao || null });
  if (error) throw new Error(error.message);
}

export async function excluirProcessoSecretaria(id: string) {
  await excluirRegistroDaLoja("processos_secretaria", id);
}

export async function salvarPecaArquitetura(item: PecaBanco) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("pecas_arquitetura").upsert({ id: item.id, loja_id: loja.id, titulo: item.titulo, obreiro_id: item.obreiroId || null, grau: item.grau || null, data_prevista: item.dataPrevista || null, status: item.status, observacao: item.observacao || null });
  if (error) throw new Error(error.message);
}

export async function excluirPecaArquitetura(id: string) {
  await excluirRegistroDaLoja("pecas_arquitetura", id);
}

export async function salvarDocumentoComDecisoes(documento: DocumentoBanco, decisoes: DecisaoBanco[]) {
  const loja = await obterLojaAtual();
  const p_documento = { id: documento.id, loja_id: loja.id, sessao_id: documento.sessaoId, numero: documento.numero, tipo: documento.tipo, data: documento.data, titulo: documento.titulo, grau: documento.grau, status: documento.status, ordem_do_dia: documento.ordemDoDia, resumo: documento.resumo, deliberacoes: documento.deliberacoes, tronco: documento.tronco, observacoes: documento.observacoes, relato_bruto: documento.relatoBruto, decisoes_loja: documento.decisoesLoja, texto_gerado: documento.textoGerado };
  const p_decisoes = decisoes.map((item) => ({ id:item.id, sessao_id:item.sessaoId || null, data:item.data, texto:item.texto, status:item.status, origem:item.origem }));
  const { error } = await createClient().rpc("salvar_documento_com_decisoes", { p_documento, p_decisoes });
  if (error) throw new Error(error.message);
}

export async function removerDocumentoSecretaria(id: string) {
  const { error } = await createClient().rpc("remover_documento_secretaria", { p_documento: id });
  if (error) throw new Error(error.message);
}
