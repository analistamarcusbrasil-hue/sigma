import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { indicadores, modulos } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <AppShell
      secao="Dashboard"
      titulo="Painel Geral da Loja"
      subtitulo="Visão geral para acompanhamento da Secretaria, Tesouraria, Chancelaria e Administração."
    >
      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((item) => (
          <article key={item.titulo} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-zinc-400">{item.titulo}</p>
            <h3 className="mt-3 text-3xl font-bold text-amber-300">{item.valor}</h3>
            <p className="mt-2 text-sm text-zinc-500">{item.detalhe}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Módulos do SIGMA LUMP</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Acesse cada área de controle da Loja.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modulos
            .filter((modulo) => modulo.href !== "/dashboard")
            .map((modulo) => (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="rounded-2xl border border-white/10 bg-[#0D111A] p-5 transition hover:border-amber-400/50 hover:bg-amber-400/10"
              >
                <p className="font-bold text-white">{modulo.nome}</p>
                <p className="mt-2 text-sm text-zinc-400">Abrir módulo</p>
              </Link>
            ))}
        </div>
      </section>
    </AppShell>
  );
}
