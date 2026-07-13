"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function validarSenha(senha: string, confirmacao: string) {
  if (senha !== confirmacao) throw new Error("A confirmação da nova senha não confere.");
  if (senha.length < 8 || !/[a-z]/.test(senha) || !/[A-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    throw new Error("Use ao menos 8 caracteres, com letra maiúscula, minúscula e número.");
  }
}

export async function alterarSenhaObrigatoria(input: { senha: string; confirmacao: string }) {
  validarSenha(input.senha, input.confirmacao);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
  const admin = createAdminClient();
  const { data: perfil } = await admin.from("profiles").select("perfil,status").eq("id", user.id).maybeSingle();
  if (!perfil || perfil.status !== "ativo") throw new Error("Seu acesso não está ativo.");
  const { data: vinculos, error: consultaError } = await admin.from("loja_usuarios")
    .select("loja_id,obreiro_id,acesso_portal_obreiro,deve_trocar_senha")
    .eq("usuario_id", user.id).eq("status", "ativo");
  if (consultaError || !vinculos?.length) throw new Error("Nenhum vínculo ativo foi localizado.");
  if (!vinculos.some((v) => v.deve_trocar_senha)) throw new Error("Não há troca obrigatória pendente.");

  const { error: senhaError } = await supabase.auth.updateUser({ password: input.senha });
  if (senhaError) throw new Error("Não foi possível atualizar a senha. Revise os requisitos e tente novamente.");
  const { error: flagError } = await admin.from("loja_usuarios").update({ deve_trocar_senha: false }).eq("usuario_id", user.id).eq("status", "ativo");
  if (flagError) throw new Error("A senha foi atualizada, mas a liberação do acesso falhou. Procure o Administrador.");

  for (const vinculo of vinculos) {
    const { error } = await supabase.rpc("registrar_evento_seguranca", {
      alvo_loja: vinculo.loja_id, modulo: "/alterar-senha", acao: "trocar_senha",
      resultado: "permitido", descricao: "Usuário concluiu a troca obrigatória de senha.", motivo: null,
    });
    if (error) throw new Error("A senha foi atualizada, mas a auditoria não pôde ser registrada.");
  }
  const temPortal = vinculos.some((v) => v.acesso_portal_obreiro && v.obreiro_id);
  return perfil.perfil === "Obreiro" && temPortal ? "/portal-obreiro" : "/dashboard";
}
