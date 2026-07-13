"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function ativarPerfilAposDefinirSenha() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("O link perdeu a validade. Solicite um novo link de acesso.");

  const admin = createAdminClient();
  const { data: perfil, error: consultaError } = await admin.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (consultaError || !perfil) throw new Error("Não foi possível localizar seu cadastro.");
  if (perfil.status === "suspenso" || perfil.status === "revogado") throw new Error("Este acesso está suspenso ou revogado. Fale com o administrador.");

  const agora = new Date().toISOString();
  const { error: perfilError } = await admin.from("profiles").update({ status: "ativo", ativado_em: agora }).eq("id", user.id);
  if (perfilError) throw new Error("A senha foi salva, mas não foi possível ativar o acesso.");
  const { error: vinculoError } = await admin.from("loja_usuarios").update({ status: "ativo" }).eq("usuario_id", user.id).in("status", ["convite_enviado", "ativo"]);
  if (vinculoError) throw new Error("A senha foi salva, mas o vínculo com a Loja não pôde ser ativado.");
}
