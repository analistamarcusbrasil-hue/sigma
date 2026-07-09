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

const indicadores = [
  {
    titulo: "Balaústres",
    valor: "10",
    detalhe: "Atas registradas em 2026",
  },
  {
    titulo: "Pendências",
    valor: "4",
    detalhe: "Ações aguardando conclusão",
  },
  {
    titulo: "Peças",
    valor: "3",
    detalhe: "Arquiteturas em controle",
  },
  {
    titulo: "Processos",
    valor: "2",
    detalhe: "Admissão e acompanhamento",
  },
];

const balaustres = [
  {
    numero: "08/2026",
    data: "06/06/2026",
    tipo: "Sessão Ordinária",
    grau: "Aprendiz Maçom",
    status: "Concluído",
  },
  {
    numero: "09/2026",
    data: "20/06/2026",
    tipo: "Sessão Ordinária",
    grau: "Aprendiz Maçom",
    status: "Concluído",
  },
  {
    numero: "10/2026",
    data: "04/07/2026",
    tipo: "Sessão Ordinária",
    grau: "Aprendiz Maçom",
    status: "Em revisão",
  },
];

const pecasArquitetura = [
  {
    titulo: "A Escada de Jacó e a Jornada do Companheiro",
    responsavel: "Felipe",
    grau: "Companheiro Maçom",
    situacao: "Recebida",
  },
  {
    titulo: "Cássia Amarela",
    responsavel: "Sadala",
    grau: "Aprendiz Maçom",
    situacao: "Apresentada",
  },
  {
    titulo: "Cinco Ordens da Arquitetura",
    responsavel: "A definir",
    grau: "Companheiro Maçom",
    situacao: "Pendente",
  },
];

const pendencias = [
  {
    acao: "Organizar ordem do dia da próxima sessão",
    responsavel: "Secretário",
    prazo: "Próxima sessão",
    prioridade: "Alta",
  },
  {
    acao: "Atualizar balaústre nº 10/2026",
    responsavel: "Secretário",
    prazo: "Em andamento",
    prioridade: "Alta",
  },
  {
    acao: "Conferir peças de arquitetura entregues",
    responsavel: "Secretário",
    prazo: "Antes da sessão",
    prioridade: "Média",
  },
  {
    acao: "Levantar compromissos anuais da Loja",
    responsavel: "Administração",
    prazo: "Julho/2026",
    prioridade: "Média",
  },
];

const processos = [
  {
    nome: "Candidato indicado",
    tipo: "Admissão",
    etapa: "Documentação inicial",
    status: "Em andamento",
  },
  {
    nome: "Regularização cadastral",
    tipo: "Secretaria",
    etapa: "Conferência de dados",
    status: "Pendente",
  },
];

function classeStatus(status: string) {
  if (status === "Concluído" || status === "Recebida" || status === "Apresentada") {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (status === "Em revisão" || status === "Em andamento") {
    return "bg-amber-400/10 text-amber-300";
  }

  return "bg-red-400/10 text-red-300";
}

function classePrioridade(prioridade: string) {
  if (prioridade === "Alta") {
    return "bg-red-400/10 text-red-300";
  }

  return "bg-amber-400/10 text-amber-300";
}

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
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                  modulo === "Secretaria"
                    ? "bg-amber-400 text-black"
                    : "text-zinc-300 hover:bg-white/10 hover:text-amber-300"
                }`}
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
                Secretaria
              </p>
              <h2 className="mt-3 text-4xl font-bold">
                Controle Administrativo da Loja
              </h2>
              <p className="mt-3 max-w-3xl text-zinc-400">
                Organização de atas, balaústres, ordem do dia, peças de
                arquitetura, ações pendentes, processos e compromissos
                administrativos da Loja.
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

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">Atas e Balaústres</h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    Controle inicial dos balaústres elaborados pela Secretaria.
                  </p>
                </div>

                <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2 text-sm text-amber-300">
                  Módulo em construção
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-white/[0.06] text-zinc-300">
                    <tr>
                      <th className="px-5 py-4">Número</th>
                      <th className="px-5 py-4">Data</th>
                      <th className="px-5 py-4">Tipo</th>
                      <th className="px-5 py-4">Grau</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {balaustres.map((item) => (
                      <tr
                        key={item.numero}
                        className="border-t border-white/10 transition hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-4 font-semibold text-white">
                          {item.numero}
                        </td>
                        <td className="px-5 py-4 text-zinc-300">
                          {item.data}
                        </td>
                        <td className="px-5 py-4 text-zinc-300">
                          {item.tipo}
                        </td>
                        <td className="px-5 py-4 text-zinc-300">
                          {item.grau}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${classeStatus(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
              <h3 className="text-2xl font-bold text-amber-300">
                Ordem do Dia
              </h3>

              <p className="mt-3 text-sm text-zinc-300">
                Área destinada a organizar previamente os assuntos da sessão,
                peças de arquitetura, comunicações, processos e deliberações.
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-zinc-400">Próxima sessão</p>
                  <p className="mt-1 font-bold text-white">A definir</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-zinc-400">Secretário</p>
                  <p className="mt-1 font-bold text-white">Marcus Brasil</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-zinc-400">Status da pauta</p>
                  <p className="mt-1 font-bold text-amber-300">
                    Em preparação
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-2xl font-bold">Peças de Arquitetura</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Trabalhos recebidos, apresentados ou pendentes para organização
                da ordem do dia.
              </p>

              <div className="mt-6 space-y-3">
                {pecasArquitetura.map((peca) => (
                  <div
                    key={peca.titulo}
                    className="rounded-2xl border border-white/10 bg-[#0D111A] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-white">{peca.titulo}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          Responsável: {peca.responsavel} | Grau: {peca.grau}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${classeStatus(
                          peca.situacao
                        )}`}
                      >
                        {peca.situacao}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-2xl font-bold">Ações Pendentes</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Controle das tarefas administrativas da Secretaria.
              </p>

              <div className="mt-6 space-y-3">
                {pendencias.map((item) => (
                  <div
                    key={item.acao}
                    className="rounded-2xl border border-white/10 bg-[#0D111A] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-bold text-white">{item.acao}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          Responsável: {item.responsavel} | Prazo: {item.prazo}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${classePrioridade(
                          item.prioridade
                        )}`}
                      >
                        {item.prioridade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-2xl font-bold">Processos Administrativos</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Controle inicial de admissões, regularizações e acompanhamentos
              conduzidos pela Secretaria.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.06] text-zinc-300">
                  <tr>
                    <th className="px-5 py-4">Nome</th>
                    <th className="px-5 py-4">Tipo</th>
                    <th className="px-5 py-4">Etapa</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {processos.map((processo) => (
                    <tr
                      key={processo.nome}
                      className="border-t border-white/10 transition hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-4 font-semibold text-white">
                        {processo.nome}
                      </td>
                      <td className="px-5 py-4 text-zinc-300">
                        {processo.tipo}
                      </td>
                      <td className="px-5 py-4 text-zinc-300">
                        {processo.etapa}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${classeStatus(
                            processo.status
                          )}`}
                        >
                          {processo.status}
                        </span>
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