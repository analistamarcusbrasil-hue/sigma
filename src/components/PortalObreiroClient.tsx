"use client";

import { useEffect, useMemo, useState } from "react";
import { carregarPortal } from "@/lib/supabase/portal";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/Feedback";
import { PortalSolicitacoesClient } from "@/components/PortalSolicitacoesClient";
import { moedaBR, dataBR } from "@/lib/formatacao";

type Dados = Awaited<ReturnType<typeof carregarPortal>>;
const encerrada = (status: string) => ["Aprovada", "Recusada", "Concluída", "Cancelada"].includes(status);

export function PortalObreiroClient() {
  const [dados, setDados] = useState<Dados>();
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarPortal().then(setDados).catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível abrir o Portal."));
  }, []);

  const resumo = useMemo(() => {
    const presencas = dados?.presencas ?? [];
    const presentes = presencas.filter((item) => item.status === "Presente").length;
    const justificadas = presencas.filter((item) => item.status === "Justificado").length;
    const faltas = presencas.filter((item) => item.status === "Falta").length;
    const frequencia = presencas.length ? Math.round((presentes + justificadas) / presencas.length * 100) : 0;
    const abertas = (dados?.mensalidades ?? []).filter((item) => item.status === "Pendente");
    return {
      presentes,
      justificadas,
      faltas,
      frequencia,
      abertas,
      totalAberto: abertas.reduce((soma, item) => soma + Number(item.valor || 0), 0),
    };
  }, [dados]);

  if (!dados && !erro) return <LoadingState />;
  if (erro && !dados) return <Feedback tone="error">{erro}</Feedback>;
  if (!dados?.obreiro) return <Feedback tone="warning">Seu usuário ainda não está vinculado ao cadastro de Obreiro. Solicite regularização à Secretaria da Loja.</Feedback>;

  return <div className="mt-8 space-y-6">
    <Feedback tone="info">As áreas responsáveis emitem parecer, mas a aprovação ou recusa final é sempre do Venerável Mestre. Mensagens, anexos e decisões permanecem registrados.</Feedback>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Situação cadastral", dados.obreiro.situacao],
        ["Frequência", `${resumo.frequencia}%`],
        ["Mensalidades em aberto", resumo.abertas.length],
        ["Solicitações em andamento", dados.solicitacoes.filter((item) => !encerrada(item.status)).length],
      ].map(([titulo, valor]) => <article key={String(titulo)} className="sigma-surface rounded-2xl p-5">
        <p className="text-sm text-zinc-400">{titulo}</p>
        <p className="mt-2 text-2xl font-black text-amber-200">{valor}</p>
      </article>)}
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <article className="sigma-surface rounded-3xl p-6">
        <h2 className="text-xl font-black">Meus Dados</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {[
            ["Nome", dados.obreiro.nome],
            ["Grau", dados.obreiro.grau],
            ["Cargo", dados.obreiro.cargo || "Não informado"],
            ["E-mail", dados.obreiro.email || "Não informado"],
            ["Telefone", dados.obreiro.telefone || "Não informado"],
            ["Loja de origem", dados.obreiro.loja_origem || "Não informada"],
          ].map(([titulo, valor]) => <div key={titulo} className="rounded-xl border border-white/10 p-3">
            <dt className="text-zinc-500">{titulo}</dt><dd className="mt-1 font-semibold">{valor}</dd>
          </div>)}
        </dl>
      </article>

      <article className="sigma-surface rounded-3xl p-6">
        <h2 className="text-xl font-black">Minha Tesouraria</h2>
        <p className="mt-4 text-3xl font-black text-amber-200">{moedaBR(resumo.totalAberto)}</p>
        <p className="text-sm text-zinc-400">Total de mensalidades pendentes</p>
        <div className="mt-4 space-y-2">{dados.mensalidades.slice(0, 8).map((item) => <div key={item.id} className="flex justify-between rounded-xl border border-white/10 p-3 text-sm">
          <span>{dataBR(item.competencia)}</span>
          <span className={item.status === "Isento" ? "font-bold text-emerald-200" : ""}>{item.status} · {moedaBR(item.valor)}</span>
        </div>)}</div>
      </article>
    </section>

    <section className="sigma-surface rounded-3xl p-6">
      <h2 className="text-xl font-black">Minha Frequência</h2>
      <p className="mt-2 text-sm text-zinc-400">{resumo.presentes} presenças · {resumo.justificadas} justificadas · {resumo.faltas} faltas</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-zinc-400"><th className="p-3">Data</th><th className="p-3">Sessão</th><th className="p-3">Situação</th><th className="p-3">Cargo</th></tr></thead>
          <tbody>{dados.presencas.map((item) => <tr key={`${item.sessao_id}-${item.obreiro_id}`} className="border-t border-white/10">
            <td className="p-3">{dataBR(item.sessoes?.data)}</td>
            <td className="p-3">{item.sessoes?.titulo || item.sessoes?.tipo}</td>
            <td className={`p-3 font-semibold ${item.status === "Justificado" ? "text-emerald-200" : ""}`}>{item.status}</td>
            <td className="p-3">{item.cargo_sessao || "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <article className="sigma-surface rounded-3xl p-6">
        <h2 className="text-xl font-black">Agenda da Loja</h2>
        <div className="mt-4 space-y-3">{dados.agenda.length ? dados.agenda.slice(0, 8).map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-3">
          <b>{item.titulo}</b><p className="text-sm text-zinc-400">{new Date(item.inicio).toLocaleString("pt-BR")} · {item.local || "Local a confirmar"}</p>
        </div>) : <EmptyState title="Nenhum evento disponível" description="A agenda pública da Loja aparecerá aqui." />}</div>
      </article>

      <article className="sigma-surface rounded-3xl p-6">
        <h2 className="text-xl font-black">Comunicados</h2>
        <div className="mt-4 space-y-3">{dados.comunicados.length ? dados.comunicados.slice(0, 8).map((item) => <div key={item.id} className={`rounded-xl border p-3 ${item.prioridade === "Urgente" ? "border-red-400/40 bg-red-400/10" : "border-white/10"}`}>
          <b>{item.titulo}</b><p className="mt-1 text-sm text-zinc-300">{item.mensagem}</p>
        </div>) : <EmptyState title="Não há comunicados novos" description="Novos avisos destinados a você aparecerão aqui." />}</div>
      </article>
    </section>

    <section className="sigma-surface rounded-3xl p-6">
      <h2 className="text-xl font-black">Documentos disponíveis</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{dados.documentos.length ? dados.documentos.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-3">
        <b>{item.titulo}</b><p className="text-xs text-zinc-500">{item.tipo} · {item.status}</p>
        {item.arquivo_url && <a href={item.arquivo_url} target="_blank" rel="noreferrer" className="text-sm text-amber-200 underline">Abrir documento</a>}
      </div>) : <EmptyState title="Nenhum documento disponível" description="Somente documentos liberados para você são exibidos." />}</div>
    </section>

    <PortalSolicitacoesClient />
  </div>;
}
