import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PreCadastrosAdminClient } from "@/components/PreCadastrosAdminClient";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PreCadastroAdmin } from "@/lib/pre-cadastro-admin";

export const dynamic = "force-dynamic";

export default async function PreCadastrosPage() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: perfil } = await admin.from("profiles").select("perfil,status").eq("id", user.id).maybeSingle();
  if (!perfil || perfil.status !== "ativo" || !["Administrador", "Venerável Mestre"].includes(perfil.perfil)) {
    const { data: vinculo } = await admin.from("loja_usuarios").select("loja_id").eq("usuario_id", user.id).eq("status", "ativo").limit(1).maybeSingle();
    await admin.from("pre_cadastros_eventos").insert({ loja_id: vinculo?.loja_id || null, usuario_id: user.id, acao: "tentativa de acesso sem permissão", resultado: "bloqueado", detalhes: { rota: "/pre-cadastros" } });
    redirect("/dashboard");
  }
  let consulta = admin.from("pre_cadastros_obreiro").select("*,lojas(id,nome,numero)").order("criado_em", { ascending: false });
  if (perfil.perfil !== "Administrador") {
    const { data: vinculos } = await admin.from("loja_usuarios").select("loja_id").eq("usuario_id", user.id).eq("status", "ativo");
    consulta = consulta.in("loja_id", (vinculos ?? []).map((item) => item.loja_id));
  }
  const { data } = await consulta;
  const itens: PreCadastroAdmin[] = (data ?? []).map((item) => { const loja = item.lojas as unknown as { nome: string; numero: string | null }; return {
    id: item.id, protocolo: item.protocolo, lojaId: item.loja_id, lojaNome: loja?.nome || "Loja", lojaNumero: loja?.numero || "",
    nomeCompleto: item.nome_completo, nomePreferido: item.nome_preferido || "", email: item.email, telefone: item.telefone,
    cpf: item.cpf || "", dataNascimento: item.data_nascimento || "", cim: item.cim, grau: item.grau, situacao: item.situacao_informada,
    lojaOrigem: item.loja_origem || "", oriente: item.oriente || "", potencia: item.potencia || "", cargoFuncao: item.cargo_funcao || "",
    observacoes: item.observacoes || "", status: item.status, parecer: item.parecer_administrativo || "", avaliadoEm: item.avaliado_em || "",
    obreiroId: item.obreiro_id_criado || "", usuarioId: item.usuario_id_criado || "", criadoEm: item.criado_em, atualizadoEm: item.atualizado_em,
  }; });
  return <AppShell secao="Administração" titulo="Pré-cadastros de Obreiros" subtitulo="Avalie solicitações públicas, detecte duplicidades e converta dados aprovados sem liberar acesso automaticamente."><PreCadastrosAdminClient itens={itens} podeCriarUsuario={perfil.perfil === "Administrador"} /></AppShell>;
}
