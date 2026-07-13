"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const tiposPermitidos = [
  "Atualização cadastral",
  "Justificativa de falta",
  "Frequência e presença",
  "Envio de comprovante de pagamento",
  "Assunto financeiro",
  "Kit Placet e documentos",
  "Documento ou certidão",
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
  sessaoId?: string;
  dados?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

  const titulo = input.titulo.trim();
  const descricao = input.descricao.trim();
  const exigeSessao = input.tipo === "Justificativa de falta" || input.tipo === "Frequência e presença";
  const sessaoId = input.sessaoId?.trim() ?? "";
  if (!input.lojaId) throw new Error("Não foi possível identificar a Loja ativa.");
  if (!tiposPermitidos.includes(input.tipo as typeof tiposPermitidos[number])) throw new Error("Selecione um tipo de solicitação válido.");
  if (titulo.length < 3 || titulo.length > 120) throw new Error("O assunto deve ter entre 3 e 120 caracteres.");
  if (descricao.length < 10 || descricao.length > 2000) throw new Error("A descrição deve ter entre 10 e 2.000 caracteres.");
  if (exigeSessao && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessaoId)) {
    throw new Error("Selecione no calendário a sessão que deseja justificar.");
  }

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

  let sessao: { id: string; data: string; tipo: string; titulo: string | null; status: string } | null = null;
  if (exigeSessao) {
    const { data, error: sessaoError } = await supabase.from("sessoes")
      .select("id,data,tipo,titulo,status")
      .eq("id", sessaoId)
      .eq("loja_id", vinculo.loja_id)
      .maybeSingle();

    if (sessaoError || !data) throw new Error("A sessão selecionada não foi encontrada nesta Loja.");
    if (data.status === "cancelada") throw new Error("Não é possível justificar uma sessão cancelada.");
    if (data.data > new Date().toISOString().slice(0, 10)) throw new Error("Não é possível justificar uma sessão futura.");
    sessao = data;

    const { data: duplicada, error: duplicadaError } = await supabase.from("solicitacoes_obreiro")
      .select("id")
      .eq("usuario_id", user.id)
      .eq("sessao_id", sessaoId)
      .in("status", ["Pendente", "Em análise", "Aprovada"])
      .limit(1)
      .maybeSingle();
    if (duplicadaError) throw new Error("Não foi possível validar pedidos anteriores desta sessão.");
    if (duplicada) throw new Error("Já existe uma justificativa em andamento para esta sessão. Acompanhe a tramitação abaixo.");
  }

  const dadosSeguros = {
    ...(input.dados ?? {}),
    ...(sessao ? {
      sessaoId: sessao.id,
      sessaoData: sessao.data,
      sessaoTitulo: sessao.titulo,
      sessaoTipo: sessao.tipo,
    } : {}),
  };

  const { data: solicitacao, error } = await supabase.from("solicitacoes_obreiro").insert({
    loja_id: vinculo.loja_id,
    obreiro_id: vinculo.obreiro_id,
    usuario_id: user.id,
    tipo: input.tipo,
    titulo,
    descricao,
    sessao_id: sessao?.id ?? null,
    dados_json: dadosSeguros,
  }).select("id,status,criado_em,protocolo,area_destino,prazo_em").single();

  if (error) {
    if (error.code === "42501") throw new Error("Seu acesso não permite enviar solicitações nesta Loja. Procure o Administrador.");
    if (error.code === "23505" || error.code === "23514") throw new Error(error.message);
    throw new Error("Não foi possível enviar a solicitação agora. Tente novamente.");
  }

  await supabase.rpc("registrar_evento_seguranca", {
    alvo_loja: vinculo.loja_id,
    modulo: "/portal-obreiro",
    acao: "criar_solicitacao",
    resultado: "permitido",
    descricao: `Solicitação ${solicitacao.protocolo} enviada e direcionada para ${solicitacao.area_destino}.`,
    motivo: null,
  });

  revalidatePath("/portal-obreiro");
  revalidatePath("/solicitacoes");
  revalidatePath("/dashboard");
  return {
    id: solicitacao.id,
    protocolo: solicitacao.protocolo,
    status: solicitacao.status,
    areaDestino: solicitacao.area_destino,
    prazoEm: solicitacao.prazo_em,
    criadoEm: solicitacao.criado_em,
  };
}
