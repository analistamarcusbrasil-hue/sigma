import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type LojaPublicaPreCadastro = { id: string; nome: string; numero: string };

export async function listarLojasPublicasPreCadastro(): Promise<LojaPublicaPreCadastro[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("lojas").select("id,nome,numero").eq("ativa", true).order("nome");
  if (error) throw new Error("Não foi possível carregar as Lojas disponíveis.");
  return (data ?? []).map((loja) => ({ id: loja.id, nome: loja.nome, numero: loja.numero ?? "" }));
}
