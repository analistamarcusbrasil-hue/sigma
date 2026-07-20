import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { UsuariosClient } from "@/components/UsuariosClient";
import type { PerfilSigma } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ obreiroId?: string; preCadastroId?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: perfil } = await admin.from("profiles").select("perfil, status").eq("id", user.id).maybeSingle();
  if (!perfil || perfil.perfil !== "Administrador" || perfil.status !== "ativo") redirect("/dashboard");
  const { data } = await admin.from("profiles").select("*").order("nome");
  const params = await searchParams;
  return <AppShell secao="Administração" titulo="Usuários e Acessos" subtitulo="Convide usuários, vincule-os a obreiros e mantenha permissões centralizadas." acao={<Link href="/usuarios/desbloqueios" className="rounded-xl border border-amber-400/30 px-4 py-3 text-amber-200">Desbloqueios administrativos</Link>}><UsuariosClient usuarios={(data ?? []) as PerfilSigma[]} obreiroInicialId={params.obreiroId || ""} preCadastroId={params.preCadastroId || ""} /></AppShell>;
}
