"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const tiposPermitidos = [
  "Atualização cadastral",
  "Justificativa de falta",
  "Envio de comprovante de pagamento",
  "Solicitação à Secretaria",
  "Solicitação à Tesouraria",
  "Solicitação à Chancelaria",
  "Outra",
] as const;

export async function enviarSolicitacaoPortal(input: {
  lojaId: string;
  tipo: string;
  titulo: string;
  descricao: string;
  dados?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

  const titulo = input.titulo.trim();
  const descricao = input.descricao.trim();
  if (!input.lojaId) throw new Error("Não foi possível identificar a Loja ativa.");
  if (!tiposPermitidos.includes(input.tipo as typeof tiposPermitidos[number])) throw new Error("Selecione um tipo de solicitação válido.");
  if (titulo.length < 3 || titulo.length > 120) throw new Error("O assunto deve ter entre 3 e 120 caracteres.");
  if (descricao.length < 10 || descricao.length > 2000) throw new Error("A descrição deve ter entre 10 e 2.000 caracteres.");

  const { data: vinculo, error: vinculoError } = await supabase.from("loja_usuarios")
    .select("loja_id,obreiro_id,acesso_portal_obreiro,status")
    .eq("usuario_id", user.id)
    .eq("loja_id", input.lojaId)
    .eq("status", "ativo")
    .maybeSingle();

  if (vinculoError) throw new Error("Não foi possível validar seu vínculo com a Loja.");
  if (!vinculo) throw new Error("Seu usuário não possui vínculo ativo com esta Loja.");
  if (!vinculo.acesso_portal_obreiro) throw new Error("O Portal do Obreiro não está liberado para esta Loja.");
  if (!vinculo.obreiro_id) throw new Error("Seu usuário ainda não está vinculado ao cadastro de Obreiro.");

  const { data: solicitacao, error } = await supabase.from("solicitacoes_obreiro").insert({
    loja_id: vinculo.loja_id,
    obreiro_id: vinculo.obreiro_id,
    usuario_id: user.id,
    tipo: input.tipo,
    titulo,
    descricao,
    dados_json: input.dados ?? {},
  }).select("id,status,criado_em").single();

  if (error) {
    if (error.code === "42501") throw new Error("Seu acesso não permite enviar solicitações nesta Loja. Procure o Administrador.");
    throw new Error("Não foi possível enviar a solicitação agora. Tente novamente.");
  }

  await supabase.rpc("registrar_evento_seguranca", {
    alvo_loja: vinculo.loja_id,
    modulo: "/portal-obreiro",
    acao: "criar_solicitacao",
    resultado: "permitido",
    descricao: "Solicitação do Obreiro enviada para análise.",
    motivo: null,
  });

  revalidatePath("/portal-obreiro");
  revalidatePath("/solicitacoes");
  return { id: solicitacao.id, status: solicitacao.status, criadoEm: solicitacao.criado_em };
}
