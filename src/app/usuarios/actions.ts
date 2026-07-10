"use server";

import { revalidatePath } from "next/cache";
import { permissoesPadrao, type PerfilUsuario, type StatusPerfil } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const perfis: PerfilUsuario[] = ["Administrador", "Venerável Mestre", "Secretário", "Tesoureiro", "Chanceler", "Obreiro"];

async function administradorAtual() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão inválida.");
  const admin = createAdminClient();
  const { data: perfil } = await admin.from("profiles").select("perfil, status").eq("id", user.id).maybeSingle();
  if (!perfil || perfil.perfil !== "Administrador" || perfil.status !== "ativo") throw new Error("Apenas administradores podem gerenciar usuários.");
  return user.id;
}

function siteUrl() { return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"; }

export async function convidarUsuario(input: { nome: string; email: string; perfil: PerfilUsuario; obreiroId?: string | null; permissoes?: string[] }) {
  await administradorAtual();
  const nome = input.nome.trim(); const email = input.email.trim().toLowerCase();
  if (!nome || !email || !perfis.includes(input.perfil)) throw new Error("Informe nome, e-mail e perfil válidos.");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${siteUrl()}/auth/confirm?next=/redefinir-senha`, data: { nome } });
  if (error || !data.user) throw new Error(error?.message ?? "Não foi possível enviar o convite.");
  const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, nome, email, perfil: input.perfil, obreiro_id: input.obreiroId || null, status: "convite_enviado", permissoes: input.permissoes?.length ? input.permissoes : permissoesPadrao(input.perfil), convite_enviado_em: new Date().toISOString() });
  if (profileError) throw new Error(profileError.message);
  revalidatePath("/usuarios");
}

export async function atualizarUsuario(input: { id: string; nome: string; perfil: PerfilUsuario; obreiroId?: string | null; permissoes: string[] }) {
  await administradorAtual();
  if (!input.nome.trim() || !perfis.includes(input.perfil)) throw new Error("Dados de usuário inválidos.");
  const { error } = await createAdminClient().from("profiles").update({ nome: input.nome.trim(), perfil: input.perfil, obreiro_id: input.obreiroId || null, permissoes: input.permissoes }).eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}

export async function alterarStatusUsuario(id: string, status: StatusPerfil) {
  const idAtual = await administradorAtual();
  if (id === idAtual) throw new Error("Não é permitido alterar o próprio acesso.");
  const { error } = await createAdminClient().from("profiles").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}

export async function reenviarConvite(email: string) {
  await administradorAtual();
  const { error } = await createAdminClient().auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/confirm?next=/redefinir-senha` });
  if (error) throw new Error(error.message);
  await createAdminClient().from("profiles").update({ convite_enviado_em: new Date().toISOString(), status: "convite_enviado" }).eq("email", email);
  revalidatePath("/usuarios");
}
