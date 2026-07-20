"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { processarNotificacoesPendentes } from "@/lib/notificacoes-email";

const tiposPermitidos = [
  "Atualização cadastral",
  "Justificativa de falta",
  "Frequência e presença",
  "Envio de comprovante de pagamento",
  "Assunto financeiro",
  "Isenção de mensalidades",
  "Kit Placet e documentos",
  "Documento ou certidão",
  "Solicitação à Secretaria",
  "Solicitação à Tesouraria",
  "Solicitação à Chancelaria",
  "Outra",
] as const;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tiposArquivo = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function revalidarSolicitacoes() {
  revalidatePath("/portal-obreiro");
  revalidatePath("/solicitacoes");
  revalidatePath("/dashboard");
}

async function dispararEmails() {
  try {
    await processarNotificacoesPendentes();
  } catch {
    // A movimentação permanece registrada e a fila tentará novamente depois.
  }
}

export async function enviarSolicitacaoPortal(input: {
  lojaId: string;
  tipo: string;
  titulo: string;
  descricao: string;
  sessaoIds?: string[];
  periodoInicio?: string;
  periodoFim?: string;
  dados?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

  const titulo = input.titulo.trim();
  const descricao = input.descricao.trim();
  if (!uuid.test(input.lojaId)) throw new Error("Não foi possível identificar a Loja ativa.");
  if (!tiposPermitidos.includes(input.tipo as typeof tiposPermitidos[number])) throw new Error("Selecione um tipo de solicitação válido.");
  if (titulo.length < 3 || titulo.length > 120) throw new Error("O assunto deve ter entre 3 e 120 caracteres.");
  if (descricao.length < 10 || descricao.length > 2000) throw new Error("A descrição deve ter entre 10 e 2.000 caracteres.");

  const sessaoIds = Array.from(new Set(input.sessaoIds ?? []));
  if (sessaoIds.some((id) => !uuid.test(id))) throw new Error("Uma das sessões selecionadas é inválida.");
  if (sessaoIds.length > 52) throw new Error("Selecione no máximo 52 sessões por solicitação.");

  const exigeSessoes = input.tipo === "Justificativa de falta" || input.tipo === "Frequência e presença";
  if (exigeSessoes && sessaoIds.length === 0) throw new Error("Selecione ao menos uma sessão para justificar.");

  const exigePeriodo = input.tipo === "Isenção de mensalidades";
  if (exigePeriodo && (!input.periodoInicio || !input.periodoFim)) {
    throw new Error("Informe o primeiro e o último mês do pedido de isenção.");
  }

  const { data, error } = await supabase.rpc("criar_solicitacao_portal", {
    p_loja_id: input.lojaId,
    p_tipo: input.tipo,
    p_titulo: titulo,
    p_descricao: descricao,
    p_dados: input.dados ?? {},
    p_sessao_ids: sessaoIds.length ? sessaoIds : null,
    p_periodo_inicio: input.periodoInicio || null,
    p_periodo_fim: input.periodoFim || null,
  });

  if (error) {
    if (error.code === "42501") throw new Error(error.message || "Seu acesso ao Portal não está liberado nesta Loja.");
    if (error.code === "23505" || error.code === "23514") throw new Error(error.message);
    throw new Error(error.message || "Não foi possível enviar a solicitação agora.");
  }

  await dispararEmails();
  revalidarSolicitacoes();
  return data as {
    id: string;
    protocolo: string;
    status: string;
    areaDestino: string;
    prazoEm: string;
    criadoEm: string;
  };
}

export async function responderSolicitacaoPortal(input: { id: string; mensagem: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
  if (!uuid.test(input.id)) throw new Error("Solicitação inválida.");
  const mensagem = input.mensagem.trim();
  if (mensagem.length < 2 || mensagem.length > 2000) throw new Error("A mensagem deve ter entre 2 e 2.000 caracteres.");

  const { error } = await supabase.rpc("responder_solicitacao", {
    p_solicitacao_id: input.id,
    p_mensagem: mensagem,
  });
  if (error) throw new Error(error.message || "Não foi possível enviar a mensagem.");

  await dispararEmails();
  revalidarSolicitacoes();
  return { ok: true };
}

export async function registrarAnexoPortal(input: {
  id: string;
  storagePath: string;
  nome: string;
  tipo: string;
  tamanho: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
  if (!uuid.test(input.id)) throw new Error("Solicitação inválida.");
  if (!tiposArquivo.includes(input.tipo)) throw new Error("Formato de arquivo não permitido.");
  if (!Number.isFinite(input.tamanho) || input.tamanho <= 0 || input.tamanho > 10 * 1024 * 1024) {
    throw new Error("Cada arquivo deve ter no máximo 10 MB.");
  }

  const { error } = await supabase.rpc("registrar_anexo_solicitacao", {
    p_solicitacao_id: input.id,
    p_storage_path: input.storagePath,
    p_nome_arquivo: input.nome,
    p_tipo_mime: input.tipo,
    p_tamanho_bytes: Math.trunc(input.tamanho),
    p_categoria: "Documento enviado pelo Obreiro",
  });
  if (error) throw new Error(error.message || "Não foi possível registrar o anexo.");

  await dispararEmails();
  revalidarSolicitacoes();
  return { ok: true };
}
