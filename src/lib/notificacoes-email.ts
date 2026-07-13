import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type NotificacaoEmail = {
  id: string;
  destinatario_email: string;
  destinatario_nome: string | null;
  assunto: string;
  mensagem: string;
  tentativas: number;
};

const escaparHtml = (valor: string) => valor
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export async function processarNotificacoesPendentes() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) return { processadas: 0, enviadas: 0 };

  const admin = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("notificacoes_email")
    .select("id,destinatario_email,destinatario_nome,assunto,mensagem,tentativas")
    .in("status", ["Pendente", "Falha", "Aguardando configuração"])
    .lt("tentativas", 5)
    .order("criado_em", { ascending: true })
    .limit(20);

  if (error || !data?.length) return { processadas: 0, enviadas: 0 };

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    await admin
      .from("notificacoes_email")
      .update({
        status: "Aguardando configuração",
        ultimo_erro: "Configure RESEND_API_KEY na Vercel para ativar o envio externo.",
        atualizado_em: new Date().toISOString(),
      })
      .in("id", data.map((item) => item.id));
    return { processadas: data.length, enviadas: 0, aguardandoConfiguracao: true };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://sigma-sand-nine.vercel.app").replace(/\/$/, "");
  const remetente = process.env.EMAIL_FROM || "SIGMA 2.0 <onboarding@resend.dev>";
  let enviadas = 0;

  for (const item of data as NotificacaoEmail[]) {
    const tentativas = Number(item.tentativas || 0) + 1;
    await admin.from("notificacoes_email").update({
      status: "Enviando",
      tentativas,
      atualizado_em: new Date().toISOString(),
    }).eq("id", item.id);

    try {
      const nome = item.destinatario_nome?.trim() || "Irmão";
      const mensagem = escaparHtml(item.mensagem).replaceAll("\n", "<br />");
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
          text: `Olá, ${nome}.\n\n${item.mensagem}\n\nAcesse: ${siteUrl}`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033">
            <h2 style="color:#9a6700">SIGMA 2.0</h2>
            <p>Olá, <strong>${escaparHtml(nome)}</strong>.</p>
            <p>${mensagem}</p>
            <p><a href="${siteUrl}" style="display:inline-block;padding:12px 18px;background:#f4bf24;color:#111827;text-decoration:none;border-radius:8px;font-weight:bold">Acompanhar no SIGMA</a></p>
            <p style="font-size:12px;color:#667085">Mensagem automática. A resposta deve ser registrada dentro do SIGMA para permanecer no histórico.</p>
          </div>`,
        }),
      });

      if (!resposta.ok) {
        const detalhe = (await resposta.text()).slice(0, 500);
        throw new Error(`Provedor retornou ${resposta.status}: ${detalhe}`);
      }

      await admin.from("notificacoes_email").update({
        status: "Enviado",
        enviado_em: new Date().toISOString(),
        ultimo_erro: null,
        atualizado_em: new Date().toISOString(),
      }).eq("id", item.id);
      enviadas += 1;
    } catch (erro) {
      await admin.from("notificacoes_email").update({
        status: tentativas >= 5 ? "Falha" : "Pendente",
        ultimo_erro: erro instanceof Error ? erro.message.slice(0, 500) : "Falha desconhecida no envio.",
        atualizado_em: new Date().toISOString(),
      }).eq("id", item.id);
    }
  }

  return { processadas: data.length, enviadas };
}
