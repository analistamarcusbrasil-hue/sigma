"use client";

import { useEffect, useMemo, useState } from "react";
import { listarSolicitacoesAdministrativas, type SolicitacaoPortal } from "@/lib/supabase/portal";
import { tramitarSolicitacao } from "@/app/solicitacoes/actions";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/Feedback";

const statuses = ["Pendente", "Em análise", "Aprovada", "Recusada", "Concluída"] as const;
const finalizada = (status: string) => ["Aprovada", "Recusada", "Concluída", "Cancelada"].includes(status);
const dataHora = (valor: string) => valor ? new Date(valor).toLocaleString("pt-BR") : "—";
const dataCurta = (valor: string) => valor ? valor.slice(0, 10).split("-").reverse().join("/") : "—";
const diasAte = (valor: string) => valor ? Math.ceil((new Date(valor).getTime() - Date.now()) / 86400000) : 0;

function Prazo({ item }: { item: SolicitacaoPortal }) {
  if (!item.prazoEm) return <span className="text-zinc-400">Sem prazo</span>;
  const dias = diasAte(item.prazoEm);
  if (finalizada(item.status)) return <span className="text-emerald-200">Finalizada no fluxo</span>;
  if (dias < 0) return <span className="font-bold text-red-300">{Math.abs(dias)} dia(s) em atraso</span>;
  if (dias <= 1) return <span className="font-bold text-amber-200">Vence {dias === 0 ? "hoje" : "amanhã"}</span>;
  return <span className="text-zinc-300">{dias} dias restantes</span>;
}

export function SolicitacoesClient() {
  const [itens, setItens] = useState<SolicitacaoPortal[]>([]);
  const [status, setStatus] = useState("");
  const [area, setArea] = useState("");
  const [prazo, setPrazo] = useState("");
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [arquivos, setArquivos] = useState<Record<string, string>>({});
  const [processando, setProcessando] = useState("");
  const [load, setLoad] = useState(true);
  const [msg, setMsg] = useState("");
  const [tom, setTom] = useState<"success" | "error">("success");

  async function carregar() {
    setItens(await listarSolicitacoesAdministrativas());
  }

  useEffect(() => {
    carregar().catch((e) => {
      setTom("error");
      setMsg(e instanceof Error ? e.message : "Não foi possível carregar a fila.");
    }).finally(() => setLoad(false));
  }, []);

  const areas = useMemo(() => Array.from(new Set(itens.map((i) => i.areaDestino))).sort(), [itens]);
  const resumo = useMemo(() => ({
    pendentes: itens.filter((i) => i.status === "Pendente").length,
    analise: itens.filter((i) => i.status === "Em análise").length,
    atrasadas: itens.filter((i) => !finalizada(i.status) && i.prazoEm && diasAte(i.prazoEm) < 0).length,
    hoje: itens.filter((i) => !finalizada(i.status) && i.prazoEm && diasAte(i.prazoEm) >= 0 && diasAte(i.prazoEm) <= 1).length,
  }), [itens]);

  const lista = itens.filter((i) => {
    const d = diasAte(i.prazoEm);
    return (!status || i.status === status)
      && (!area || i.areaDestino === area)
      && (!prazo || (prazo === "atrasadas" ? !finalizada(i.status) && d < 0 : prazo === "hoje" ? !finalizada(i.status) && d >= 0 && d <= 1 : true));
  });

  async function atualizar(item: SolicitacaoPortal, novoStatus: string) {
    setProcessando(item.id);
    setMsg("");
    try {
      await tramitarSolicitacao({
        id: item.id,
        status: novoStatus,
        resposta: respostas[item.id] ?? item.resposta,
        arquivoFinalUrl: arquivos[item.id] ?? item.arquivoFinalUrl,
      });
      await carregar();
      setTom("success");
      const ajustouFrequencia = Boolean(item.sessaoId) && ["Aprovada", "Concluída"].includes(novoStatus);
      setMsg(ajustouFrequencia
        ? `Solicitação ${item.protocolo || item.id} aprovada e frequência da sessão atualizada automaticamente para Justificado.`
        : `Solicitação ${item.protocolo || item.id} atualizada e o Obreiro já pode acompanhar.`);
    } catch (e) {
      setTom("error");
      setMsg(e instanceof Error ? e.message : "Não foi possível tramitar a solicitação.");
    } finally {
      setProcessando("");
    }
  }

  if (load) return <LoadingState />;

  return <div className="mt-8 space-y-6">
    {msg && <Feedback tone={tom}>{msg}</Feedback>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Pendentes", resumo.pendentes, "text-amber-200"],
        ["Em análise", resumo.analise, "text-sky-200"],
        ["Vencem hoje/amanhã", resumo.hoje, "text-orange-200"],
        ["Em atraso", resumo.atrasadas, "text-red-300"],
      ].map(([titulo, valor, cor]) => <article key={String(titulo)} className="sigma-surface rounded-2xl p-4">
        <p className="text-sm text-zinc-400">{titulo}</p>
        <p className={`mt-1 text-3xl font-black ${cor}`}>{valor}</p>
      </article>)}
    </section>

    <section className="sigma-surface grid gap-3 rounded-2xl p-4 md:grid-cols-3">
      <label className="text-sm text-zinc-400">Status
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-white">
          <option value="">Todos os status</option>
          {statuses.map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label className="text-sm text-zinc-400">Área responsável
        <select value={area} onChange={(e) => setArea(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-white">
          <option value="">Todas as áreas</option>
          {areas.map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label className="text-sm text-zinc-400">Prazo
        <select value={prazo} onChange={(e) => setPrazo(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-white">
          <option value="">Todos os prazos</option>
          <option value="hoje">Vence hoje ou amanhã</option>
          <option value="atrasadas">Em atraso</option>
        </select>
      </label>
    </section>

    <section className="space-y-4">
      {lista.length ? lista.map((i) => <article key={i.id} className="sigma-surface rounded-3xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">{i.protocolo || "Protocolo em processamento"}</p>
            <h2 className="mt-1 text-lg font-black">{i.titulo}</h2>
            <p className="text-sm text-zinc-400">{i.obreiroNome || "Obreiro"} · {i.tipo} · {dataHora(i.criadoEm)}</p>
          </div>
          <div className="text-right text-sm">
            <span className="rounded-full bg-amber-400/10 px-3 py-1 font-bold text-amber-200">{i.status}</span>
            <p className="mt-2"><Prazo item={i} /></p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          {[["Área", i.areaDestino], ["Responsável", i.responsavelPerfil], ["Etapa atual", i.etapaAtual], ["Prazo", dataHora(i.prazoEm)]].map(([rotulo, valor]) => <div key={rotulo} className="rounded-xl border border-white/10 p-3">
            <p className="text-xs text-zinc-500">{rotulo}</p><p className="mt-1 font-semibold">{valor}</p>
          </div>)}
        </div>

        {i.sessaoId && <div className="mt-4 rounded-2xl border border-sky-300/25 bg-sky-300/5 p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-200">Justificativa de frequência</p>
              <p className="mt-1 font-black">{i.sessaoTitulo || i.sessaoTipo || "Sessão"} · {dataCurta(i.sessaoData)}</p>
              <p className="mt-1 text-zinc-400">Ao aprovar, o sistema altera automaticamente a presença desta sessão para <b className="text-white">Justificado</b>. Se já estiver Presente, a marcação será mantida.</p>
            </div>
            {i.frequenciaAjustadaEm && <span className="rounded-full bg-emerald-400/15 px-3 py-1 font-bold text-emerald-200">Frequência atualizada em {dataHora(i.frequenciaAjustadaEm)}</span>}
          </div>
        </div>}

        <p className="mt-4 rounded-xl bg-black/20 p-3 text-sm text-zinc-200">{i.descricao}</p>

        <details className="mt-4 rounded-xl border border-white/10 p-4" open={i.status !== "Concluída"}>
          <summary className="cursor-pointer font-bold">Tramitação ({i.tramitacoes.length} movimento(s))</summary>
          <ol className="mt-4 space-y-3 border-l border-amber-400/30 pl-4">
            {i.tramitacoes.map((t) => <li key={t.id} className="relative text-sm">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-amber-300" />
              <div className="flex flex-wrap justify-between gap-2"><b>{t.etapa || t.statusNovo}</b><span className="text-xs text-zinc-500">{dataHora(t.criadoEm)}</span></div>
              <p className="text-zinc-300">{t.mensagem || `Situação alterada para ${t.statusNovo}.`}</p>
              <p className="text-xs text-zinc-500">Por: {t.autorPerfil || "Sistema"}</p>
            </li>)}
          </ol>
        </details>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="text-sm text-zinc-400">Resposta visível ao Obreiro
            <textarea aria-label={`Resposta para ${i.titulo}`} rows={4} maxLength={2000} value={respostas[i.id] ?? i.resposta} onChange={(e) => setRespostas({ ...respostas, [i.id]: e.target.value })} placeholder="Informe a análise, orientação ou decisão." className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-white" />
          </label>
          <label className="text-sm text-zinc-400">Link do documento final (opcional)
            <input type="url" value={arquivos[i.id] ?? i.arquivoFinalUrl} onChange={(e) => setArquivos({ ...arquivos, [i.id]: e.target.value })} placeholder="https://..." className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-white" />
            <span className="mt-2 block text-xs text-zinc-500">Ao concluir, o Obreiro verá o botão para abrir e baixar o documento.</span>
            {i.arquivoFinalUrl && <a href={i.arquivoFinalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-amber-200 underline">Abrir documento atual</a>}
          </label>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {["Em análise", "Aprovada", "Recusada", "Concluída"].map((s) => {
            const bloqueado = i.status === "Concluída"
              || i.status === "Recusada"
              || s === i.status
              || (i.status === "Aprovada" && s !== "Concluída");
            const rotulo = s === "Aprovada" && i.sessaoId ? "Aprovar e justificar frequência" : s;
            return <button key={s} disabled={processando === i.id || bloqueado} onClick={() => void atualizar(i, s)} className={`rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${s === "Concluída" ? "bg-emerald-400 text-black" : s === "Recusada" ? "border border-red-400/30 text-red-200" : s === "Aprovada" && i.sessaoId ? "bg-sky-300 text-slate-950" : "border border-white/10"}`}>
              {processando === i.id ? "Processando…" : rotulo}
            </button>;
          })}
        </div>
      </article>) : <EmptyState title="Nenhuma solicitação nesta fila" description="Altere os filtros ou aguarde um novo pedido destinado ao seu perfil." />}
    </section>
  </div>;
}
