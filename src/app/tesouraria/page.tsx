import { AppShell } from "@/components/AppShell";

export default function TesourariaPage() {
  return (
    <AppShell
      secao="Tesouraria"
      titulo="Controle Financeiro"
      subtitulo="Mensalidades, tronco de solidariedade, inadimplência, receitas, despesas e prestação de contas."
    >
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Mensalidade</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">R$ 100</h3>
          <p className="mt-2 text-sm text-zinc-500">Valor padrão mensal por obreiro.</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Tronco</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">Separado</h3>
          <p className="mt-2 text-sm text-zinc-500">Não mistura com mensalidades.</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Status</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">Em construção</h3>
          <p className="mt-2 text-sm text-zinc-500">Próxima etapa funcional.</p>
        </article>
      </section>
    </AppShell>
  );
}
