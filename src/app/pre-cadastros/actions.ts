"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { statusPreCadastro, type StatusPreCadastro } from "@/lib/pre-cadastro-validacao";

type Contexto = { userId: string; perfil: string; pre: Record<string, unknown> };

async function contexto(preCadastroId: string): Promise<Contexto> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão inválida.");
  const admin = createAdminClient();
  const [{ data: perfil }, { data: pre }] = await Promise.all([
    admin.from("profiles").select("perfil,status").eq("id", user.id).maybeSingle(),
    admin.from("pre_cadastros_obreiro").select("*").eq("id", preCadastroId).maybeSingle(),
  ]);
  if (!perfil || perfil.status !== "ativo" || !pre) throw new Error("Pré-cadastro não encontrado.");
  if (perfil.perfil !== "Administrador") {
    if (perfil.perfil !== "Venerável Mestre") throw new Error("Seu perfil não pode avaliar pré-cadastros.");
    const { data: vinculo } = await admin.from("loja_usuarios").select("usuario_id").eq("usuario_id", user.id).eq("loja_id", pre.loja_id).eq("status", "ativo").maybeSingle();
    if (!vinculo) throw new Error("Pré-cadastro não encontrado.");
  }
  return { userId: user.id, perfil: perfil.perfil, pre };
}

async function evento(pre: Record<string, unknown>, userId: string, acao: string, resultado: "permitido" | "bloqueado" | "erro", detalhes: Record<string, unknown> = {}) {
  await createAdminClient().from("pre_cadastros_eventos").insert({ loja_id: pre.loja_id, pre_cadastro_id: pre.id, usuario_id: userId, acao, resultado, detalhes });
}

export async function registrarVisualizacaoPreCadastro(id: string) {
  const ctx = await contexto(id);
  await evento(ctx.pre, ctx.userId, "pré-cadastro visualizado", "permitido");
}

export async function alterarStatusPreCadastro(input: { id: string; status: StatusPreCadastro; parecer: string }) {
  if (!statusPreCadastro.includes(input.status) || input.status === "Convertido em Obreiro") throw new Error("Status inválido para esta ação.");
  const ctx = await contexto(input.id);
  const parecer = input.parecer.trim();
  if (["Recusado", "Correção solicitada"].includes(input.status) && parecer.length < 5) throw new Error("Informe uma orientação ou justificativa com pelo menos 5 caracteres.");
  const admin = createAdminClient();
  const { error } = await admin.from("pre_cadastros_obreiro").update({ status: input.status, parecer_administrativo: parecer || null, avaliado_por: ctx.userId, avaliado_em: new Date().toISOString() }).eq("id", input.id).eq("loja_id", ctx.pre.loja_id);
  if (error) throw new Error("Não foi possível atualizar a avaliação.");
  const acao = input.status === "Aprovado" ? "aprovado" : input.status === "Recusado" ? "recusado" : input.status === "Correção solicitada" ? "correção solicitada" : "status alterado";
  await evento(ctx.pre, ctx.userId, acao, "permitido", { status: input.status, parecerInformado: Boolean(parecer) });
  revalidatePath("/pre-cadastros");
}

const grauObreiro = (grau: unknown) => grau === "Aprendiz" ? "Aprendiz Maçom" : grau === "Companheiro" ? "Companheiro Maçom" : grau === "Mestre" || grau === "Mestre Instalado" ? "Mestre Maçom" : "Não informado";

export async function converterPreCadastro(input: { id: string; obreiroExistenteId?: string }) {
  const ctx = await contexto(input.id);
  if (ctx.pre.status !== "Aprovado") throw new Error("Aprove o pré-cadastro antes de converter.");
  const admin = createAdminClient();
  const lojaId = String(ctx.pre.loja_id);
  const email = String(ctx.pre.email || "").toLowerCase();
  const cim = String(ctx.pre.cim || "");
  const cpf = String(ctx.pre.cpf || "");
  const consultas = await Promise.all([
    email ? admin.from("obreiros").select("id,nome,email,cim,cpf").eq("loja_id", lojaId).ilike("email", email) : Promise.resolve({ data: [] }),
    cim ? admin.from("obreiros").select("id,nome,email,cim,cpf").eq("loja_id", lojaId).ilike("cim", cim) : Promise.resolve({ data: [] }),
    cpf ? admin.from("obreiros").select("id,nome,email,cim,cpf").eq("loja_id", lojaId).eq("cpf", cpf) : Promise.resolve({ data: [] }),
  ]);
  const duplicados = Array.from(new Map(consultas.flatMap((item) => item.data ?? []).map((item) => [item.id, item])).values());
  if (duplicados.length && !input.obreiroExistenteId) return { convertido: false as const, duplicados };

  let obreiroId = input.obreiroExistenteId || "";
  if (obreiroId) {
    const existente = duplicados.find((item) => item.id === obreiroId);
    if (!existente) throw new Error("O Obreiro selecionado não corresponde à duplicidade encontrada.");
    const { data: atual } = await admin.from("obreiros").select("*").eq("id", obreiroId).eq("loja_id", lojaId).single();
    const { error } = await admin.from("obreiros").update({
      nome_preferido: atual.nome_preferido || ctx.pre.nome_preferido || null, telefone: atual.telefone || ctx.pre.telefone || null,
      email: atual.email || email || null, cpf: atual.cpf || cpf || null, data_nascimento: atual.data_nascimento || ctx.pre.data_nascimento || null,
      cim: atual.cim || cim || null, loja_origem: atual.loja_origem || ctx.pre.loja_origem || null, oriente: atual.oriente || ctx.pre.oriente || null,
      potencia: atual.potencia || ctx.pre.potencia || null, cargo: atual.cargo || ctx.pre.cargo_funcao || null,
    }).eq("id", obreiroId).eq("loja_id", lojaId);
    if (error) throw new Error("Não foi possível vincular e complementar o cadastro existente.");
  } else {
    const { data: criado, error } = await admin.from("obreiros").insert({
      loja_id: lojaId, nome: ctx.pre.nome_completo, nome_preferido: ctx.pre.nome_preferido || null,
      email: email || null, telefone: ctx.pre.telefone || null, cpf: cpf || null, data_nascimento: ctx.pre.data_nascimento || null,
      cim: cim || null, grau: grauObreiro(ctx.pre.grau), cargo: ctx.pre.cargo_funcao || null,
      situacao: ["Licenciado", "Em processo de retorno"].includes(String(ctx.pre.situacao_informada)) ? "Inativo" : "Ativo",
      tipo: ctx.pre.situacao_informada === "Visitante" ? "Visitante" : "Obreiro da Loja",
      loja_origem: ctx.pre.loja_origem || null, oriente: ctx.pre.oriente || null, potencia: ctx.pre.potencia || null,
      observacoes: ctx.pre.observacoes || null,
    }).select("id").single();
    if (error || !criado) throw new Error(error?.message || "Não foi possível criar o Obreiro.");
    obreiroId = criado.id;
  }
  const { error: atualizarErro } = await admin.from("pre_cadastros_obreiro").update({ status: "Convertido em Obreiro", obreiro_id_criado: obreiroId, avaliado_por: ctx.userId, avaliado_em: new Date().toISOString() }).eq("id", input.id).eq("loja_id", lojaId);
  if (atualizarErro) throw new Error("O Obreiro foi salvo, mas não foi possível concluir o pré-cadastro.");
  await evento(ctx.pre, ctx.userId, "convertido em Obreiro", "permitido", { obreiroId, vinculouExistente: Boolean(input.obreiroExistenteId) });
  revalidatePath("/pre-cadastros"); revalidatePath("/obreiros");
  return { convertido: true as const, obreiroId };
}
