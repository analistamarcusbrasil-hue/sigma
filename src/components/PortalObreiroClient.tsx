"use client";

import { useEffect, useMemo, useState } from "react";
import { carregarPortal } from "@/lib/supabase/portal";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/Feedback";
import { PortalSolicitacoesClient } from "@/components/PortalSolicitacoesClient";
import { moedaBR, dataBR } from "@/lib/formatacao";

type Dados = Awaited<ReturnType<typeof carregarPortal>>;
const encerrada = (status: string) => ["Aprovada", "Recusada", "Concluída", "Cancelada"].includes(status);
const painel = "group sigma-surface rounded-2xl p-4 sm:rounded-3xl sm:p-5";

function TituloPainel({ titulo, resumo }: { titulo: string; resumo: string }) {
  return <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 marker:content-none">
    <span><b className="block text-base sm:text-lg">{titulo}</b><small className="mt-0.5 block text-zinc-400">{resumo}</small></span>
    <span aria-hidden="true" className="text-xl text-amber-300 transition group-open:rotate-45">+</span>
  </summary>;
}

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
    return { presentes, justificadas, faltas, frequencia, abertas, totalAberto: abertas.reduce((soma, item) => soma + Number(item.valor || 0), 0) };
  }, [dados]);

  if (!dados && !erro) return <LoadingState />;
  if (erro && !dados) return <Feedback tone="error">{erro}</Feedback>;
  if (!dados?.obreiro) return <Feedback tone="warning">Seu usuário ainda não está vinculado ao cadastro de Obreiro. Solicite regularização à Secretaria da Loja.</Feedback>;

  const andamento = dados.solicitacoes.filter((item) => !encerrada(item.status)).length;
  return <div className="mt-5 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:mt-8 sm:space-y-6">
    <section className="flex flex-col gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Olá, {dados.obreiro.nome.split(" ")[0]}</p><p className="mt-1 text-sm text-zinc-300">Consulte sua situação ou envie um pedido à Loja.</p></div>
      <a href="#nova-solicitacao" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black">Nova solicitação</a>
    </section>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        ["Cadastro", dados.obreiro.situacao],
        ["Frequência", `${resumo.frequencia}%`],
        ["Mensalidades", resumo.abertas.length],
        ["Em andamento", andamento],
      ].map(([titulo, valor]) => <article key={String(titulo)} className="sigma-surface min-w-0 rounded-2xl p-4 sm:p-5">
        <p className="truncate text-xs text-zinc-400 sm:text-sm">{titulo}</p><p className="mt-1 truncate text-xl font-black text-amber-200 sm:mt-2 sm:text-2xl">{valor}</p>
      </article>)}
    </section>

    <Feedback tone="info">Cada área emite seu parecer; a decisão final é do Venerável Mestre. Você acompanha toda a tramitação abaixo.</Feedback>

    <section className="grid gap-3 lg:grid-cols-2">
      <details className={painel}>
        <TituloPainel titulo="Meus dados" resumo={`${dados.obreiro.grau} · ${dados.obreiro.cargo || "Cargo não informado"}`} />
        <dl className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
          {[["Nome", dados.obreiro.nome], ["Grau", dados.obreiro.grau], ["Cargo", dados.obreiro.cargo || "Não informado"], ["E-mail", dados.obreiro.email || "Não informado"], ["Telefone", dados.obreiro.telefone || "Não informado"], ["Loja de origem", dados.obreiro.loja_origem || "Não informada"]].map(([titulo, valor]) => <div key={titulo} className="rounded-xl border border-white/10 p-3"><dt className="text-zinc-500">{titulo}</dt><dd className="mt-1 break-words font-semibold">{valor}</dd></div>)}
        </dl>
      </details>

      <details className={painel}>
        <TituloPainel titulo="Minha tesouraria" resumo={`${moedaBR(resumo.totalAberto)} pendente · ${resumo.abertas.length} mensalidade(s)`} />
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">{dados.mensalidades.slice(0, 8).map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-white/10 p-3 text-sm"><span>{dataBR(item.competencia)}</span><span className={item.status === "Isento" ? "font-bold text-emerald-200" : ""}>{item.status} · {moedaBR(item.valor)}</span></div>)}</div>
      </details>

      <details className={painel}>
        <TituloPainel titulo="Minha frequência" resumo={`${resumo.presentes} presentes · ${resumo.justificadas} justificadas · ${resumo.faltas} faltas`} />
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">{dados.presencas.map((item) => <article key={`${item.sessao_id}-${item.obreiro_id}`} className="rounded-xl border border-white/10 p-3 text-sm"><div className="flex justify-between gap-3"><b>{dataBR(item.sessoes?.data)}</b><span className={item.status === "Justificado" ? "font-bold text-emerald-200" : "font-semibold"}>{item.status}</span></div><p className="mt-1 text-zinc-400">{item.sessoes?.titulo || item.sessoes?.tipo} · {item.cargo_sessao || "Sem cargo"}</p></article>)}</div>
      </details>

      <details className={painel}>
        <TituloPainel titulo="Agenda da Loja" resumo={`${dados.agenda.length} compromisso(s) disponível(is)`} />
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">{dados.agenda.length ? dados.agenda.slice(0, 8).map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-3"><b>{item.titulo}</b><p className="mt-1 text-sm text-zinc-400">{new Date(item.inicio).toLocaleString("pt-BR")} · {item.local || "Local a confirmar"}</p></div>) : <EmptyState title="Nenhum evento disponível" description="A agenda pública da Loja aparecerá aqui." />}</div>
      </details>

      <details className={painel}>
        <TituloPainel titulo="Comunicados" resumo={`${dados.comunicados.length} aviso(s)`} />
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">{dados.comunicados.length ? dados.comunicados.slice(0, 8).map((item) => <div key={item.id} className={`rounded-xl border p-3 ${item.prioridade === "Urgente" ? "border-red-400/40 bg-red-400/10" : "border-white/10"}`}><b>{item.titulo}</b><p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-300">{item.mensagem}</p></div>) : <EmptyState title="Não há comunicados novos" description="Novos avisos aparecerão aqui." />}</div>
      </details>

      <details className={painel}>
        <TituloPainel titulo="Documentos" resumo={`${dados.documentos.length} documento(s) disponível(is)`} />
        <div className="mt-4 grid gap-2 border-t border-white/10 pt-4">{dados.documentos.length ? dados.documentos.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-3"><b>{item.titulo}</b><p className="text-xs text-zinc-500">{item.tipo} · {item.status}</p>{item.arquivo_url && <a href={item.arquivo_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-amber-200 underline">Baixar documento</a>}</div>) : <EmptyState title="Nenhum documento disponível" description="Somente documentos liberados para você são exibidos." />}</div>
      </details>
    </section>

    <PortalSolicitacoesClient />
  </div>;
}
