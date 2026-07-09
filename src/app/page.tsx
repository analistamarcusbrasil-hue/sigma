const mensalidade = 100;

const obreiros = [
  { nome: "Eduardo", grau: "Mestre Maçom", cargo: "Venerável Mestre" },
  { nome: "Marcus Brasil", grau: "Mestre Maçom", cargo: "Secretário" },
  { nome: "Hermon", grau: "Mestre Maçom", cargo: "1º Vigilante" },
  { nome: "Rafael", grau: "Mestre Maçom", cargo: "2º Vigilante" },
  { nome: "Sadala", grau: "Mestre Maçom", cargo: "Tesoureiro" },
  { nome: "Felipe", grau: "Aprendiz Maçom", cargo: "Obreiro" },
];

const meses = [
  { chave: "janeiro", nome: "Janeiro" },
  { chave: "fevereiro", nome: "Fevereiro" },
  { chave: "marco", nome: "Março" },
];

const tesouraria = [
  {
    nome: "Eduardo",
    pagamentos: { janeiro: "Pago", fevereiro: "Pago", marco: "Pago" },
  },
  {
    nome: "Marcus Brasil",
    pagamentos: { janeiro: "Pago", fevereiro: "Pago", marco: "Pago" },
  },
  {
    nome: "Hermon",
    pagamentos: { janeiro: "Pago", fevereiro: "Pendente", marco: "Pago" },
  },
  {
    nome: "Rafael",
    pagamentos: { janeiro: "Pago", fevereiro: "Pago", marco: "Pendente" },
  },
  {
    nome: "Sadala",
    pagamentos: { janeiro: "Pago", fevereiro: "Pago", marco: "Pago" },
  },
  {
    nome: "Felipe",
    pagamentos: { janeiro: "Pendente", fevereiro: "Pago", marco: "Pendente" },
  },
];

const troncos = [
  {
    sessao: "Sessão 20/06/2026",
    descricao: "Tronco de Solidariedade",
    valor: 76,
  },
  {
    sessao: "Sessão 04/07/2026",
    descricao: "Tronco de Solidariedade",
    valor: 0,
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

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

const totalMensalidadesPrevistas = obreiros.length * meses.length * mensalidade;

const totalMensalidadesRecebidas = tesouraria.reduce((total, item) => {
  const pagos = Object.values(item.pagamentos).filter(
    (status) => status === "Pago"
  ).length;

  return total + pagos * mensalidade;
}, 0);

const totalMensalidadesPendentes =
  totalMensalidadesPrevistas - totalMensalidadesRecebidas;

const totalTronco = troncos.reduce((total, item) => total + item.valor, 0);

const totalGeralRecebido = totalMensalidadesRecebidas + totalTronco;

const indicadores = [
  {
    titulo: "Mensalidades recebidas",
    valor: formatarMoeda(totalMensalidadesRecebidas),
    detalhe: "Pagamentos confirmados",
  },
  {
    titulo: "Mensalidades pendentes",
    valor: formatarMoeda(totalMensalidadesPendentes),
    detalhe: "Valores em aberto",
  },
  {
    titulo: "Tronco separado",
    valor: formatarMoeda(totalTronco),
    detalhe: "Não soma como mensalidade",
  },
  {
    titulo: "Total recebido",
    valor: formatarMoeda(totalGeralRecebido),
    detalhe: "Mensalidades + tronco",
  },
];

function classeStatus(status: string) {
  if (status === "Pago") {
    return "bg-emerald-400/10 text-emerald-300";
  }

  return "bg-red-400/10 text-red-300";
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
                  modulo === "Tesouraria"
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
                Tesouraria
              </p>
              <h2 className="mt-3 text-4xl font-bold">
                Controle Financeiro da Loja
              </h2>
              <p className="mt-3 max-w-3xl text-zinc-400">
                Mensalidades de R$ 100 por obreiro, controle mês a mês,
                pendências e Tronco de Solidariedade registrado separadamente.
              </p>
            </div>

            <button className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300">
              Novo lançamento
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
                <h3 className="text-2xl font-bold">Mensalidades</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Controle por obreiro e por mês. Cada mensalidade possui valor
                  fixo de {formatarMoeda(mensalidade)}.
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
                    {meses.map((mes) => (
                      <th key={mes.chave} className="px-5 py-4">
                        {mes.nome}
                      </th>
                    ))}
                    <th className="px-5 py-4">Total pago</th>
                  </tr>
                </thead>

                <tbody>
                  {tesouraria.map((item) => {
                    const totalPago =
                      Object.values(item.pagamentos).filter(
                        (status) => status === "Pago"
                      ).length * mensalidade;

                    return (
                      <tr
                        key={item.nome}
                        className="border-t border-white/10 transition hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-4 font-semibold text-white">
                          {item.nome}
                        </td>

                        {meses.map((mes) => {
                          const status =
                            item.pagamentos[
                              mes.chave as keyof typeof item.pagamentos
                            ];

                          return (
                            <td key={mes.chave} className="px-5 py-4">
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

                        <td className="px-5 py-4 font-semibold text-amber-300">
                          {formatarMoeda(totalPago)}
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
              <h3 className="text-2xl font-bold">
                Tronco de Solidariedade
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Registro separado das mensalidades para prestação de contas
                clara e organizada.
              </p>

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-white/[0.06] text-zinc-300">
                    <tr>
                      <th className="px-5 py-4">Sessão</th>
                      <th className="px-5 py-4">Descrição</th>
                      <th className="px-5 py-4">Valor</th>
                    </tr>
                  </thead>

                  <tbody>
                    {troncos.map((tronco) => (
                      <tr
                        key={tronco.sessao}
                        className="border-t border-white/10"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {tronco.sessao}
                        </td>
                        <td className="px-5 py-4 text-zinc-300">
                          {tronco.descricao}
                        </td>
                        <td className="px-5 py-4 font-bold text-emerald-300">
                          {formatarMoeda(tronco.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
              <h3 className="text-2xl font-bold text-amber-300">
                Resumo da Tesouraria
              </h3>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-zinc-300">Previsto em mensalidades</span>
                  <strong>{formatarMoeda(totalMensalidadesPrevistas)}</strong>
                </div>

                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-zinc-300">Recebido mensalidades</span>
                  <strong className="text-emerald-300">
                    {formatarMoeda(totalMensalidadesRecebidas)}
                  </strong>
                </div>

                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-zinc-300">Pendente mensalidades</span>
                  <strong className="text-red-300">
                    {formatarMoeda(totalMensalidadesPendentes)}
                  </strong>
                </div>

                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-zinc-300">Tronco separado</span>
                  <strong className="text-amber-300">
                    {formatarMoeda(totalTronco)}
                  </strong>
                </div>

                <div className="flex justify-between pt-2 text-lg">
                  <span className="font-bold text-white">Total geral</span>
                  <strong className="text-emerald-300">
                    {formatarMoeda(totalGeralRecebido)}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}