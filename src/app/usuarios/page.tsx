import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { UsuariosClient } from "@/components/UsuariosClient";
import type { PerfilSigma } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: perfil } = await admin.from("profiles").select("perfil, status").eq("id", user.id).maybeSingle();
  if (!perfil || perfil.perfil !== "Administrador" || perfil.status !== "ativo") redirect("/dashboard");
  const { data } = await admin.from("profiles").select("*").order("nome");
  return <AppShell secao="Administração" titulo="Usuários e Acessos" subtitulo="Convide usuários, vincule-os a obreiros e mantenha permissões centralizadas."><UsuariosClient usuarios={(data ?? []) as PerfilSigma[]} /></AppShell>;
}
