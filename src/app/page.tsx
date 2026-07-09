const indicadores = [
  { titulo: "Obreiros cadastrados", valor: "0", detalhe: "Cadastro inicial" },
  { titulo: "Mensalidades", valor: "R$ 0,00", detalhe: "Controle da tesouraria" },
  { titulo: "Presenças", valor: "0%", detalhe: "Frequência geral" },
  { titulo: "Pendências", valor: "0", detalhe: "Secretaria e gestão" },
];

const modulos = [
  "Obreiros",
  "Tesouraria",
  "Chancelaria",
  "Secretaria",
  "Atas e Balaústres",
  "Agenda",
  "Prestação de Contas",
  "Administração",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[#0B0F17] p-6 lg:block">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-400">
              SIGMA
            </p>
            <h1 className="mt-3 text-2xl font-bold">LUMP</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Gestão Maçônica Integrada
            </p>
          </div>

          <nav className="mt-10 space-y-2">
            {modulos.map((modulo) => (
              <button
                key={modulo}
                className="w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-300 transition hover:bg-white/10 hover:text-amber-300"
              >
                {modulo}
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex-1 p-6 lg:p-10">
          <header className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-amber-400">
                Dashboard
              </p>
              <h2 className="mt-3 text-4xl font-bold">
                Sistema Integrado de Gestão Maçônica
              </h2>
              <p className="mt-3 max-w-3xl text-zinc-400">
                A∴R∴L∴S∴ Universitária Mensageiros da Paz nº 3934.
                Controle de obreiros, tesouraria, chancelaria, secretaria,
                atas, eventos e prestação de contas.
              </p>
            </div>

            <button className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300">
              Novo registro
            </button>
          </header>

          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {indicadores.map((item) => (
              <article
                key={item.titulo}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <p className="text-sm text-zinc-400">{item.titulo}</p>
                <h3 className="mt-3 text-3xl font-bold text-amber-300">
                  {item.valor}
                </h3>
                <p className="mt-2 text-sm text-zinc-500">{item.detalhe}</p>
              </article>
            ))}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-2xl font-bold">Módulos principais</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Estrutura inicial do sistema para gestão completa da Loja.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {modulos.slice(0, 6).map((modulo) => (
                  <div
                    key={modulo}
                    className="rounded-2xl border border-white/10 bg-[#0D111A] p-5 transition hover:border-amber-400/50"
                  >
                    <h4 className="font-bold text-white">{modulo}</h4>
                    <p className="mt-2 text-sm text-zinc-400">
                      Área em preparação para cadastro, controle e relatórios.
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
              <h3 className="text-2xl font-bold text-amber-300">
                Próxima construção
              </h3>

              <div className="mt-5 space-y-4 text-sm text-zinc-300">
                <p>1. Criar cadastro único de obreiros.</p>
                <p>2. Criar controle mensal da tesouraria.</p>
                <p>3. Criar frequência por sessão na chancelaria.</p>
                <p>4. Criar área da secretaria para atas e balaústres.</p>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-zinc-400">Status do projeto</p>
                <p className="mt-2 text-lg font-bold text-emerald-300">
                  Base inicial criada com sucesso
                </p>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}