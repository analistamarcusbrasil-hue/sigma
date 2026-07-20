import { AppShell } from "@/components/AppShell";
import { TesourariaClient } from "@/components/TesourariaClient";
import Link from "next/link";

export default function TesourariaPage() {
  return (
    <AppShell
      secao="Tesouraria"
      titulo="Controle Financeiro"
      subtitulo="Mensalidades por vigência, tronco de solidariedade, receitas, despesas, inadimplência e saldo geral da Loja."
      acao={<Link href="/relatorios" className="rounded-xl bg-amber-400 px-4 py-2 font-bold text-black">Relatórios PDF</Link>}
    >
      <TesourariaClient />
    </AppShell>
  );
}
