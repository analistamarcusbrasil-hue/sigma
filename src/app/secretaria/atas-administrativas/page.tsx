import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SecretariaDocumentosClient } from "@/components/SecretariaDocumentosClient";
export default function AtasAdministrativasPage() { return <AppShell secao="Secretaria" titulo="Atas Administrativas" subtitulo="Reuniões administrativas, Diretoria e documentos avulsos com deliberações, responsáveis e prazos." acao={<Link href="/secretaria/balaustres" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300">Ver Balaústres</Link>}><SecretariaDocumentosClient categoria="Ata Administrativa" /></AppShell>; }

