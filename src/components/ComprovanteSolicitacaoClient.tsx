"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { carregarComprovanteSolicitacao } from "@/lib/supabase/portal";
import { Feedback, LoadingState } from "@/components/ui/Feedback";
import { dataBR } from "@/lib/formatacao";

type Dados = Awaited<ReturnType<typeof carregarComprovanteSolicitacao>>;
const dataHora = (valor: string) => valor ? new Date(valor).toLocaleString("pt-BR") : "—";

export function ComprovanteSolicitacaoClient({ id }: { id: string }) {
  const [dados, setDados] = useState<Dados>();
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarComprovanteSolicitacao(id)
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível abrir o comprovante."));
  }, [id]);

  if (!dados && !erro) return <LoadingState />;
  if (erro || !dados) return <Feedback tone="error">{erro || "Comprovante indisponível."}</Feedback>;

  const item = dados.solicitacao;
  if (!item.codigoComprovante || !["Aprovada", "Concluída"].includes(item.status)) {
    return <Feedback tone="warning">O comprovante será liberado após a decisão final positiva do Venerável Mestre.</Feedback>;
  }

  return <div className="mt-8">
    <div className="mb-5 flex flex-wrap gap-3 print:hidden">
      <button onClick={() => window.print()} className="rounded-xl bg-amber-400 px-5 py-3 font-black text-black">Imprimir ou salvar em PDF</button>
      <Link href="/portal-obreiro" className="rounded-xl border border-white/10 px-5 py-3 font-bold">Voltar ao Portal</Link>
    </div>

    <article className="mx-auto max-w-4xl rounded-3xl border border-white/15 bg-slate-950 p-8 text-white shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
      <header className="flex items-start justify-between gap-6 border-b border-amber-300/30 pb-6 print:border-black">
        <div>
          <p className="text-sm font-black tracking-[.24em] text-amber-300 print:text-black">SIGMA 2.0 · GESTÃO MAÇÔNICA</p>
          <h1 className="mt-2 text-3xl font-black">Comprovante de decisão e atendimento</h1>
          <p className="mt-2 text-zinc-400 print:text-zinc-700">Documento emitido eletronicamente pelo Portal do Obreiro.</p>
        </div>
        <div className="rounded-2xl border border-amber-300/30 px-4 py-3 text-right print:border-black">
          <p className="text-xs text-zinc-400 print:text-zinc-700">Código</p>
          <p className="font-mono font-black">{item.codigoComprovante}</p>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          ["Protocolo", item.protocolo],
          ["Obreiro", item.obreiroNome || dados.obreiroId],
          ["Tipo", item.tipo],
          ["Situação", item.status],
          ["Área técnica", `${item.areaDestino} · ${item.responsavelTecnicoPerfil}`],
          ["Emissão", dataHora(item.comprovanteEmitidoEm)],
        ].map(([rotulo, valor]) => <div key={rotulo} className="rounded-xl border border-white/10 p-3 print:border-zinc-400">
          <p className="text-xs uppercase tracking-wider text-zinc-500">{rotulo}</p>
          <p className="mt-1 font-bold">{valor}</p>
        </div>)}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-black">Solicitação</h2>
        <p className="mt-2 font-bold">{item.titulo}</p>
        <p className="mt-2 whitespace-pre-wrap text-zinc-300 print:text-zinc-800">{item.descricao}</p>
      </section>

      {item.sessoes.length > 0 && <section className="mt-6">
        <h2 className="text-lg font-black">Sessões justificadas</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead><tr className="border-b border-white/20 print:border-black"><th className="p-2">Data</th><th className="p-2">Sessão</th><th className="p-2">Resultado</th></tr></thead>
          <tbody>{item.sessoes.map((sessao) => <tr key={sessao.id} className="border-b border-white/10 print:border-zinc-300">
            <td className="p-2">{dataBR(sessao.data)}</td><td className="p-2">{sessao.titulo || sessao.tipo}</td><td className="p-2 font-bold">Justificado</td>
          </tr>)}</tbody>
        </table>
      </section>}

      {item.periodoInicio && <section className="mt-6 rounded-xl border border-white/10 p-4 print:border-zinc-400">
        <h2 className="text-lg font-black">Período aprovado</h2>
        <p className="mt-1">{dataBR(item.periodoInicio)} até {dataBR(item.periodoFim)}</p>
        {item.tipo === "Isenção de mensalidades" && <p className="mt-1 font-bold">Mensalidades do período: Isento</p>}
      </section>}

      <section className="mt-6 grid gap-4">
        <div className="rounded-xl border border-sky-300/25 p-4 print:border-zinc-400">
          <h2 className="font-black">Parecer técnico</h2>
          <p className="mt-2 whitespace-pre-wrap">{item.parecerTecnico || "Parecer registrado na tramitação."}</p>
          <p className="mt-2 text-xs text-zinc-500">{dataHora(item.parecerTecnicoEm)}</p>
        </div>
        <div className="rounded-xl border border-emerald-300/30 bg-emerald-300/5 p-4 print:border-black print:bg-white">
          <h2 className="font-black">Decisão final do Venerável Mestre</h2>
          <p className="mt-2 text-xl font-black">{item.decisaoFinal}</p>
          <p className="mt-2 whitespace-pre-wrap">{item.resposta}</p>
          <p className="mt-2 text-xs text-zinc-500">{dataHora(item.decisaoFinalEm)}</p>
        </div>
      </section>

      {item.anexos.filter((anexo) => anexo.categoria === "Documento final").length > 0 && <section className="mt-6 print:hidden">
        <h2 className="font-black">Documentos finais disponíveis</h2>
        <div className="mt-2 flex flex-wrap gap-2">{item.anexos.filter((anexo) => anexo.categoria === "Documento final").map((anexo) => <a key={anexo.id} href={anexo.url} target="_blank" rel="noreferrer" className="rounded-lg bg-amber-400 px-3 py-2 font-bold text-black">{anexo.nome}</a>)}</div>
      </section>}

      <footer className="mt-8 border-t border-white/15 pt-5 text-xs text-zinc-500 print:border-black print:text-zinc-700">
        <p>Comprovante vinculado ao protocolo {item.protocolo} e ao código {item.codigoComprovante}.</p>
        <p className="mt-1">Sistema desenvolvido por Marcus Brasil · analista.marcusbrasil@gmail.com</p>
      </footer>
    </article>
  </div>;
}
