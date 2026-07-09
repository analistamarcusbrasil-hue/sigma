import { AppShell } from "@/components/AppShell";
import { balaustres, classeStatus, pendencias } from "@/lib/mock-data";

export default function SecretariaPage() {
  return (
    <AppShell
      secao="Secretaria"
      titulo="Controle Administrativo da Loja"
      subtitulo="Organização de atas, balaústres, ordem do dia, peças de arquitetura, processos e compromissos administrativos."
      acao={
        <button className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300">
          Novo registro
        </button>
      }
    >
      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-2xl font-bold">Atas e Balaústres</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Controle inicial dos balaústres elaborados pela Secretaria.
          </p>

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
                  <tr key={item.numero} className="border-t border-white/10 transition hover:bg-white/[0.03]">
                    <td className="px-5 py-4 font-semibold text-white">{item.numero}</td>
                    <td className="px-5 py-4 text-zinc-300">{item.data}</td>
                    <td className="px-5 py-4 text-zinc-300">{item.tipo}</td>
                    <td className="px-5 py-4 text-zinc-300">{item.grau}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classeStatus(item.status)}`}>
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
          <h3 className="text-2xl font-bold text-amber-300">Ordem do Dia</h3>
          <p className="mt-3 text-sm text-zinc-300">
            Área para organizar previamente assuntos da sessão, peças, comunicações, processos e deliberações.
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
              <p className="mt-1 font-bold text-amber-300">Em preparação</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Ações Pendentes</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Controle das tarefas administrativas da Secretaria.
        </p>

        <div className="mt-6 space-y-3">
          {pendencias.map((item) => (
            <div key={item.acao} className="rounded-2xl border border-white/10 bg-[#0D111A] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-bold text-white">{item.acao}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Responsável: {item.responsavel} | Prazo: {item.prazo}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  {item.prioridade}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
