"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { processarNotificacoesPendentes } from "@/lib/notificacoes-email";

const acoesPermitidas = [
  "ASSUMIR",
  "SOLICITAR_COMPLEMENTO",
  "ENCAMINHAR_VENERAVEL",
  "APROVAR_FINAL",
  "RECUSAR_FINAL",
  "CONCLUIR_ENTREGA",
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

function revalidar() {
  revalidatePath("/solicitacoes");
  revalidatePath("/dashboard");
  revalidatePath("/portal-obreiro");
}

async function dispararEmails() {
  try {
    await processarNotificacoesPendentes();
  } catch {
    // A fila mantém a mensagem para nova tentativa.
  }
}

export async function movimentarSolicitacao(input: {
  id: string;
  acao: string;
  mensagem: string;
  parecer?: string;
  arquivoFinalUrl?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
  if (!uuid.test(input.id)) throw new Error("Solicitação inválida.");
  if (!acoesPermitidas.includes(input.acao as typeof acoesPermitidas[number])) throw new Error("Ação de tramitação inválida.");

  const mensagem = input.mensagem.trim();
  if (mensagem.length > 2000) throw new Error("A mensagem deve ter no máximo 2.000 caracteres.");
  if (["SOLICITAR_COMPLEMENTO", "ENCAMINHAR_VENERAVEL"].includes(input.acao) && mensagem.length < 10) {
    throw new Error("Explique a decisão técnica com pelo menos 10 caracteres.");
  }
  if (["APROVAR_FINAL", "RECUSAR_FINAL", "CONCLUIR_ENTREGA"].includes(input.acao) && mensagem.length < 5) {
    throw new Error("Registre a fundamentação ou a entrega antes de continuar.");
  }

  const parecer = input.parecer?.trim() || null;
  if (input.acao === "ENCAMINHAR_VENERAVEL" && !["Favorável", "Desfavorável"].includes(parecer || "")) {
    throw new Error("Informe se o parecer técnico é Favorável ou Desfavorável.");
  }

  const arquivoFinalUrl = input.arquivoFinalUrl?.trim() || null;
  if (arquivoFinalUrl && !/^https:\/\//i.test(arquivoFinalUrl)) {
    throw new Error("O link do documento final deve começar com https://.");
  }

  const { data, error } = await supabase.rpc("movimentar_solicitacao", {
    p_solicitacao_id: input.id,
    p_acao: input.acao,
    p_mensagem: mensagem || null,
    p_parecer: parecer,
    p_arquivo_final_url: arquivoFinalUrl,
  });
  if (error) {
    if (error.code === "42501") throw new Error(error.message || "Seu perfil não pode executar esta etapa.");
    throw new Error(error.message || "Não foi possível movimentar a solicitação.");
  }

  await dispararEmails();
  revalidar();
  return data;
}

export async function responderSolicitacaoGestao(input: { id: string; mensagem: string }) {
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
  revalidar();
  return { ok: true };
}

export async function registrarAnexoGestao(input: {
  id: string;
  storagePath: string;
  nome: string;
  tipo: string;
  tamanho: number;
  categoria?: string;
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
    p_categoria: input.categoria?.trim() || "Documento complementar",
  });
  if (error) throw new Error(error.message || "Não foi possível registrar o anexo.");

  await dispararEmails();
  revalidar();
  return { ok: true };
}

// Compatibilidade com clientes abertos antes da atualização.
export async function tramitarSolicitacao(input: {
  id: string;
  status: string;
  resposta: string;
  arquivoFinalUrl?: string;
}) {
  const acao = input.status === "Em análise" ? "ASSUMIR"
    : input.status === "Aprovada" ? "APROVAR_FINAL"
    : input.status === "Recusada" ? "RECUSAR_FINAL"
    : input.status === "Concluída" ? "CONCLUIR_ENTREGA"
    : "";
  if (!acao) throw new Error("Situação inválida.");
  return movimentarSolicitacao({
    id: input.id,
    acao,
    mensagem: input.resposta,
    arquivoFinalUrl: input.arquivoFinalUrl,
  });
}
