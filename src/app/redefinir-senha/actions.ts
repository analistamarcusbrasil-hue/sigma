"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function ativarPerfilAposDefinirSenha() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("O link perdeu a validade. Solicite um novo link de acesso.");

  const admin = createAdminClient();
  const { data: perfil, error: consultaError } = await admin.from("profiles").select("status,perfil").eq("id", user.id).maybeSingle();
  if (consultaError || !perfil) throw new Error("Não foi possível localizar seu cadastro.");
  if (perfil.status === "suspenso" || perfil.status === "revogado") throw new Error("Este acesso está suspenso ou revogado. Fale com o administrador.");

  const agora = new Date().toISOString();
  const { error: perfilError } = await admin.from("profiles").update({ status: "ativo", ativado_em: agora }).eq("id", user.id);
  if (perfilError) throw new Error("A senha foi salva, mas não foi possível ativar o acesso.");
  const { data: vinculos, error: vinculoError } = await admin.from("loja_usuarios").update({
    status: "ativo", deve_trocar_senha: false,
  }).eq("usuario_id", user.id).in("status", ["convite_enviado", "ativo"]).select("loja_id,obreiro_id");
  if (vinculoError) throw new Error("A senha foi salva, mas o vínculo com a Loja não pôde ser ativado.");

  if (perfil.perfil === "Obreiro") {
    const { error } = await admin.from("loja_usuarios").update({
      acesso_portal_obreiro: true, permissoes: ["/portal-obreiro"],
    }).eq("usuario_id", user.id).eq("status", "ativo").not("obreiro_id", "is", null);
    if (error) throw new Error("A senha foi salva, mas o Portal não pôde ser liberado.");
  }

  for (const vinculo of vinculos ?? []) {
    const { error } = await supabase.rpc("registrar_evento_seguranca", {
      alvo_loja: vinculo.loja_id, modulo: "/redefinir-senha", acao: "ativar_acesso",
      resultado: "permitido", descricao: "Usuário definiu a senha pelo link e ativou o acesso.", motivo: null,
    });
    if (error) throw new Error("O acesso foi ativado, mas a auditoria não pôde ser registrada.");
  }
}
