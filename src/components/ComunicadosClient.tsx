"use client";

import { useEffect, useState } from "react";
import { listarComunicados, type ComunicadoPortal } from "@/lib/supabase/portal";
import { salvarComunicadoComEmail } from "@/app/comunicados/actions";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/Feedback";
import { FormField } from "@/components/ui/FormField";

const campo = "w-full rounded-xl border border-white/10 bg-black/25 p-3";
const vazio: ComunicadoPortal = { id: "", titulo: "", mensagem: "", tipo: "Aviso", prioridade: "Normal", publicoAlvo: "Todos os obreiros", status: "Rascunho", publicadoEm: "", expiraEm: "" };

export function ComunicadosClient() {
  const [itens, setItens] = useState<ComunicadoPortal[]>([]);
  const [form, setForm] = useState(vazio);
  const [formAberto, setFormAberto] = useState(false);
  const [load, setLoad] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => { listarComunicados().then(setItens).catch((e) => setErro(e.message)).finally(() => setLoad(false)); }, []);

  async function salvar() {
    if (!form.titulo.trim() || !form.mensagem.trim()) return setErro("Informe título e mensagem.");
    try {
      setSalvando(true); setErro(""); setOk("");
      const resultado = await salvarComunicadoComEmail(form);
      if (!resultado.ok) throw new Error(resultado.erro);
      setItens(await listarComunicados());
      setForm(vazio); setFormAberto(false);
      setOk(form.status === "Publicado" ? "Comunicado publicado e notificações por e-mail processadas." : "Rascunho salvo com sucesso.");
    } catch (e) { setErro(e instanceof Error ? e.message : "Erro ao salvar."); }
    finally { setSalvando(false); }
  }

  function editar(item: ComunicadoPortal) { setForm(item); setFormAberto(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  if (load) return <LoadingState />;

  return <div className="mt-5 space-y-4 sm:mt-8 sm:space-y-6">
    {erro && <Feedback tone="error">{erro}</Feedback>}{ok && <Feedback tone="success">{ok}</Feedback>}

    <section className="sigma-surface rounded-2xl p-4 sm:rounded-3xl sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-black">Comunicados internos</h2><p className="mt-1 text-sm text-zinc-400">{itens.length} comunicado(s) nesta Loja.</p></div>
        <button type="button" onClick={() => { setForm(vazio); setFormAberto((valor) => !valor); }} className="min-h-11 w-full rounded-xl bg-amber-400 px-5 py-3 font-black text-black sm:w-auto">{formAberto ? "Recolher formulário" : "Novo comunicado"}</button>
      </div>

      {formAberto && <form onSubmit={(e) => { e.preventDefault(); void salvar(); }} className="mt-5 grid gap-4 border-t border-white/10 pt-5">
        <h3 className="font-black">{form.id ? "Editar comunicado" : "Novo comunicado"}</h3>
        <FormField id="com-titulo" label="Título" required><input id="com-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className={campo} /></FormField>
        <FormField id="com-msg" label="Mensagem" required description="Use texto curto e objetivo para facilitar a leitura no celular."><textarea id="com-msg" rows={5} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} className={campo} /></FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="com-tipo" label="Tipo"><select id="com-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={campo}>{["Aviso", "Convocação", "Comunicado da Secretaria", "Comunicado da Tesouraria", "Comunicado da Chancelaria", "Evento", "Urgente", "Outro"].map((item) => <option key={item}>{item}</option>)}</select></FormField>
          <FormField id="com-prio" label="Prioridade"><select id="com-prio" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} className={campo}>{["Baixa", "Normal", "Alta", "Urgente"].map((item) => <option key={item}>{item}</option>)}</select></FormField>
          <FormField id="com-publico" label="Público alvo"><select id="com-publico" value={form.publicoAlvo} onChange={(e) => setForm({ ...form, publicoAlvo: e.target.value })} className={campo}>{["Todos os obreiros", "Diretoria", "Tesoureiro", "Secretário", "Chanceler", "Obreiro"].map((item) => <option key={item}>{item}</option>)}</select></FormField>
          <FormField id="com-status" label="Status"><select id="com-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={campo}>{["Rascunho", "Publicado", "Arquivado", "Expirado"].map((item) => <option key={item}>{item}</option>)}</select></FormField>
        </div>
        <div className="grid gap-2 sm:flex"><button disabled={salvando} className="min-h-12 rounded-xl bg-amber-400 px-6 py-3 font-bold text-black disabled:opacity-50">{salvando ? "Salvando…" : form.status === "Publicado" ? "Publicar comunicado" : "Salvar rascunho"}</button><button type="button" onClick={() => { setForm(vazio); setFormAberto(false); }} className="min-h-12 rounded-xl border border-white/10 px-6 py-3">Cancelar</button></div>
      </form>}

      <div className="mt-5 grid gap-3 lg:grid-cols-2">{itens.length ? itens.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words font-bold">{item.titulo}</h3><p className="mt-1 text-xs text-zinc-400">{item.tipo} · {item.prioridade} · {item.publicoAlvo}</p></div><span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-200">{item.status}</span></div>
        <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm text-zinc-300">{item.mensagem}</p>
        <button type="button" onClick={() => editar(item)} className="mt-3 min-h-11 w-full rounded-xl border border-sky-400/25 px-4 py-2 text-sm font-bold text-sky-200 sm:w-auto">Ver e editar</button>
      </article>) : <EmptyState title="Nenhum comunicado" description="Crie o primeiro comunicado interno da Loja." />}</div>
    </section>
  </div>;
}
