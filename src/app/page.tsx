const indicadores = [
  { titulo: "Obreiros cadastrados", valor: "8", detalhe: "Base inicial" },
  { titulo: "Mensalidades", valor: "R$ 0,00", detalhe: "Controle da tesouraria" },
  { titulo: "Presenças", valor: "0%", detalhe: "Frequência geral" },
  { titulo: "Pendências", valor: "0", detalhe: "Secretaria e gestão" },
];

const modulos = [
  "Dashboard",
  "Obreiros",
  "Tesouraria",
  "Chancelaria",
  "Secretaria",
  "Atas e Balaústres",
  "Agenda",
  "Prestação de Contas",
  "Administração",
];

const obreiros = [
  {
    nome: "Eduardo",
    grau: "Mestre Maçom",
    cargo: "Venerável Mestre",
    situacao: "Ativo",
    contato: "-",
  },
  {
    nome: "Marcus Brasil",
    grau: "Mestre Maçom",
    cargo: "Secretário",
    situacao: "Ativo",
    contato: "-",
  },
  {
    nome: "Hermon",
    grau: "Mestre Maçom",
    cargo: "1º Vigilante",
    situacao: "Ativo",
    contato: "-",
  },
  {
    nome: "Rafael",
    grau: "Mestre Maçom",
    cargo: "2º Vigilante",
    situacao: "Ativo",
    contato: "-",
  },
  {
    nome: "Sadala",
    grau: "Mestre Maçom",
    cargo: "Tesoureiro",
    situacao: "Ativo",
    contato: "-",
  },
  {
    nome: "Felipe",
    grau: "Aprendiz Maçom",
    cargo: "Obreiro",
    situacao: "Ativo",
    contato: "-",
  },
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
              Novo Obreiro
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

          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-bold">Cadastro de Obreiros</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Primeira base do sistema para organizar irmãos, cargos, grau,
                  situação e contato.
                </p>
              </div>

              <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-2 text-sm text-emerald-300">
                Módulo em construção
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.06] text-zinc-300">
                  <tr>
                    <th className="px-5 py-4">Nome</th>
                    <th className="px-5 py-4">Grau</th>
                    <th className="px-5 py-4">Cargo</th>
                    <th className="px-5 py-4">Situação</th>
                    <th className="px-5 py-4">Contato</th>
                  </tr>
                </thead>

                <tbody>
                  {obreiros.map((obreiro) => (
                    <tr
                      key={obreiro.nome}
                      className="border-t border-white/10 transition hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-4 font-semibold text-white">
                        {obreiro.nome}
                      </td>
                      <td className="px-5 py-4 text-zinc-300">
                        {obreiro.grau}
                      </td>
                      <td className="px-5 py-4 text-zinc-300">
                        {obreiro.cargo}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          {obreiro.situacao}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-zinc-400">
                        {obreiro.contato}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}