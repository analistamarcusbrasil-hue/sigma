"use server";

import { revalidatePath } from "next/cache";
import { permissoesPadrao, type PerfilUsuario, type StatusPerfil } from "@/lib/auth";
import {
  enfileirarAvisoUsuario,
  processarNotificacoesPendentes,
  type EventoEmail,
} from "@/lib/notificacoes-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const perfis: PerfilUsuario[] = ["Administrador", "Venerável Mestre", "Secretário", "Tesoureiro", "Chanceler", "Orador", "Consulta", "Obreiro"];
type ContextoAdmin = { id: string; supabase: Awaited<ReturnType<typeof createClient>> };

function validarSenha(senha: string, confirmacao: string) {
  if (senha !== confirmacao) throw new Error("A confirmação da senha não confere.");
  if (senha.length < 6) throw new Error("A senha informada pelo Administrador deve ter pelo menos 6 caracteres.");
}
function permissoesDoPerfil(perfil: PerfilUsuario, permissoes?: string[]) {
  return perfil === "Obreiro" ? ["/portal-obreiro"] : (permissoes?.length ? permissoes : permissoesPadrao(perfil));
}
function validarPortal(perfil: PerfilUsuario, obreiroId?: string | null, acessoPortal = false) {
  const acesso = acessoPortal;
  if (acesso && !obreiroId) throw new Error("Para liberar o Portal, vincule um Obreiro da Loja ativa.");
  return acesso;
}
async function registrarUsuarioDoPreCadastro(input: { preCadastroId?: string; lojaId: string; obreiroId?: string | null; usuarioId: string; criadoPor: string }) {
  if (!input.preCadastroId) return;
  const admin = createAdminClient();
  const { data: pre } = await admin.from("pre_cadastros_obreiro").select("id,loja_id,obreiro_id_criado,status").eq("id", input.preCadastroId).maybeSingle();
  if (!pre || pre.loja_id !== input.lojaId || pre.obreiro_id_criado !== input.obreiroId || pre.status !== "Convertido em Obreiro") throw new Error("Usuário criado, mas o vínculo com o pré-cadastro precisa ser revisado.");
  const { error } = await admin.from("pre_cadastros_obreiro").update({ usuario_id_criado: input.usuarioId }).eq("id", pre.id).eq("loja_id", input.lojaId);
  if (error) throw new Error("Usuário criado, mas não foi possível concluir o vínculo do pré-cadastro.");
  await admin.from("pre_cadastros_eventos").insert({ loja_id: input.lojaId, pre_cadastro_id: pre.id, usuario_id: input.criadoPor, acao: "usuário criado a partir do pré-cadastro", resultado: "permitido", detalhes: { usuarioId: input.usuarioId, acessoAutomatico: false } });
}
async function protegerUltimoAdministrador(id: string, novoPerfil?: PerfilUsuario, novoStatus?: StatusPerfil) {
  const admin = createAdminClient();
  const { data: alvo } = await admin.from("profiles").select("perfil,status").eq("id", id).single();
  if (alvo?.perfil !== "Administrador" || alvo.status !== "ativo") return;
  if ((novoPerfil && novoPerfil !== "Administrador") || (novoStatus && novoStatus !== "ativo")) {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("perfil", "Administrador").eq("status", "ativo");
    if ((count ?? 0) <= 1) throw new Error("Não é permitido remover ou inativar o último Administrador SIGMA.");
  }
}
async function administradorAtual(): Promise<ContextoAdmin> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão inválida.");
  const admin = createAdminClient();
  const { data: perfil } = await admin.from("profiles").select("perfil,status").eq("id", user.id).maybeSingle();
  if (!perfil || perfil.perfil !== "Administrador" || perfil.status !== "ativo") throw new Error("Apenas administradores podem gerenciar usuários.");
  return { id: user.id, supabase };
}
async function auditar(contexto: ContextoAdmin, lojaId: string, acao: string, descricao: string, motivo?: string | null) {
  const { error } = await contexto.supabase.rpc("registrar_evento_seguranca", {
    alvo_loja: lojaId, modulo: "/usuarios", acao, resultado: "permitido",
    descricao, motivo: motivo?.trim() || null,
  });
  if (error) throw new Error("A operação foi concluída, mas não foi possível registrar a auditoria.");
}
async function localizarUsuarioAuth(email: string) {
  const admin = createAdminClient();
  for (let pagina = 1; pagina <= 50; pagina += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw new Error("Não foi possível consultar os usuários de autenticação.");
    const usuario = data.users.find((item) => item.email?.toLowerCase() === email);
    if (usuario) return usuario;
    if (data.users.length < 200) break;
  }
  return null;
}
function siteUrl() { return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"; }
async function avisarUsuario(
  lojaId: string,
  usuarioId: string,
  evento: EventoEmail,
  dedupeKey: string,
  criadoPor: string,
) {
  const fila = await enfileirarAvisoUsuario({
    lojaId,
    usuarioId,
    evento,
    rotaDestino: "/login",
    dedupeKey,
    criadoPor,
  });
  if (fila.enfileirada && fila.id) {
    await processarNotificacoesPendentes({ ids: [fila.id], limite: 1, usuarioId: criadoPor });
  }
}

export async function convidarUsuario(input: {
  nome: string; email: string; perfil: PerfilUsuario; lojaId: string; obreiroId?: string | null;
  permissoes?: string[]; acessoPortal?: boolean; preCadastroId?: string;
}) {
  const contexto = await administradorAtual();
  const nome = input.nome.trim(), email = input.email.trim().toLowerCase();
  if (!nome || !email || !perfis.includes(input.perfil) || !input.lojaId) throw new Error("Informe nome, e-mail, perfil e Loja válidos.");
  const acessoPortal = validarPortal(input.perfil, input.obreiroId, input.acessoPortal);
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: siteUrl() + "/auth/confirm?next=/redefinir-senha", data: { nome },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Não foi possível enviar o convite.");
  const permissoes = permissoesDoPerfil(input.perfil, input.permissoes);
  if (acessoPortal && !permissoes.includes("/portal-obreiro")) permissoes.push("/portal-obreiro");
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id, nome, email, perfil: input.perfil, obreiro_id: input.obreiroId || null,
    status: "convite_enviado", permissoes, convite_enviado_em: new Date().toISOString(),
  });
  if (profileError) throw new Error(profileError.message);
  const { error: vinculoError } = await admin.from("loja_usuarios").upsert({
    loja_id: input.lojaId, usuario_id: data.user.id,
    papel: input.perfil === "Administrador" ? "administrador" : "membro",
    perfil: input.perfil, status: "convite_enviado", obreiro_id: input.obreiroId || null,
    permissoes, acesso_portal_obreiro: false, deve_trocar_senha: false,
  }, { onConflict: "loja_id,usuario_id" });
  if (vinculoError) throw new Error(vinculoError.message);
  await registrarUsuarioDoPreCadastro({ preCadastroId: input.preCadastroId, lojaId: input.lojaId, obreiroId: input.obreiroId, usuarioId: data.user.id, criadoPor: contexto.id });
  await auditar(contexto, input.lojaId, "convidar", "Convite enviado para " + email + " com perfil " + input.perfil + ".");
  revalidatePath("/usuarios");
}

export async function criarUsuarioComSenhaTemporaria(input: {
  nome: string; email: string; perfil: PerfilUsuario; lojaId: string; obreiroId?: string | null;
  permissoes?: string[]; acessoPortal?: boolean; senhaTemporaria: string; confirmacaoSenha: string;
  obrigarTroca: boolean; motivo: string; preCadastroId?: string;
}) {
  const contexto = await administradorAtual();
  const nome = input.nome.trim(), email = input.email.trim().toLowerCase();
  if (!nome || !email || !perfis.includes(input.perfil) || !input.lojaId) throw new Error("Informe nome, e-mail, perfil e Loja válidos.");
  if (!input.motivo.trim()) throw new Error("Informe o motivo administrativo.");
  validarSenha(input.senhaTemporaria, input.confirmacaoSenha);
  const acessoPortal = validarPortal(input.perfil, input.obreiroId, input.acessoPortal);
  const permissoes = permissoesDoPerfil(input.perfil, input.permissoes);
  if (acessoPortal && !permissoes.includes("/portal-obreiro")) permissoes.push("/portal-obreiro");
  const admin = createAdminClient();
  let usuario = await localizarUsuarioAuth(email);
  const usuarioExistia = Boolean(usuario);
  if (usuario) {
    const { data, error } = await admin.auth.admin.updateUserById(usuario.id, {
      password: input.senhaTemporaria, email_confirm: true, user_metadata: { ...usuario.user_metadata, nome },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Não foi possível atualizar o usuário de autenticação.");
    usuario = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email, password: input.senhaTemporaria, email_confirm: true, user_metadata: { nome },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Não foi possível criar o usuário.");
    usuario = data.user;
  }
  const agora = new Date().toISOString();
  const { error: profileError } = await admin.from("profiles").upsert({
    id: usuario.id, nome, email, perfil: input.perfil, obreiro_id: input.obreiroId || null,
    status: "ativo", permissoes, ativado_em: agora,
  });
  if (profileError) throw new Error(profileError.message);
  const { error: vinculoError } = await admin.from("loja_usuarios").upsert({
    loja_id: input.lojaId, usuario_id: usuario.id,
    papel: input.perfil === "Administrador" ? "administrador" : "membro",
    perfil: input.perfil, status: "ativo", obreiro_id: input.obreiroId || null,
    permissoes, acesso_portal_obreiro: acessoPortal, deve_trocar_senha: input.obrigarTroca,
    senha_temporaria_definida_em: agora, senha_temporaria_definida_por: contexto.id,
  }, { onConflict: "loja_id,usuario_id" });
  if (vinculoError) throw new Error(vinculoError.message);
  await registrarUsuarioDoPreCadastro({ preCadastroId: input.preCadastroId, lojaId: input.lojaId, obreiroId: input.obreiroId, usuarioId: usuario.id, criadoPor: contexto.id });
  await auditar(contexto, input.lojaId, usuarioExistia ? "senha_temporaria_atualizar" : "senha_temporaria_criar",
    "Senha temporária definida para " + email + "; troca obrigatória: " + (input.obrigarTroca ? "sim." : "não."), input.motivo);
  await avisarUsuario(
    input.lojaId,
    usuario.id,
    "Senha definida pelo Administrador",
    "senha-definida:" + input.lojaId + ":" + usuario.id + ":" + agora,
    contexto.id,
  );
  if (acessoPortal) {
    await avisarUsuario(
      input.lojaId,
      usuario.id,
      "Acesso ao Portal liberado",
      "portal-liberado:" + input.lojaId + ":" + usuario.id + ":" + agora,
      contexto.id,
    );
  }
  revalidatePath("/usuarios");
}

export async function definirSenhaTemporaria(input: {
  usuarioId: string; lojaId: string; senhaTemporaria: string; confirmacaoSenha: string;
  obrigarTroca: boolean; motivo: string;
}) {
  const contexto = await administradorAtual();
  if (!input.usuarioId || !input.lojaId || !input.motivo.trim()) throw new Error("Informe usuário, Loja e motivo administrativo.");
  validarSenha(input.senhaTemporaria, input.confirmacaoSenha);
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.updateUserById(input.usuarioId, { password: input.senhaTemporaria });
  if (error || !data.user) throw new Error(error?.message ?? "Não foi possível definir a senha temporária.");
  const agora = new Date().toISOString();
  const { error: vinculoError } = await admin.from("loja_usuarios").update({
    deve_trocar_senha: input.obrigarTroca, senha_temporaria_definida_em: agora,
    senha_temporaria_definida_por: contexto.id,
  }).eq("loja_id", input.lojaId).eq("usuario_id", input.usuarioId);
  if (vinculoError) throw new Error(vinculoError.message);
  await auditar(contexto, input.lojaId, "senha_temporaria_redefinir",
    "Senha temporária redefinida para o usuário " + input.usuarioId + "; troca obrigatória: " + (input.obrigarTroca ? "sim." : "não."), input.motivo);
  await avisarUsuario(
    input.lojaId,
    input.usuarioId,
    "Senha definida pelo Administrador",
    "senha-redefinida:" + input.lojaId + ":" + input.usuarioId + ":" + agora,
    contexto.id,
  );
  revalidatePath("/usuarios");
}

export async function atualizarUsuario(input: {
  id: string; nome: string; perfil: PerfilUsuario; lojaId: string; obreiroId?: string | null;
  permissoes: string[]; acessoPortal?: boolean;
}) {
  const contexto = await administradorAtual();
  await protegerUltimoAdministrador(input.id, input.perfil);
  if (!input.nome.trim() || !perfis.includes(input.perfil) || !input.lojaId) throw new Error("Dados de usuário inválidos.");
  const acessoPortal = validarPortal(input.perfil, input.obreiroId, input.acessoPortal);
  const permissoes = permissoesDoPerfil(input.perfil, input.permissoes);
  if (acessoPortal && !permissoes.includes("/portal-obreiro")) permissoes.push("/portal-obreiro");
  const admin = createAdminClient();
  const { data: vinculoAtual } = await admin.from("loja_usuarios").select("obreiro_id,acesso_portal_obreiro").eq("loja_id", input.lojaId).eq("usuario_id", input.id).maybeSingle();
  if (input.id === contexto.id && (vinculoAtual?.obreiro_id ?? null) !== (input.obreiroId ?? null)) throw new Error("Não é permitido alterar o próprio vínculo com Obreiro.");
  const { error } = await admin.from("profiles").update({ nome: input.nome.trim(), perfil: input.perfil, permissoes }).eq("id", input.id);
  if (error) throw new Error(error.message);
  const { error: vinculoError } = await admin.from("loja_usuarios").upsert({
    loja_id: input.lojaId, usuario_id: input.id,
    papel: input.perfil === "Administrador" ? "administrador" : "membro",
    perfil: input.perfil, status: "ativo", obreiro_id: input.obreiroId || null,
    permissoes, acesso_portal_obreiro: acessoPortal,
  }, { onConflict: "loja_id,usuario_id" });
  if (vinculoError) throw new Error(vinculoError.message);
  await auditar(contexto, input.lojaId, "editar",
    "Acesso do usuário " + input.id + " atualizado; perfil " + input.perfil + "; Portal: " + (acessoPortal ? "liberado." : "bloqueado."));
  if (acessoPortal && !vinculoAtual?.acesso_portal_obreiro) {
    const agora = new Date().toISOString();
    await avisarUsuario(
      input.lojaId,
      input.id,
      "Acesso ao Portal liberado",
      "portal-liberado:" + input.lojaId + ":" + input.id + ":" + agora,
      contexto.id,
    );
  }
  revalidatePath("/usuarios");
}

export async function alterarStatusUsuario(id: string, status: StatusPerfil) {
  const contexto = await administradorAtual();
  if (id === contexto.id) throw new Error("Não é permitido alterar o próprio acesso.");
  await protegerUltimoAdministrador(id, undefined, status);
  const admin = createAdminClient();
  const { data: perfil } = await admin.from("profiles").select("perfil").eq("id", id).maybeSingle();
  const { error } = await admin.from("profiles").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  const { data: vinculos, error: consultaError } = await admin.from("loja_usuarios").select("loja_id,obreiro_id").eq("usuario_id", id);
  if (consultaError) throw new Error(consultaError.message);
  for (const vinculo of vinculos ?? []) {
    const acessoPortal = status === "ativo" && perfil?.perfil === "Obreiro" && Boolean(vinculo.obreiro_id);
    const { error: vinculoError } = await admin.from("loja_usuarios").update({ status, acesso_portal_obreiro: acessoPortal }).eq("loja_id", vinculo.loja_id).eq("usuario_id", id);
    if (vinculoError) throw new Error(vinculoError.message);
    await auditar(contexto, vinculo.loja_id, "alterar_status", "Status do usuário " + id + " alterado para " + status + ".");
  }
  revalidatePath("/usuarios");
}

export async function reenviarConvite(email: string) {
  const contexto = await administradorAtual();
  const emailNormalizado = email.trim().toLowerCase();
  const { error } = await createAdminClient().auth.resetPasswordForEmail(emailNormalizado, {
    redirectTo: siteUrl() + "/auth/confirm?next=/redefinir-senha",
  });
  if (error) throw new Error(error.message);
  const admin = createAdminClient();
  await admin.from("profiles").update({ convite_enviado_em: new Date().toISOString(), status: "convite_enviado" }).eq("email", emailNormalizado);
  const { data: perfil } = await admin.from("profiles").select("id").eq("email", emailNormalizado).maybeSingle();
  if (perfil) {
    const { data: vinculos } = await admin.from("loja_usuarios").select("loja_id").eq("usuario_id", perfil.id);
    for (const vinculo of vinculos ?? []) await auditar(contexto, vinculo.loja_id, "reenviar_convite", "Link de redefinição enviado para " + emailNormalizado + ".");
  }
  revalidatePath("/usuarios");
}
