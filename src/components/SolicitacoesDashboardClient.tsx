"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listarResumoSolicitacoesGestao, type SolicitacaoPortal } from "@/lib/supabase/portal";

const finalizada = (status: string) => ["Aprovada", "Recusada", "Concluída", "Cancelada"].includes(status);
const diasAte = (valor: string) => valor ? Math.ceil((new Date(valor).getTime() - Date.now()) / 86400000) : 0;

export function SolicitacoesDashboardClient() {
  const [itens, setItens] = useState<SolicitacaoPortal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [indisponivel, setIndisponivel] = useState(false);

  useEffect(() => {
    listarResumoSolicitacoesGestao()
      .then(setItens)
      .catch(() => setIndisponivel(true))
      .finally(() => setCarregando(false));
  }, []);

  const dados = useMemo(() => {
    const abertas = itens.filter((i) => !finalizada(i.status));
    const atrasadas = abertas.filter((i) => i.prazoEm && diasAte(i.prazoEm) < 0);
    const proximas = abertas.filter((i) => i.prazoEm && diasAte(i.prazoEm) >= 0 && diasAte(i.prazoEm) <= 1);
    const areas = Array.from(new Set(abertas.map((i) => i.areaDestino))).map((area) => ({
      area,
      total: abertas.filter((i) => i.areaDestino === area).length,
      atrasadas: atrasadas.filter((i) => i.areaDestino === area).length,
    })).sort((a, b) => b.total - a.total);
    return { abertas, atrasadas, proximas, areas };
  }, [itens]);

  if (indisponivel) return null;

  return <section className="mt-8 sigma-surface rounded-3xl p-6" aria-busy={carregando}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Portal e Comunicação</p>
        <h2 className="mt-1 text-2xl font-black">Tramitação das solicitações</h2>
        <p className="mt-1 text-sm text-zinc-400">Pendências distribuídas ao seu perfil, com prazo e acompanhamento.</p>
      </div>
      <Link href="/solicitacoes" className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black">Abrir central de solicitações</Link>
    </div>

    {carregando ? <p className="mt-5 text-sm text-zinc-400">Carregando prazos…</p> : <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Em andamento", dados.abertas.length, "text-sky-200"],
          ["Pendentes", dados.abertas.filter((i) => i.status === "Pendente").length, "text-amber-200"],
          ["Vencem hoje/amanhã", dados.proximas.length, "text-orange-200"],
          ["Em atraso", dados.atrasadas.length, "text-red-300"],
        ].map(([titulo, valor, cor]) => <article key={String(titulo)} className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-sm text-zinc-400">{titulo}</p><p className={`mt-1 text-3xl font-black ${cor}`}>{valor}</p></article>)}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 p-4">
          <h3 className="font-black">Fila por área</h3>
          <div className="mt-3 space-y-2">{dados.areas.length ? dados.areas.map((a) => <div key={a.area} className="flex items-center justify-between rounded-xl bg-black/15 p-3 text-sm"><span>{a.area}</span><span className="font-bold">{a.total} aberta(s){a.atrasadas ? ` · ${a.atrasadas} atrasada(s)` : ""}</span></div>) : <p className="text-sm text-zinc-400">Nenhuma pendência destinada ao seu perfil.</p>}</div>
        </article>
        <article className="rounded-2xl border border-white/10 p-4">
          <h3 className="font-black">Atenção imediata</h3>
          <div className="mt-3 space-y-2">{[...dados.atrasadas, ...dados.proximas].slice(0, 5).map((i) => <Link key={i.id} href="/solicitacoes" className="block rounded-xl bg-black/15 p-3 text-sm transition hover:bg-white/5"><div className="flex justify-between gap-3"><b>{i.protocolo}</b><span className={diasAte(i.prazoEm) < 0 ? "text-red-300" : "text-amber-200"}>{diasAte(i.prazoEm) < 0 ? `${Math.abs(diasAte(i.prazoEm))}d atraso` : diasAte(i.prazoEm) === 0 ? "vence hoje" : "vence amanhã"}</span></div><p className="mt-1 truncate text-zinc-400">{i.titulo} · {i.areaDestino}</p></Link>)}{!dados.atrasadas.length && !dados.proximas.length && <p className="text-sm text-zinc-400">Nenhuma solicitação próxima do vencimento.</p>}</div>
        </article>
      </div>
    </>}
  </section>;
}
