"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaSecretaria, DocumentoSecretariaProfissional, StatusSecretaria } from "@/lib/secretaria-documentos";
import { statusSecretaria, tiposPorCategoria } from "@/lib/secretaria-documentos";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const acoes = ["ENVIAR_REVISAO", "SOLICITAR_APROVACAO", "APROVAR", "ARQUIVAR", "CANCELAR", "REABRIR"] as const;

async function contexto(lojaId: string) {
  if (!uuid.test(lojaId)) throw new Error("Selecione uma Loja ativa válida.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
  const [{ data: vinculo }, { data: perfil }] = await Promise.all([
    supabase.from("loja_usuarios").select("perfil,status").eq("loja_id", lojaId).eq("usuario_id", user.id).maybeSingle(),
    supabase.from("profiles").select("perfil,status").eq("id", user.id).maybeSingle(),
  ]);
  if (perfil?.status !== "ativo" || vinculo?.status !== "ativo") throw new Error("Seu acesso à Loja não está ativo.");
  return { supabase, userId: user.id, perfil: (vinculo.perfil || perfil.perfil) as string };
}

function falha(erro: unknown, mensagem: string) {
  return { ok: false as const, erro: erro instanceof Error ? erro.message : mensagem };
}

function mapearDocumento(item: Record<string, unknown>, deliberacoes: Record<string, unknown>[] = []): DocumentoSecretariaProfissional {
  const cargos = (item.cargos && typeof item.cargos === "object" ? item.cargos : {}) as DocumentoSecretariaProfissional["cargos"];
  return {
    id: String(item.id), lojaId: String(item.loja_id), administracaoId: String(item.administracao_id || ""), sessaoId: String(item.sessao_id || ""),
    numero: String(item.numero || ""), categoria: item.categoria as CategoriaSecretaria, tipo: String(item.tipo || ""), data: String(item.data || ""), grau: String(item.grau || ""),
    horarioInicio: String(item.horario_inicio || "").slice(0, 5), horarioAberturaLivroLei: String(item.horario_abertura_livro_lei || "").slice(0, 5), horarioEncerramento: String(item.horario_encerramento || "").slice(0, 5),
    cargos: { veneravelMestre: cargos.veneravelMestre || "", secretario: cargos.secretario || "", orador: cargos.orador || "", tesoureiro: cargos.tesoureiro || "", chanceler: cargos.chanceler || "", primeiroVigilante: cargos.primeiroVigilante || "", segundoVigilante: cargos.segundoVigilante || "" },
    expediente: String(item.expediente || ""), ordemDia: String(item.ordem_dia || ""), quartoHora: String(item.quarto_hora || ""), troncoSolidariedade: String(item.tronco_solidariedade || ""), palavraBemOrdem: String(item.palavra_bem_ordem || ""), visitantes: String(item.visitantes || ""), encerramento: String(item.encerramento || ""), anotacoesBrutas: String(item.anotacoes_brutas || ""), textoOficial: String(item.texto_oficial || ""), status: item.status as StatusSecretaria,
    temFinanceiro: Boolean(item.tem_financeiro), temPresenca: Boolean(item.tem_presenca), oradorAplicavel: Boolean(item.orador_aplicavel), pdfUrl: String(item.pdf_url || ""), versao: Number(item.versao || 1), aprovadoEm: String(item.aprovado_em || ""), reaberturaJustificativa: String(item.reabertura_justificativa || ""),
    deliberacoes: deliberacoes.map((d) => ({ id: String(d.id), descricao: String(d.descricao), responsavel: String(d.responsavel || ""), prazo: String(d.prazo || ""), status: d.status as DocumentoSecretariaProfissional["deliberacoes"][number]["status"] })),
  };
}

export async function listarDocumentosSecretariaAction(input: { lojaId: string; categoria: CategoriaSecretaria; status?: string }) {
  try {
    const { supabase, perfil } = await contexto(input.lojaId);
    let query = supabase.from("secretaria_documentos").select("id,numero,categoria,tipo,data,grau,status,tem_financeiro,tem_presenca,pdf_url,versao,atualizado_em").eq("loja_id", input.lojaId).eq("categoria", input.categoria).order("data", { ascending: false });
    if (input.status && input.status !== "Todos" && statusSecretaria.includes(input.status as StatusSecretaria)) query = query.eq("status", input.status);
    const { data, error } = await query;
    if (error) throw error;
    return { ok: true as const, perfil, data: data ?? [] };
  } catch (erro) { return falha(erro, "Não foi possível carregar os documentos."); }
}

export async function carregarFormularioSecretariaAction(input: { lojaId: string; id?: string }) {
  try {
    const { supabase, perfil } = await contexto(input.lojaId);
    const [loja, gestoes, sessoes] = await Promise.all([
      supabase.from("lojas").select("id,nome,numero,potencia,oriente,uf,logo_url").eq("id", input.lojaId).single(),
      supabase.from("administracoes").select("id,nome,data_inicio,data_fim,status,diretoria").eq("loja_id", input.lojaId).order("data_inicio", { ascending: false }),
      supabase.from("sessoes").select("id,data,tipo,grau,titulo,administracao_id").eq("loja_id", input.lojaId).order("data", { ascending: false }).limit(200),
    ]);
    if (loja.error || gestoes.error || sessoes.error) throw new Error("Não foi possível carregar Loja, Gestão e Sessões.");
    let documento: DocumentoSecretariaProfissional | null = null;
    let historico: Record<string, unknown>[] = [];
    if (input.id) {
      if (!uuid.test(input.id)) throw new Error("Documento inválido.");
      const [doc, delibs, hist] = await Promise.all([
        supabase.from("secretaria_documentos").select("*").eq("id", input.id).eq("loja_id", input.lojaId).single(),
        supabase.from("secretaria_deliberacoes").select("*").eq("documento_id", input.id).order("criado_em"),
        supabase.from("secretaria_documento_historico").select("acao,status_anterior,status_novo,justificativa,ocorrido_em").eq("documento_id", input.id).order("ocorrido_em", { ascending: false }),
      ]);
      if (doc.error) throw new Error(doc.error.code === "PGRST116" ? "Documento não encontrado ou sem permissão." : doc.error.message);
      documento = mapearDocumento(doc.data as Record<string, unknown>, (delibs.data ?? []) as Record<string, unknown>[]);
      historico = (hist.data ?? []) as Record<string, unknown>[];
    }
    return { ok: true as const, perfil, loja: loja.data, gestoes: gestoes.data ?? [], sessoes: sessoes.data ?? [], documento, historico };
  } catch (erro) { return falha(erro, "Não foi possível abrir o documento."); }
}

function validar(documento: DocumentoSecretariaProfissional) {
  if (!documento.numero.trim() || documento.numero.length > 50) throw new Error("Informe um número válido para o documento.");
  if (!documento.data) throw new Error("Informe a data do documento.");
  if (!tiposPorCategoria[documento.categoria]?.includes(documento.tipo)) throw new Error("Tipo de documento inválido.");
  if (documento.textoOficial.length > 100000 || documento.anotacoesBrutas.length > 100000) throw new Error("O texto excede o limite de 100.000 caracteres.");
  for (const deliberacao of documento.deliberacoes) if (!deliberacao.descricao.trim() || deliberacao.descricao.length > 3000) throw new Error("Revise a descrição das deliberações.");
}

export async function salvarDocumentoSecretariaAction(documento: DocumentoSecretariaProfissional) {
  try {
    validar(documento);
    const { supabase, perfil } = await contexto(documento.lojaId);
    if (!["Administrador", "Secretário"].includes(perfil)) throw new Error("Somente Administrador ou Secretário pode salvar rascunhos.");
    const payload = {
      loja_id: documento.lojaId, administracao_id: documento.administracaoId || null, sessao_id: documento.sessaoId || null,
      numero: documento.numero.trim(), categoria: documento.categoria, tipo: documento.tipo, data: documento.data, grau: documento.grau.trim() || null,
      horario_inicio: documento.horarioInicio || null, horario_abertura_livro_lei: documento.horarioAberturaLivroLei || null, horario_encerramento: documento.horarioEncerramento || null,
      cargos: documento.cargos, expediente: documento.expediente.trim() || null, ordem_dia: documento.ordemDia.trim() || null, quarto_hora: documento.quartoHora.trim() || null,
      tronco_solidariedade: documento.troncoSolidariedade.trim() || null, palavra_bem_ordem: documento.palavraBemOrdem.trim() || null, visitantes: documento.visitantes.trim() || null,
      encerramento: documento.encerramento.trim() || null, anotacoes_brutas: documento.anotacoesBrutas.trim() || null, texto_oficial: documento.textoOficial.trim() || null,
      tem_financeiro: documento.temFinanceiro, tem_presenca: documento.temPresenca, orador_aplicavel: documento.oradorAplicavel,
    };
    const query = documento.id ? supabase.from("secretaria_documentos").update(payload).eq("id", documento.id).eq("loja_id", documento.lojaId) : supabase.from("secretaria_documentos").insert(payload);
    const { data, error } = await query.select("id").single();
    if (error) throw new Error(error.message.includes("bloqueado") ? error.message : "Não foi possível salvar o rascunho. Verifique número duplicado e campos obrigatórios.");
    const id = data.id as string;
    const { error: deleteError } = await supabase.from("secretaria_deliberacoes").delete().eq("documento_id", id);
    if (deleteError) throw deleteError;
    if (documento.deliberacoes.length) {
      const { error: deliberacaoError } = await supabase.from("secretaria_deliberacoes").insert(documento.deliberacoes.map((d) => ({ documento_id: id, loja_id: documento.lojaId, descricao: d.descricao.trim(), responsavel: d.responsavel.trim() || null, prazo: d.prazo || null, status: d.status })));
      if (deliberacaoError) throw deliberacaoError;
    }
    revalidatePath("/secretaria"); revalidatePath("/dashboard"); revalidatePath("/documentos");
    return { ok: true as const, id };
  } catch (erro) { return falha(erro, "Não foi possível salvar o documento."); }
}

export async function movimentarDocumentoSecretariaAction(input: { lojaId: string; id: string; acao: typeof acoes[number]; justificativa?: string }) {
  try {
    if (!uuid.test(input.id) || !acoes.includes(input.acao)) throw new Error("Movimentação inválida.");
    const { supabase } = await contexto(input.lojaId);
    const { error } = await supabase.rpc("movimentar_documento_secretaria", { p_documento: input.id, p_acao: input.acao, p_justificativa: input.justificativa?.trim() || null });
    if (error) throw new Error(error.message);
    revalidatePath("/secretaria"); revalidatePath("/dashboard"); revalidatePath("/documentos");
    return { ok: true as const };
  } catch (erro) { return falha(erro, "Não foi possível movimentar o documento."); }
}

