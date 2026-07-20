"use server";

import { revalidatePath } from "next/cache";
import {
  configuracaoEmail,
  enfileirarAvisoUsuario,
  processarNotificacoesPendentes,
  reenfileirarNotificacao,
} from "@/lib/notificacoes-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statusPermitidos = [
  "Todos",
  "Aguardando configuração",
  "Pendente",
  "Enviando",
  "Enviado",
  "Falhou",
  "Ignorado",
];

async function contextoAdministrador(lojaId: string) {
  if (!uuid.test(lojaId)) throw new Error("Selecione uma Loja ativa válida.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

  const admin = createAdminClient();
  const [{ data: perfil }, { data: vinculo }] = await Promise.all([
    admin.from("profiles").select("id,nome,email,perfil,status").eq("id", user.id).maybeSingle(),
    admin.from("loja_usuarios")
      .select("loja_id,perfil,status")
      .eq("loja_id", lojaId)
      .eq("usuario_id", user.id)
      .maybeSingle(),
  ]);
  if (
    !perfil
    || perfil.status !== "ativo"
    || vinculo?.status !== "ativo"
    || (perfil.perfil !== "Administrador" && vinculo.perfil !== "Administrador")
  ) {
    throw new Error("Apenas o Administrador ativo da Loja pode gerenciar notificações.");
  }
  return { admin, userId: user.id, nome: perfil.nome, email: perfil.email };
}

function falha(erro: unknown, padrao: string) {
  return { ok: false as const, erro: erro instanceof Error ? erro.message : padrao };
}

export async function listarNotificacoesAction(input: { lojaId: string; status?: string }) {
  try {
    const { admin } = await contextoAdministrador(input.lojaId);
    const status = statusPermitidos.includes(input.status || "Todos") ? (input.status || "Todos") : "Todos";
    let consulta = admin.from("notificacoes_email")
      .select("id,destinatario_email,destinatario_nome,assunto,evento_tipo,rota_destino,status,tentativas,ultimo_erro,enviado_em,processado_em,criado_em,atualizado_em")
      .eq("loja_id", input.lojaId)
      .order("criado_em", { ascending: false })
      .limit(200);
    if (status !== "Todos") consulta = consulta.eq("status", status);
    const { data, error } = await consulta;
    if (error) throw new Error("Não foi possível carregar a fila de e-mails.");
    return {
      ok: true as const,
      data: (data ?? []).map((item) => ({
        id: item.id,
        destinatarioEmail: item.destinatario_email,
        destinatarioNome: item.destinatario_nome || "Irmão",
        assunto: item.assunto,
        eventoTipo: item.evento_tipo,
        rotaDestino: item.rota_destino,
        status: item.status,
        tentativas: Number(item.tentativas || 0),
        ultimoErro: item.ultimo_erro || "",
        enviadoEm: item.enviado_em || "",
        processadoEm: item.processado_em || "",
        criadoEm: item.criado_em,
        atualizadoEm: item.atualizado_em,
      })),
      configuracao: configuracaoEmail(),
    };
  } catch (erro) {
    return falha(erro, "Não foi possível carregar as notificações.");
  }
}

export async function processarFilaAction(lojaId: string) {
  try {
    const { userId } = await contextoAdministrador(lojaId);
    const admin = createAdminClient();
    const { data: ids, error } = await admin.from("notificacoes_email")
      .select("id")
      .eq("loja_id", lojaId)
      .in("status", ["Pendente", "Aguardando configuração"])
      .limit(50);
    if (error) throw new Error("Não foi possível preparar a fila.");
    const resultado = await processarNotificacoesPendentes({
      ids: (ids ?? []).map((item) => item.id),
      limite: 50,
      usuarioId: userId,
    });
    revalidatePath("/notificacoes");
    return { ok: true as const, data: resultado };
  } catch (erro) {
    return falha(erro, "Não foi possível processar a fila.");
  }
}

export async function reenviarNotificacaoAction(input: { id: string; lojaId: string }) {
  try {
    if (!uuid.test(input.id)) throw new Error("Notificação inválida.");
    const { userId } = await contextoAdministrador(input.lojaId);
    await reenfileirarNotificacao(input.id, input.lojaId, userId);
    const resultado = await processarNotificacoesPendentes({
      ids: [input.id],
      limite: 1,
      usuarioId: userId,
    });
    revalidatePath("/notificacoes");
    return { ok: true as const, data: resultado };
  } catch (erro) {
    return falha(erro, "Não foi possível reenviar o e-mail.");
  }
}

export async function testarEnvioAdministradorAction(lojaId: string) {
  try {
    const { userId, email } = await contextoAdministrador(lojaId);
    if (!email?.trim()) throw new Error("O Administrador não possui e-mail cadastrado.");
    const fila = await enfileirarAvisoUsuario({
      lojaId,
      usuarioId: userId,
      evento: "Teste de envio",
      rotaDestino: "/notificacoes",
      dedupeKey: `teste-email:${lojaId}:${userId}:${Date.now()}`,
      criadoPor: userId,
    });
    if (!fila.enfileirada || !fila.id) throw new Error(fila.motivo || "Não foi possível criar o teste.");
    const resultado = await processarNotificacoesPendentes({
      ids: [fila.id],
      limite: 1,
      usuarioId: userId,
    });
    revalidatePath("/notificacoes");
    return {
      ok: true as const,
      data: resultado,
      mensagem: configuracaoEmail().configurado
        ? "Teste processado para o e-mail do Administrador."
        : "Teste registrado. Configure RESEND_API_KEY e EMAIL_FROM para enviá-lo.",
    };
  } catch (erro) {
    return falha(erro, "Não foi possível testar o envio.");
  }
}
