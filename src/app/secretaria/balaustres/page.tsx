import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SecretariaDocumentosClient } from "@/components/SecretariaDocumentosClient";

export default function BalaustresPage() {
  return <AppShell secao="Secretaria" titulo="Balaústres" subtitulo="Registre Sessões Ordinárias e Magnas com revisão, aprovação, assinaturas e PDF institucional." acao={<Link href="/secretaria/atas-administrativas" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300">Ver Atas Administrativas</Link>}><SecretariaDocumentosClient categoria="Balaústre" /></AppShell>;
}

