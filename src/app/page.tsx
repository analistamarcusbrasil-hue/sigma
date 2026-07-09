const obreiros = [
  "Eduardo",
  "Marcus Brasil",
  "Hermon",
  "Rafael",
  "Sadala",
  "Felipe",
];

const sessoes = [
  { chave: "s1", nome: "20/06/2026", tipo: "Ordinária" },
  { chave: "s2", nome: "04/07/2026", tipo: "Ordinária" },
  { chave: "s3", nome: "18/07/2026", tipo: "Ordinária" },
  { chave: "s4", nome: "01/08/2026", tipo: "Ordinária" },
] as const;

type SessaoChave = (typeof sessoes)[number]["chave"];
type StatusPresenca = "Presente" | "Falta" | "Justificado";

const chancelaria: {
  nome: string;
  presencas: Record<SessaoChave, StatusPresenca>;
}[] = [
  {
    nome: "Eduardo",
    presencas: {
      s1: "Presente",
      s2: "Presente",
      s3: "Presente",
      s4: "Presente",
    },
  },
  {
    nome: "Marcus Brasil",
    presencas: {
      s1: "Presente",
      s2: "Presente",
      s3: "Presente",
      s4: "Presente",
    },
  },
  {
    nome: "Hermon",
    presencas: {
      s1: "Presente",
      s2: "Falta",
      s3: "Presente",
      s4: "Justificado",
    },
  },
  {
    nome: "Rafael",
    presencas: {
      s1: "Presente",
      s2: "Presente",
      s3: "Falta",
      s4: "Presente",
    },
  },
  {
    nome: "Sadala",
    presencas: {
      s1: "Presente",
      s2: "Presente",
      s3: "Presente",
      s4: "Falta",
    },
  },
  {
    nome: "Felipe",
    presencas: {
      s1: "Falta",
      s2: "Presente",
      s3: "Falta",
      s4: "Justificado",
    },
  },
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

function calcularDadosPresenca(presencas: Record<SessaoChave, StatusPresenca>) {
  const lista = Object.values(presencas);

  const presentes = lista.filter((status) => status === "Presente").length;
  const faltas = lista.filter((status) => status === "Falta").length;
  const justificadas = lista.filter((status) => status === "Justificado").length;

  const percentual = Math.round((presentes / lista.length) * 100);

  return {
    presentes,
    faltas,
    justificadas,
    percentual,
  };
}

function classeStatus(status: StatusPresenca) {
  if (status === "Presente") {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (status === "Justificado") {
    return "bg-amber-400/10 text-amber-300";
  }

  return "bg-red-400/10 text-red-300";
}

const totalRegistros = chancelaria.length * sessoes.length;

const totalPresentes = chancelaria.reduce((total, item) => {
  return (
    total +
    Object.values(item.presencas).filter((status) => status === "Presente")
      .length
  );
}, 0);

const totalFaltas = chancelaria.reduce((total, item) => {
  return (
    total +
    Object.values(item.presencas).filter((status) => status === "Falta").length
  );
}, 0);

const totalJustificadas = chancelaria.reduce((total, item) => {
  return (
    total +
    Object.values(item.presencas).filter(
      (status) => status === "Justificado"
    ).length
  );
}, 0);

const frequenciaGeral = Math.round((totalPresentes / totalRegistros) * 100);

const baixaFrequencia = chancelaria.filter((item) => {
  const dados = calcularDadosPresenca(item.presencas);
  return dados.percentual < 75;
});

const indicadores = [
  {
    titulo: "Frequência geral",
    valor: `${frequenciaGeral}%`,
    detalhe: "Presenças registradas",
  },
  {
    titulo: "Presenças",
    valor: String(totalPresentes),
    detalhe: "Total de comparecimentos",
  },
  {
    titulo: "Faltas",
    valor: String(totalFaltas),
    detalhe: "Ausências não justificadas",
  },
  {
    titulo: "Justificadas",
    valor: String(totalJustificadas),
    detalhe: "Ausências justificadas",
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
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                  modulo === "Chancelaria"
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
                Chancelaria
              </p>
              <h2 className="mt-3 text-4xl font-bold">
                Controle de Frequência da Loja
              </h2>
              <p className="mt-3 max-w-3xl text-zinc-400">
                Registro de presença por sessão, com controle de faltas,
                justificativas e percentual individual de frequência.
              </p>
            </div>

            <button className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300">
              Nova sessão
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
                <h3 className="text-2xl font-bold">Presença por Sessão</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Controle organizado por obreiro, sessão e status de presença.
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
                    <th className="px-5 py-4">Obreiro</th>
                    {sessoes.map((sessao) => (
                      <th key={sessao.chave} className="px-5 py-4">
                        <div>{sessao.nome}</div>
                        <div className="text-xs font-normal text-zinc-500">
                          {sessao.tipo}
                        </div>
                      </th>
                    ))}
                    <th className="px-5 py-4">Frequência</th>
                    <th className="px-5 py-4">Situação</th>
                  </tr>
                </thead>

                <tbody>
                  {chancelaria.map((item) => {
                    const dados = calcularDadosPresenca(item.presencas);
                    const situacao =
                      dados.percentual >= 75 ? "Regular" : "Atenção";

                    return (
                      <tr
                        key={item.nome}
                        className="border-t border-white/10 transition hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-4 font-semibold text-white">
                          {item.nome}
                        </td>

                        {sessoes.map((sessao) => {
                          const status = item.presencas[sessao.chave];

                          return (
                            <td key={sessao.chave} className="px-5 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${classeStatus(
                                  status
                                )}`}
                              >
                                {status}
                              </span>
                            </td>
                          );
                        })}

                        <td className="px-5 py-4 font-bold text-amber-300">
                          {dados.percentual}%
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              situacao === "Regular"
                                ? "bg-emerald-400/10 text-emerald-300"
                                : "bg-red-400/10 text-red-300"
                            }`}
                          >
                            {situacao}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-2xl font-bold">Resumo das Sessões</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Lista das sessões usadas no controle inicial da chancelaria.
              </p>

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-white/[0.06] text-zinc-300">
                    <tr>
                      <th className="px-5 py-4">Sessão</th>
                      <th className="px-5 py-4">Tipo</th>
                      <th className="px-5 py-4">Presentes</th>
                      <th className="px-5 py-4">Faltas</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sessoes.map((sessao) => {
                      const presentes = chancelaria.filter(
                        (item) => item.presencas[sessao.chave] === "Presente"
                      ).length;

                      const faltas = chancelaria.filter(
                        (item) => item.presencas[sessao.chave] === "Falta"
                      ).length;

                      return (
                        <tr
                          key={sessao.chave}
                          className="border-t border-white/10"
                        >
                          <td className="px-5 py-4 font-semibold">
                            {sessao.nome}
                          </td>
                          <td className="px-5 py-4 text-zinc-300">
                            {sessao.tipo}
                          </td>
                          <td className="px-5 py-4 font-bold text-emerald-300">
                            {presentes}
                          </td>
                          <td className="px-5 py-4 font-bold text-red-300">
                            {faltas}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
              <h3 className="text-2xl font-bold text-amber-300">
                Alerta da Chancelaria
              </h3>

              <p className="mt-3 text-sm text-zinc-300">
                Irmãos com frequência abaixo de 75% devem ser acompanhados para
                orientação, justificativa ou regularização.
              </p>

              <div className="mt-6 space-y-3">
                {baixaFrequencia.map((item) => {
                  const dados = calcularDadosPresenca(item.presencas);

                  return (
                    <div
                      key={item.nome}
                      className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4"
                    >
                      <p className="font-bold text-white">{item.nome}</p>
                      <p className="mt-1 text-sm text-red-300">
                        Frequência atual: {dados.percentual}% | Faltas:{" "}
                        {dados.faltas}
                      </p>
                    </div>
                  );
                })}

                {baixaFrequencia.length === 0 && (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <p className="font-bold text-emerald-300">
                      Nenhum alerta de baixa frequência.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}