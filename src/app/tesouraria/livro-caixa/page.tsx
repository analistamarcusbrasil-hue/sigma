import { AppShell } from "@/components/AppShell";
import { LivroCaixaClient } from "@/components/LivroCaixaClient";
import Link from "next/link";

export default function LivroCaixaPage() {
  return <AppShell secao="Tesouraria" titulo="Livro Caixa" subtitulo="Controle oficial, auditável e vinculado à gestão atual." acao={<Link href="/relatorios" className="rounded-xl bg-amber-400 px-4 py-2 font-bold text-black">Relatório PDF</Link>}><LivroCaixaClient/></AppShell>;
}
