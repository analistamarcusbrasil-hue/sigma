import { AppShell } from "@/components/AppShell";
import { PrestacaoContasClient } from "@/components/PrestacaoContasClient";
import { FechamentosResumoClient } from "@/components/FechamentosResumoClient";
import Link from "next/link";

export default function PrestacaoContasPage() {
  return (
    <AppShell
      secao="Prestação de Contas"
      titulo="Prestação de Contas"
      subtitulo="Relatório mensal e anual com receitas, despesas, custos fixos, saldo, inadimplência e decisões financeiras da Loja."
    >
      <PrestacaoContasClient />
      <FechamentosResumoClient completo />
      <section className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/[.06] p-6"><h2 className="text-xl font-black">Prestação Final de Mandato</h2><p className="mt-2 text-sm text-zinc-300">Consolide os fechamentos mensais, Livro Caixa, mensalidades, Tronco e pendências da gestão.</p><Link href="/prestacao-contas/final" className="mt-4 inline-flex rounded-xl bg-amber-400 px-5 py-3 font-bold text-black">Elaborar Prestação Final</Link></section>
    </AppShell>
  );
}
