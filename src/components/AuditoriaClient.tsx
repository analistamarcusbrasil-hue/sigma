"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/Feedback";
import { FormField } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listarAuditoria, type EventoAuditoria } from "@/lib/supabase/operacional";

const nomesTabelas: Record<string, string> = { obreiros: "Obreiros", sessoes: "Sessões", administracoes: "Administração", mensalidades: "Mensalidades", recebimentos: "Recebimentos", tronco_solidariedade: "Tronco", documentos_secretaria: "Documentos", acoes_secretaria: "Ações", processos_secretaria: "Processos", regras_mensalidade: "Regras financeiras", lancamentos_financeiros: "Lançamentos", custos_loja: "Custos", pecas_arquitetura: "Peças", decisoes_loja: "Decisões", lojas: "Loja" };
const nomesOperacao = { INSERT: "Criação", UPDATE: "Alteração", DELETE: "Exclusão" } as const;
const camposIgnorados = new Set(["created_at", "updated_at", "loja_id"]);

function formatarData(data: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(data)); }
function formatarValor(valor: unknown) { if (valor === null || valor === undefined || valor === "") return "—"; if (typeof valor === "boolean") return valor ? "Sim" : "Não"; if (typeof valor === "object") return JSON.stringify(valor); return String(valor); }

export function AuditoriaClient() {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [tabela, setTabela] = useState("Todas");
  const [operacao, setOperacao] = useState("Todas");
  const [aberto, setAberto] = useState<number | null>(null);

  useEffect(() => { listarAuditoria().then(setEventos).catch((falha: unknown) => setErro(falha instanceof Error ? falha.message : "Não foi possível carregar a auditoria.")).finally(() => setCarregando(false)); }, []);
  const tabelas = useMemo(() => [...new Set(eventos.map((evento) => evento.tabela))].sort(), [eventos]);
  const filtrados = useMemo(() => eventos.filter((evento) => tabela === "Todas" || evento.tabela === tabela).filter((evento) => operacao === "Todas" || evento.operacao === operacao).filter((evento) => { const termo = busca.trim().toLocaleLowerCase("pt-BR"); return !termo || `${nomesTabelas[evento.tabela] ?? evento.tabela} ${evento.registroId ?? ""} ${evento.usuarioId ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo); }), [eventos, tabela, operacao, busca]);
  const totais = useMemo(() => ({ criacoes: eventos.filter((evento) => evento.operacao === "INSERT").length, alteracoes: eventos.filter((evento) => evento.operacao === "UPDATE").length, exclusoes: eventos.filter((evento) => evento.operacao === "DELETE").length }), [eventos]);

  if (carregando) return <div className="mt-8"><LoadingState label="Carregando histórico de auditoria…" /></div>;
  return <div className="mt-8 space-y-6">
    {erro && <Feedback tone="error">{erro.includes("auditoria_eventos") ? "A migration de auditoria ainda não foi aplicada no Supabase. Aplique 20260715_create_audit_log.sql para ativar este módulo." : erro}</Feedback>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Eventos", eventos.length, "text-white"], ["Criações", totais.criacoes, "text-emerald-300"], ["Alterações", totais.alteracoes, "text-amber-300"], ["Exclusões", totais.exclusoes, "text-red-300"]].map(([titulo, valor, cor]) => <article key={String(titulo)} className="sigma-surface rounded-3xl p-5"><p className="text-sm text-zinc-400">{titulo}</p><p className={`mt-2 text-3xl font-black ${cor}`}>{valor}</p></article>)}</section>
    <section className="sigma-surface rounded-3xl p-5 sm:p-6"><div className="flex flex-col gap-2"><h2 className="text-2xl font-bold">Histórico operacional</h2><p className="text-sm text-zinc-400">Os registros são somente leitura e separados por Loja.</p></div><div className="mt-5 grid gap-4 md:grid-cols-3"><FormField id="auditoria-busca" label="Pesquisar"><input id="auditoria-busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Registro ou usuário" className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3" /></FormField><FormField id="auditoria-modulo" label="Módulo"><select id="auditoria-modulo" value={tabela} onChange={(e) => setTabela(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3"><option>Todas</option>{tabelas.map((item) => <option key={item} value={item}>{nomesTabelas[item] ?? item}</option>)}</select></FormField><FormField id="auditoria-operacao" label="Operação"><select id="auditoria-operacao" value={operacao} onChange={(e) => setOperacao(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3"><option>Todas</option><option value="INSERT">Criação</option><option value="UPDATE">Alteração</option><option value="DELETE">Exclusão</option></select></FormField></div>
      <div className="mt-6 space-y-3">{filtrados.map((evento) => { const detalhes = Object.entries(evento.alteracoes).filter(([campo]) => !camposIgnorados.has(campo)); const expandido = aberto === evento.id; return <article key={evento.id} className="rounded-2xl border border-white/10 bg-black/15"><button type="button" onClick={() => setAberto(expandido ? null : evento.id)} aria-expanded={expandido} className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{nomesTabelas[evento.tabela] ?? evento.tabela}</h3><StatusBadge status={nomesOperacao[evento.operacao]} tone={evento.operacao === "INSERT" ? "success" : evento.operacao === "DELETE" ? "danger" : "warning"} /></div><p className="mt-1 text-xs text-zinc-500">{formatarData(evento.ocorridoEm)} · Registro {evento.registroId?.slice(0, 12) ?? "sem identificador"}</p></div><span className="text-sm font-semibold text-amber-300">{detalhes.length} campo(s) {expandido ? "↑" : "↓"}</span></button>{expandido && <div className="border-t border-white/10 p-4"><p className="mb-3 text-xs text-zinc-500">Responsável: {evento.usuarioId ?? "Operação do sistema"}</p>{detalhes.length ? <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-white/[.04]"><tr><th className="p-3">Campo</th><th className="p-3">Antes</th><th className="p-3">Depois</th></tr></thead><tbody>{detalhes.map(([campo, valores]) => <tr key={campo} className="border-t border-white/[.06]"><td className="p-3 font-medium text-zinc-300">{campo.replaceAll("_", " ")}</td><td className="max-w-64 break-words p-3 text-zinc-500">{formatarValor(valores.antes)}</td><td className="max-w-64 break-words p-3 text-zinc-200">{formatarValor(valores.depois)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-zinc-500">O registro completo foi {evento.operacao === "INSERT" ? "criado" : "excluído"}.</p>}</div>}</article>; })}{!erro && filtrados.length === 0 && <EmptyState title="Nenhum evento encontrado" description={eventos.length ? "Revise os filtros aplicados." : "As próximas alterações nos módulos auditados aparecerão aqui."} />}</div>
    </section>
  </div>;
}
