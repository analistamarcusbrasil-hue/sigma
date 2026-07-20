import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type StatusNotificacaoEmail =
  | "Aguardando configuração"
  | "Pendente"
  | "Enviando"
  | "Enviado"
  | "Falhou"
  | "Ignorado";

export type EventoEmail =
  | "Comunicado publicado"
  | "Solicitação criada pelo Obreiro"
  | "Solicitação respondida"
  | "Justificativa enviada"
  | "Justificativa aprovada"
  | "Justificativa recusada"
  | "Comprovante enviado"
  | "Comprovante aprovado"
  | "Comprovante recusado"
  | "Acesso ao Portal liberado"
  | "Senha definida pelo Administrador"
  | "Documento aprovado disponível"
  | "Teste de envio";

type ItemFila = {
  id: string;
  loja_id: string;
  destinatario_usuario_id: string | null;
  destinatario_email: string;
  destinatario_nome: string | null;
  assunto: string;
  evento_tipo: string;
  rota_destino: string;
  tentativas: number;
};

type EnfileirarInput = {
  lojaId: string;
  usuarioId: string;
  evento: EventoEmail;
  rotaDestino: string;
  dedupeKey: string;
  solicitacaoId?: string | null;
  tramitacaoId?: string | null;
  comunicadoId?: string | null;
  criadoPor?: string | null;
};

const ASSUNTOS: Record<EventoEmail, string> = {
  "Comunicado publicado": "[SIGMA] Novo comunicado publicado",
  "Solicitação criada pelo Obreiro": "[SIGMA] Nova solicitação recebida",
  "Solicitação respondida": "[SIGMA] Solicitação atualizada",
  "Justificativa enviada": "[SIGMA] Nova justificativa recebida",
  "Justificativa aprovada": "[SIGMA] Justificativa aprovada",
  "Justificativa recusada": "[SIGMA] Justificativa recusada",
  "Comprovante enviado": "[SIGMA] Novo comprovante recebido",
  "Comprovante aprovado": "[SIGMA] Comprovante aprovado",
  "Comprovante recusado": "[SIGMA] Comprovante recusado",
  "Acesso ao Portal liberado": "[SIGMA] Acesso ao Portal liberado",
  "Senha definida pelo Administrador": "[SIGMA] Credencial de acesso atualizada",
  "Documento aprovado disponível": "[SIGMA] Documento aprovado disponível",
  "Teste de envio": "[SIGMA] Teste de notificações",
};

const escaparHtml = (valor: string) => valor
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export function configuracaoEmail() {
  return {
    resendConfigurado: Boolean(process.env.RESEND_API_KEY?.trim()),
    remetenteConfigurado: Boolean(process.env.EMAIL_FROM?.trim()),
    configurado: Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()),
  };
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://sigma-sand-nine.vercel.app").replace(/\/$/, "");
}

function rotaSegura(rota: string) {
  return /^\/[a-z0-9/_-]*$/i.test(rota) ? rota : "/";
}

async function destinatarioValido(item: ItemFila) {
  if (!item.destinatario_usuario_id) return false;
  const admin = createAdminClient();
  const [{ data: perfil }, { data: vinculo }] = await Promise.all([
    admin.from("profiles")
      .select("id,email,status")
      .eq("id", item.destinatario_usuario_id)
      .maybeSingle(),
    admin.from("loja_usuarios")
      .select("usuario_id,status")
      .eq("usuario_id", item.destinatario_usuario_id)
      .eq("loja_id", item.loja_id)
      .maybeSingle(),
  ]);
  return Boolean(
    perfil?.status === "ativo"
    && vinculo?.status === "ativo"
    && perfil.email?.trim().toLowerCase() === item.destinatario_email.trim().toLowerCase()
  );
}

export async function enfileirarAvisoUsuario(input: EnfileirarInput) {
  try {
    const admin = createAdminClient();
    const [{ data: perfil }, { data: vinculo }] = await Promise.all([
      admin.from("profiles").select("id,nome,email,status").eq("id", input.usuarioId).maybeSingle(),
      admin.from("loja_usuarios")
        .select("usuario_id,status")
        .eq("usuario_id", input.usuarioId)
        .eq("loja_id", input.lojaId)
        .maybeSingle(),
    ]);
    if (!perfil || perfil.status !== "ativo" || vinculo?.status !== "ativo" || !perfil.email?.trim()) {
      return { enfileirada: false as const, motivo: "Usuário inativo, bloqueado ou sem e-mail válido." };
    }

    const status: StatusNotificacaoEmail = configuracaoEmail().configurado
      ? "Pendente"
      : "Aguardando configuração";
    const { data, error } = await admin.from("notificacoes_email").upsert({
      loja_id: input.lojaId,
      solicitacao_id: input.solicitacaoId || null,
      tramitacao_id: input.tramitacaoId || null,
      comunicado_id: input.comunicadoId || null,
      destinatario_usuario_id: perfil.id,
      destinatario_email: perfil.email.trim().toLowerCase(),
      destinatario_nome: perfil.nome,
      assunto: ASSUNTOS[input.evento],
      mensagem: "Há uma nova atualização disponível no SIGMA.",
      status,
      evento_tipo: input.evento,
      rota_destino: rotaSegura(input.rotaDestino),
      dedupe_key: input.dedupeKey.slice(0, 240),
      ultimo_erro: status === "Aguardando configuração"
        ? "Configure RESEND_API_KEY e EMAIL_FROM na Vercel para ativar o envio."
        : null,
      ultima_acao_por: input.criadoPor || null,
    }, { onConflict: "dedupe_key", ignoreDuplicates: true })
      .select("id,status")
      .maybeSingle();
    if (error) return { enfileirada: false as const, motivo: "Não foi possível registrar o aviso." };
    return { enfileirada: Boolean(data), id: data?.id, status: data?.status };
  } catch {
    return { enfileirada: false as const, motivo: "O aviso não pôde ser registrado agora." };
  }
}

export async function reenfileirarNotificacao(id: string, lojaId: string, usuarioId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("notificacoes_email")
    .update({
      status: configuracaoEmail().configurado ? "Pendente" : "Aguardando configuração",
      tentativas: 0,
      ultimo_erro: configuracaoEmail().configurado
        ? null
        : "Configure RESEND_API_KEY e EMAIL_FROM na Vercel para ativar o envio.",
      provider_id: null,
      processado_em: null,
      ultima_acao_por: usuarioId,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("loja_id", lojaId)
    .in("status", ["Falhou", "Falha", "Aguardando configuração"])
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Somente e-mails com falha ou aguardando configuração podem ser reenviados.");
}

export async function processarNotificacoesPendentes(opcoes?: {
  ids?: string[];
  limite?: number;
  usuarioId?: string | null;
}) {
  const admin = createAdminClient();
  let consulta = admin.from("notificacoes_email")
    .select("id,loja_id,destinatario_usuario_id,destinatario_email,destinatario_nome,assunto,evento_tipo,rota_destino,tentativas")
    .in("status", ["Pendente", "Aguardando configuração"])
    .lt("tentativas", 5)
    .order("criado_em", { ascending: true })
    .limit(Math.min(Math.max(opcoes?.limite ?? 20, 1), 50));
  if (opcoes?.ids?.length) consulta = consulta.in("id", opcoes.ids);

  const { data, error } = await consulta;
  if (error || !data?.length) return { processadas: 0, enviadas: 0, falhas: 0, ignoradas: 0 };

  const configuracao = configuracaoEmail();
  if (!configuracao.configurado) {
    await admin.from("notificacoes_email").update({
      status: "Aguardando configuração",
      ultimo_erro: "Configure RESEND_API_KEY e EMAIL_FROM na Vercel para ativar o envio.",
      ultima_acao_por: opcoes?.usuarioId || null,
      atualizado_em: new Date().toISOString(),
    }).in("id", data.map((item) => item.id));
    return {
      processadas: data.length,
      enviadas: 0,
      falhas: 0,
      ignoradas: 0,
      aguardandoConfiguracao: true,
    };
  }

  const resendKey = process.env.RESEND_API_KEY as string;
  const remetente = process.env.EMAIL_FROM as string;
  let enviadas = 0;
  let falhas = 0;
  let ignoradas = 0;

  for (const item of data as ItemFila[]) {
    if (!(await destinatarioValido(item))) {
      await admin.from("notificacoes_email").update({
        status: "Ignorado",
        ultimo_erro: "Destinatário inativo, bloqueado, sem vínculo ativo ou com e-mail alterado.",
        processado_em: new Date().toISOString(),
        ultima_acao_por: opcoes?.usuarioId || null,
        atualizado_em: new Date().toISOString(),
      }).eq("id", item.id);
      ignoradas += 1;
      continue;
    }

    const tentativas = Number(item.tentativas || 0) + 1;
    await admin.from("notificacoes_email").update({
      status: "Enviando",
      tentativas,
      ultima_acao_por: opcoes?.usuarioId || null,
      atualizado_em: new Date().toISOString(),
    }).eq("id", item.id);

    const nome = item.destinatario_nome?.trim() || "Irmão";
    const destino = siteUrl() + rotaSegura(item.rota_destino);
    const texto = [
      "SIGMA LUMP",
      "",
      `Olá, ${nome}.`,
      "Há uma nova atualização disponível no SIGMA.",
      "",
      `Acessar o SIGMA: ${destino}`,
      "",
      "Sistema desenvolvido por Marcus Brasil • Contato: analista.marcusbrasil@gmail.com",
    ].join("\n");

    const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#08111f;font-family:Arial,sans-serif;color:#e5e7eb">
      <div style="max-width:620px;margin:0 auto;padding:28px 18px">
        <div style="border:1px solid #334155;border-radius:18px;overflow:hidden;background:#0b1728">
          <div style="padding:22px 26px;background:#111c2f;border-bottom:3px solid #f4bf24">
            <div style="font-size:22px;font-weight:800;letter-spacing:.12em;color:#f4bf24">SIGMA LUMP</div>
          </div>
          <div style="padding:28px 26px">
            <p style="margin:0 0 14px;font-size:17px">Olá, <strong>${escaparHtml(nome)}</strong>.</p>
            <p style="margin:0 0 24px;line-height:1.65;color:#cbd5e1">Há uma nova atualização disponível no SIGMA.</p>
            <a href="${destino}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#f4bf24;color:#0f172a;text-decoration:none;font-weight:800">Acessar o SIGMA</a>
          </div>
          <div style="padding:18px 26px;border-top:1px solid #334155;font-size:12px;line-height:1.6;color:#94a3b8">
            Sistema desenvolvido por Marcus Brasil • Contato: analista.marcusbrasil@gmail.com
          </div>
        </div>
      </div>
    </body></html>`;

    try {
      const resposta = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: remetente,
          to: [item.destinatario_email],
          subject: item.assunto,
          text: texto,
          html,
        }),
      });
      const retorno = await resposta.json().catch(() => ({})) as { id?: string; message?: string };
      if (!resposta.ok) throw new Error(`Resend retornou ${resposta.status}: ${retorno.message || "falha no envio"}`);

      await admin.from("notificacoes_email").update({
        status: "Enviado",
        enviado_em: new Date().toISOString(),
        processado_em: new Date().toISOString(),
        provider_id: retorno.id || null,
        ultimo_erro: null,
        ultima_acao_por: opcoes?.usuarioId || null,
        atualizado_em: new Date().toISOString(),
      }).eq("id", item.id);
      enviadas += 1;
    } catch (erroEnvio) {
      await admin.from("notificacoes_email").update({
        status: "Falhou",
        ultimo_erro: erroEnvio instanceof Error
          ? erroEnvio.message.slice(0, 500)
          : "Falha desconhecida no envio.",
        processado_em: new Date().toISOString(),
        ultima_acao_por: opcoes?.usuarioId || null,
        atualizado_em: new Date().toISOString(),
      }).eq("id", item.id);
      falhas += 1;
    }
  }

  return { processadas: data.length, enviadas, falhas, ignoradas };
}
