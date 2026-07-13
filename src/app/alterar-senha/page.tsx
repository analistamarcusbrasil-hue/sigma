import { redirect } from "next/navigation";
import { AlterarSenhaClient } from "@/components/AlterarSenhaClient";
import { createClient } from "@/lib/supabase/server";

export default async function AlterarSenhaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <AlterarSenhaClient />;
}
