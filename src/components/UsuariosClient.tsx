"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { alterarStatusUsuario, atualizarUsuario, convidarUsuario, reenviarConvite } from "@/app/usuarios/actions";
import { EmptyState, Feedback } from "@/components/ui/Feedback";
import { FormField } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { permissoesPadrao, type PerfilSigma, type PerfilUsuario } from "@/lib/auth";
import { listarObreiros } from "@/lib/supabase/operacional";
import type { Obreiro } from "@/types";
import { lojaAtivaId } from "@/lib/loja-ativa";
import { createClient } from "@/lib/supabase/client";

const perfis: PerfilUsuario[] = ["Administrador", "Venerável Mestre", "Secretário", "Tesoureiro", "Chanceler", "Orador", "Consulta", "Obreiro"];
const rotas = ["/dashboard", "/agenda", "/obreiros", "/secretaria", "/chancelaria", "/tesouraria", "/prestacao-contas", "/patrimonio", "/documentos", "/configuracoes", "/auditoria", "/backup", "/usuarios"];
const nomesRotas: Record<string, string> = { "/dashboard": "Dashboard", "/agenda": "Agenda", "/obreiros": "Obreiros", "/secretaria": "Secretaria", "/chancelaria": "Chancelaria", "/tesouraria": "Tesouraria", "/prestacao-contas": "Prestação de contas", "/patrimonio":"Patrimônio","/documentos":"Documentos", "/configuracoes": "Configurações", "/auditoria": "Auditoria", "/backup": "Backup", "/usuarios": "Usuários" };
const vazio = { nome: "", email: "", perfil: "Obreiro" as PerfilUsuario, obreiroId: "", permissoes: permissoesPadrao("Obreiro") };
const campo = "w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white";

export function UsuariosClient({ usuarios }: { usuarios: PerfilSigma[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [obreiros, setObreiros] = useState<Obreiro[]>([]);
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState<PerfilSigma | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [mensagemErro, setMensagemErro] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [usuarioRevogar, setUsuarioRevogar] = useState<PerfilSigma | null>(null);
  const[lojaId,setLojaId]=useState("");const[vinculos,setVinculos]=useState<Record<string,string>>({});

  useEffect(() => { const id=lojaAtivaId();setLojaId(id);Promise.all([listarObreiros(),createClient().from("loja_usuarios").select("usuario_id,obreiro_id").eq("loja_id",id)]).then(([lista,res])=>{setObreiros([...lista].sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR")));setVinculos(Object.fromEntries((res.data??[]).map(v=>[v.usuario_id,v.obreiro_id??""])));}).catch(() => { setMensagemErro(true); setMensagem("Não foi possível carregar os vínculos da Loja ativa."); }); }, []);
  const filtrados = useMemo(() => usuarios.filter((usuario) => `${usuario.nome} ${usuario.email} ${usuario.perfil}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))), [usuarios, busca]);
  const ativos = usuarios.filter((usuario) => usuario.status === "ativo").length;

  function alterarPermissao(rota: string) { setForm((atual) => ({ ...atual, permissoes: atual.permissoes.includes(rota) ? atual.permissoes.filter((item) => item !== rota) : [...atual.permissoes, rota] })); }
  function cancelar() { setEditando(null); setForm(vazio); setMensagem(""); }
  function editar(usuario: PerfilSigma) { setEditando(usuario); setForm({ nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, obreiroId: vinculos[usuario.id] ?? "", permissoes: usuario.permissoes }); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function salvar(event: React.FormEvent) {
    event.preventDefault(); setEnviando(true); setMensagem(""); setMensagemErro(false);
    try {
      if(!lojaId)throw new Error("Selecione uma Loja ativa antes de salvar.");
      if (editando) await atualizarUsuario({ id: editando.id, nome: form.nome.trim(), perfil: form.perfil, lojaId, obreiroId: form.obreiroId || null, permissoes: form.permissoes });
      else await convidarUsuario({ nome: form.nome.trim(), email: form.email.trim(), perfil: form.perfil, lojaId, obreiroId: form.obreiroId || null, permissoes: form.permissoes });
      setMensagem(editando ? "Usuário atualizado com sucesso." : "Convite enviado por e-mail."); setEditando(null); setForm(vazio); router.refresh();
    } catch (erro) { setMensagemErro(true); setMensagem(erro instanceof Error ? erro.message : "Não foi possível salvar o usuário."); }
    finally { setEnviando(false); }
  }

  async function acao(callback: () => Promise<void>) { setMensagem(""); setMensagemErro(false); try { await callback(); router.refresh(); } catch (erro) { setMensagemErro(true); setMensagem(erro instanceof Error ? erro.message : "Operação não concluída."); } }

  return <div className="mt-8 space-y-6">
    <section className="grid gap-4 sm:grid-cols-3">{[["Usuários", usuarios.length, "text-white"], ["Ativos", ativos, "text-emerald-300"], ["Convites pendentes", usuarios.filter((usuario) => usuario.status === "convite_enviado").length, "text-amber-300"]].map(([titulo, valor, cor]) => <article key={String(titulo)} className="sigma-surface rounded-3xl p-5"><p className="text-sm text-zinc-400">{titulo}</p><p className={`mt-2 text-3xl font-black ${cor}`}>{valor}</p></article>)}</section>

    {mensagem && <Feedback tone={mensagemErro ? "error" : "success"}>{mensagem}</Feedback>}

    <section className="sigma-surface rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-300">Controle de acesso</p><h2 className="mt-2 text-2xl font-bold">{editando ? "Editar usuário" : "Convidar novo usuário"}</h2><p className="mt-2 text-sm text-zinc-400">Defina o perfil e conceda somente as permissões necessárias.</p></div>{editando && <StatusBadge status="Em edição" tone="warning" />}</div>
      <form onSubmit={salvar} className="mt-6 grid gap-5 md:grid-cols-2">
        <FormField id="usuario-nome" label="Nome completo" required><input id="usuario-nome" required autoComplete="name" value={form.nome} onChange={(evento) => setForm({ ...form, nome: evento.target.value })} placeholder="Ex.: João da Silva" className={campo} /></FormField>
        <FormField id="usuario-email" label="E-mail" required description={editando ? "O e-mail não pode ser alterado durante a edição." : "O convite de acesso será enviado para este endereço."}><input id="usuario-email" required disabled={Boolean(editando)} type="email" autoComplete="email" value={form.email} onChange={(evento) => setForm({ ...form, email: evento.target.value })} placeholder="nome@exemplo.com" className={campo} /></FormField>
        <FormField id="usuario-obreiro" label="Obreiro vinculado" optional description="Vínculo válido somente para a Loja ativa."><select id="usuario-obreiro" value={form.obreiroId} onChange={(evento) => { const obreiro = obreiros.find((item) => item.id === evento.target.value); setForm({ ...form, obreiroId: evento.target.value, nome: obreiro?.nome || form.nome, email: obreiro?.email || form.email }); }} className={campo}><option value="">Selecione um obreiro</option>{obreiros.map((obreiro) => <option key={obreiro.id} value={obreiro.id}>{obreiro.nome}</option>)}</select></FormField>
        <FormField id="usuario-perfil" label="Perfil de acesso" required><select id="usuario-perfil" value={form.perfil} onChange={(evento) => { const perfil = evento.target.value as PerfilUsuario; setForm({ ...form, perfil, permissoes: permissoesPadrao(perfil) }); }} className={campo}>{perfis.map((perfil) => <option key={perfil}>{perfil}</option>)}</select></FormField>
        <fieldset className="md:col-span-2"><legend className="text-sm font-medium text-zinc-200">Permissões por módulo</legend><p className="mt-1 text-xs text-zinc-500">Revise o acesso sugerido para o perfil selecionado.</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rotas.map((rota) => <label key={rota} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${form.permissoes.includes(rota) ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : "border-white/10 bg-black/15 text-zinc-400"}`}><input type="checkbox" checked={form.permissoes.includes(rota)} onChange={() => alterarPermissao(rota)} className="h-4 w-4 accent-amber-400" /><span>{nomesRotas[rota]}</span></label>)}</div></fieldset>
        <div className="flex flex-col gap-3 sm:flex-row md:col-span-2"><button disabled={enviando} className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-black transition hover:bg-amber-300">{enviando ? "Salvando…" : editando ? "Salvar alterações" : "Enviar convite"}</button>{editando && <button type="button" onClick={cancelar} className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-zinc-200 hover:bg-white/[.05]">Cancelar edição</button>}</div>
      </form>
    </section>

    <section className="sigma-surface rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-bold">Acessos cadastrados</h2><p className="mt-1 text-sm text-zinc-400">{filtrados.length} de {usuarios.length} usuário(s)</p></div><FormField id="busca-usuario" label="Pesquisar"><input id="busca-usuario" type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Nome, e-mail ou perfil" className={`${campo} md:w-80`} /></FormField></div>
      <div className="mt-5 space-y-3">{filtrados.map((usuario) => <article key={usuario.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/15 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold">{usuario.nome}</h3><StatusBadge status={usuario.status.replace("_", " ")} /></div><p className="mt-1 break-all text-sm text-zinc-400">{usuario.email}</p><p className="mt-1 text-xs text-zinc-500">Perfil: {usuario.perfil} · {usuario.permissoes.length} módulo(s)</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => editar(usuario)} className="rounded-xl border border-sky-400/25 px-3 py-2 text-sm text-sky-200 hover:bg-sky-400/10">Editar</button><button type="button" onClick={() => void acao(() => reenviarConvite(usuario.email))} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/[.05]">{usuario.status === "convite_enviado" ? "Reenviar convite" : "Redefinir senha"}</button>{usuario.status === "ativo" ? <button type="button" onClick={() => void acao(() => alterarStatusUsuario(usuario.id, "suspenso"))} className="rounded-xl border border-red-400/25 px-3 py-2 text-sm text-red-200 hover:bg-red-400/10">Suspender</button> : <button type="button" onClick={() => void acao(() => alterarStatusUsuario(usuario.id, "ativo"))} className="rounded-xl border border-emerald-400/25 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-400/10">Reativar</button>}<button type="button" onClick={() => setUsuarioRevogar(usuario)} className="rounded-xl border border-red-400/25 px-3 py-2 text-sm text-red-200 hover:bg-red-400/10">Revogar</button></div></article>)}{filtrados.length === 0 && <EmptyState title="Nenhum usuário encontrado" description={busca ? "Revise o termo pesquisado ou limpe a busca." : "Convide o primeiro usuário para começar a delegar o acesso aos módulos."} />}</div>
    </section>

    {usuarioRevogar && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setUsuarioRevogar(null); }}><section role="alertdialog" aria-modal="true" aria-labelledby="titulo-revogar" aria-describedby="descricao-revogar" className="w-full max-w-md rounded-3xl border border-red-400/25 bg-[#111312] p-6 shadow-2xl"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10 text-2xl text-red-300" aria-hidden="true">!</span><h2 id="titulo-revogar" className="mt-4 text-2xl font-bold">Revogar acesso?</h2><p id="descricao-revogar" className="mt-2 text-sm leading-6 text-zinc-400">O acesso de <strong className="text-white">{usuarioRevogar.nome}</strong> será revogado permanentemente. O usuário não poderá entrar no SIGMA 2.0 até receber um novo convite.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setUsuarioRevogar(null)} className="rounded-xl border border-white/10 px-5 py-3 font-semibold hover:bg-white/[.05]">Cancelar</button><button type="button" onClick={() => { const id = usuarioRevogar.id; setUsuarioRevogar(null); void acao(() => alterarStatusUsuario(id, "revogado")); }} className="rounded-xl bg-red-500 px-5 py-3 font-bold text-white hover:bg-red-400">Revogar acesso</button></div></section></div>}
  </div>;
}
