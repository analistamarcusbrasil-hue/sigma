"use server";

import { revalidatePath } from "next/cache";
import type { ComunicadoPortal } from "@/lib/supabase/portal";
import { processarNotificacoesPendentes } from "@/lib/notificacoes-email";
import { createClient } from "@/lib/supabase/server";

const statusPermitidos = ["Rascunho", "Publicado", "Arquivado", "Expirado"];
const prioridades = ["Baixa", "Normal", "Alta", "Urgente"];
const publicos = ["Todos os obreiros", "Diretoria", "Tesoureiro", "Secretário", "Chanceler", "Obreiro"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function salvarComunicadoComEmail(item: ComunicadoPortal) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false as const, erro: "Sua sessão expirou. Entre novamente." };

    const titulo = item.titulo.trim();
    const mensagem = item.mensagem.trim();
    if (titulo.length < 3 || titulo.length > 120) return { ok: false as const, erro: "O título deve ter entre 3 e 120 caracteres." };
    if (mensagem.length < 3 || mensagem.length > 5000) return { ok: false as const, erro: "A mensagem deve ter entre 3 e 5.000 caracteres." };
    if (!statusPermitidos.includes(item.status) || !prioridades.includes(item.prioridade) || !publicos.includes(item.publicoAlvo)) {
      return { ok: false as const, erro: "Revise o status, a prioridade e o público do comunicado." };
    }
    if (item.id && !uuid.test(item.id)) return { ok: false as const, erro: "Comunicado inválido." };

    const { data: vinculo, error: vinculoErro } = await supabase
      .from("loja_usuarios")
      .select("loja_id")
      .eq("usuario_id", user.id)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle();
    if (vinculoErro || !vinculo) return { ok: false as const, erro: "Seu usuário não está vinculado a uma Loja ativa." };

    const payload = {
      loja_id: vinculo.loja_id,
      titulo,
      mensagem,
      tipo: item.tipo,
      prioridade: item.prioridade,
      publico_alvo: item.publicoAlvo,
      status: item.status,
      publicado_em: item.status === "Publicado" ? (item.publicadoEm || new Date().toISOString()) : null,
      expira_em: item.expiraEm || null,
    };
    const consulta = item.id
      ? supabase.from("comunicados_internos").update(payload).eq("id", item.id).eq("loja_id", vinculo.loja_id)
      : supabase.from("comunicados_internos").insert(payload);
    const { data, error } = await consulta.select("id").single();
    if (error) {
      const erro = error.code === "42501"
        ? "Seu perfil não tem permissão para publicar comunicados nesta Loja."
        : error.code === "23514"
          ? "Revise os campos do comunicado."
          : "Não foi possível salvar o comunicado. Tente novamente.";
      return { ok: false as const, erro };
    }

    const email = item.status === "Publicado" ? await processarNotificacoesPendentes() : { processadas: 0, enviadas: 0 };
    revalidatePath("/comunicados");
    revalidatePath("/portal-obreiro");
    return { ok: true as const, id: data.id, email };
  } catch {
    return { ok: false as const, erro: "Não foi possível concluir a publicação agora. Tente novamente." };
  }
}
