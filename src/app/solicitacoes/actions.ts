"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const statusesPermitidos = ["Em análise", "Aprovada", "Recusada", "Concluída"] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function tramitarSolicitacao(input: {
  id: string;
  status: string;
  resposta: string;
  arquivoFinalUrl?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

  if (!uuid.test(input.id)) throw new Error("Solicitação inválida.");
  if (!statusesPermitidos.includes(input.status as typeof statusesPermitidos[number])) {
    throw new Error("Selecione uma situação válida.");
  }

  const resposta = input.resposta.trim();
  if (resposta.length > 2000) throw new Error("A resposta deve ter no máximo 2.000 caracteres.");

  const arquivoFinalUrl = (input.arquivoFinalUrl ?? "").trim();
  if (arquivoFinalUrl.length > 1000) throw new Error("O endereço do documento final é muito longo.");
  if (arquivoFinalUrl && !/^https:\/\//i.test(arquivoFinalUrl)) {
    throw new Error("Informe um endereço seguro iniciado por https:// para o documento final.");
  }
  if (input.status === "Concluída" && !resposta) {
    throw new Error("Informe a resposta final antes de concluir.");
  }

  const { error } = await supabase.rpc("tramitar_solicitacao", {
    p_solicitacao_id: input.id,
    p_status: input.status,
    p_resposta: resposta || null,
    p_arquivo_final_url: arquivoFinalUrl || null,
  });

  if (error) {
    if (error.code === "42501") throw new Error("Seu perfil não é responsável por esta solicitação.");
    throw new Error(error.message || "Não foi possível atualizar a solicitação.");
  }

  revalidatePath("/solicitacoes");
  revalidatePath("/dashboard");
  revalidatePath("/portal-obreiro");
  return { ok: true };
}
