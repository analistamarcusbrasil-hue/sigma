"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  alterarStatusUsuario, atualizarUsuario, convidarUsuario, criarUsuarioComSenhaTemporaria,
  definirSenhaTemporaria, reenviarConvite,
} from "@/app/usuarios/actions";
import { EmptyState, Feedback } from "@/components/ui/Feedback";
import { FormField } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { permissoesPadrao, type PerfilSigma, type PerfilUsuario } from "@/lib/auth";
import { listarObreiros } from "@/lib/supabase/operacional";
import type { Obreiro } from "@/types";
import { lojaAtivaId } from "@/lib/loja-ativa";
import { createClient } from "@/lib/supabase/client";

const perfis: PerfilUsuario[] = ["Administrador", "Venerável Mestre", "Secretário", "Tesoureiro", "Chanceler", "Orador", "Consulta", "Obreiro"];
const rotas = ["/dashboard", "/agenda", "/obreiros", "/secretaria", "/chancelaria", "/tesouraria", "/prestacao-contas", "/patrimonio", "/documentos", "/configuracoes", "/auditoria", "/backup", "/usuarios", "/portal-obreiro"];
const nomesRotas: Record<string, string> = {
  "/dashboard": "Dashboard", "/agenda": "Agenda", "/obreiros": "Obreiros", "/secretaria": "Secretaria",
  "/chancelaria": "Chancelaria", "/tesouraria": "Tesouraria", "/prestacao-contas": "Prestação de contas",
  "/patrimonio": "Patrimônio", "/documentos": "Documentos", "/configuracoes": "Configurações",
  "/auditoria": "Auditoria", "/backup": "Backup", "/usuarios": "Usuários", "/portal-obreiro": "Meu Portal",
};
type Vinculo = { obreiroId: string; acessoPortal: boolean; deveTrocarSenha: boolean };
type Formulario = {
  nome: string; email: string; perfil: PerfilUsuario; obreiroId: string; permissoes: string[];
  acessoPortal: boolean; modo: "convite" | "senha"; senha: string; confirmar: string;
  mostrarSenha: boolean; obrigarTroca: boolean; motivo: string;
};
const vazio: Formulario = {
  nome: "", email: "", perfil: "Obreiro", obreiroId: "", permissoes: ["/portal-obreiro"],
  acessoPortal: true, modo: "senha", senha: "", confirmar: "", mostrarSenha: false,
  obrigarTroca: false, motivo: "",
};
const campo = "w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white";

export function UsuariosClient({ usuarios, obreiroInicialId = "", preCadastroId = "" }: { usuarios: PerfilSigma[]; obreiroInicialId?: string; preCadastroId?: string }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [obreiros, setObreiros] = useState<Obreiro[]>([]);
  const [form, setForm] = useState<Formulario>(vazio);
  const [editando, setEditando] = useState<PerfilSigma | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [mensagemErro, setMensagemErro] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [usuarioRevogar, setUsuarioRevogar] = useState<PerfilSigma | null>(null);
  const [usuarioSenha, setUsuarioSenha] = useState<PerfilSigma | null>(null);
  const [senhaModal, setSenhaModal] = useState({ senha: "", confirmar: "", mostrar: false, obrigar: false, motivo: "" });
  const [lojaId, setLojaId] = useState("");
  const [vinculos, setVinculos] = useState<Record<string, Vinculo>>({});

  useEffect(() => {
    const id = lojaAtivaId();
    setLojaId(id);
    Promise.all([
      listarObreiros(),
      createClient().from("loja_usuarios").select("usuario_id,obreiro_id,acesso_portal_obreiro,deve_trocar_senha").eq("loja_id", id),
    ]).then(([lista, res]) => {
      setObreiros([...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      if (obreiroInicialId) {
        const inicial = lista.find((item) => item.id === obreiroInicialId);
        if (inicial) setForm((atual) => ({ ...atual, obreiroId: inicial.id, nome: inicial.nome, email: inicial.email, perfil: "Obreiro", acessoPortal: false, permissoes: ["/portal-obreiro"] }));
      }
      setVinculos(Object.fromEntries((res.data ?? []).map((v) => [v.usuario_id, {
        obreiroId: v.obreiro_id ?? "", acessoPortal: Boolean(v.acesso_portal_obreiro),
        deveTrocarSenha: Boolean(v.deve_trocar_senha),
      }])));
    }).catch(() => {
      setMensagemErro(true);
      setMensagem("Não foi possível carregar os vínculos da Loja ativa.");
    });
  }, [obreiroInicialId]);

  const filtrados = useMemo(() => usuarios.filter((usuario) =>
    (usuario.nome + " " + usuario.email + " " + usuario.perfil).toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))
  ), [usuarios, busca]);
  const ativos = usuarios.filter((usuario) => usuario.status === "ativo").length;
  const senhaValida = form.senha.length >= 6;

  function alterarPermissao(rota: string) {
    setForm((atual) => ({ ...atual, permissoes: atual.permissoes.includes(rota)
      ? atual.permissoes.filter((item) => item !== rota) : [...atual.permissoes, rota] }));
  }
  function cancelar() { setEditando(null); setForm(vazio); setMensagem(""); }
  function editar(usuario: PerfilSigma) {
    const vinculo = vinculos[usuario.id];
    setEditando(usuario);
    setForm({ ...vazio, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil,
      obreiroId: vinculo?.obreiroId ?? "", permissoes: usuario.perfil === "Obreiro" ? ["/portal-obreiro"] : usuario.permissoes,
      acessoPortal: usuario.perfil === "Obreiro" || Boolean(vinculo?.acessoPortal) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar(event: React.FormEvent) {
    event.preventDefault(); setEnviando(true); setMensagem(""); setMensagemErro(false);
    try {
      if (!lojaId) throw new Error("Selecione uma Loja ativa antes de salvar.");
      const comum = { nome: form.nome.trim(), email: form.email.trim(), perfil: form.perfil, lojaId,
        obreiroId: form.obreiroId || null, permissoes: form.permissoes, acessoPortal: form.acessoPortal, preCadastroId: preCadastroId || undefined };
      if (editando) {
        await atualizarUsuario({ id: editando.id, nome: comum.nome, perfil: comum.perfil, lojaId,
          obreiroId: comum.obreiroId, permissoes: comum.permissoes, acessoPortal: comum.acessoPortal });
        if (form.senha || form.confirmar) {
          await definirSenhaTemporaria({ usuarioId: editando.id, lojaId, senhaTemporaria: form.senha,
            confirmacaoSenha: form.confirmar, obrigarTroca: form.obrigarTroca, motivo: form.motivo });
          setMensagem("Usuário atualizado e senha definida pelo Administrador.");
        } else setMensagem("Usuário atualizado com sucesso.");
      } else if (form.modo === "senha") {
        await criarUsuarioComSenhaTemporaria({ ...comum, senhaTemporaria: form.senha,
          confirmacaoSenha: form.confirmar, obrigarTroca: form.obrigarTroca, motivo: form.motivo });
        setMensagem("Usuário ativo e senha definida pelo Administrador. Ela continuará válida até ser alterada.");
      } else {
        await convidarUsuario(comum);
        setMensagem("Convite enviado por e-mail.");
      }
      setEditando(null); setForm(vazio); router.refresh();
    } catch (erro) {
      setMensagemErro(true); setMensagem(erro instanceof Error ? erro.message : "Não foi possível salvar o usuário.");
    } finally { setEnviando(false); }
  }

  async function acao(callback: () => Promise<void>) {
    setMensagem(""); setMensagemErro(false);
    try { await callback(); router.refresh(); }
    catch (erro) { setMensagemErro(true); setMensagem(erro instanceof Error ? erro.message : "Operação não concluída."); }
  }

  async function salvarSenhaModal() {
    if (!usuarioSenha) return;
    setEnviando(true); setMensagem(""); setMensagemErro(false);
    try {
      await definirSenhaTemporaria({ usuarioId: usuarioSenha.id, lojaId, senhaTemporaria: senhaModal.senha,
        confirmacaoSenha: senhaModal.confirmar, obrigarTroca: senhaModal.obrigar, motivo: senhaModal.motivo });
      setMensagem("Senha temporária redefinida. Nenhuma senha foi armazenada ou registrada na auditoria.");
      setUsuarioSenha(null); setSenhaModal({ senha: "", confirmar: "", mostrar: false, obrigar: false, motivo: "" });
      router.refresh();
    } catch (erro) {
      setMensagemErro(true); setMensagem(erro instanceof Error ? erro.message : "Não foi possível definir a senha.");
    } finally { setEnviando(false); }
  }

  return <div className="mt-8 space-y-6">
    <section className="grid gap-4 sm:grid-cols-3">
      {[["Usuários", usuarios.length], ["Ativos", ativos], ["Convites pendentes", usuarios.filter((u) => u.status === "convite_enviado").length]].map(([titulo, valor]) =>
        <article key={String(titulo)} className="sigma-surface rounded-3xl p-5"><p className="text-sm text-zinc-400">{titulo}</p><p className="mt-2 text-3xl font-black">{valor}</p></article>)}
    </section>
    {mensagem && <Feedback tone={mensagemErro ? "error" : "success"}>{mensagem}</Feedback>}

    <section className="sigma-surface rounded-3xl p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-300">Controle de acesso</p>
      <h2 className="mt-2 text-2xl font-bold">{editando ? "Editar usuário" : "Cadastrar usuário"}</h2>
      <p className="mt-2 text-sm text-zinc-400">Envie convite por e-mail ou defina diretamente a senha inicial do usuário.</p>
      {!editando && <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => setForm({ ...form, modo: "convite" })} className={form.modo === "convite" ? "rounded-xl bg-amber-400 px-4 py-2 font-bold text-black" : "rounded-xl border border-white/10 px-4 py-2"}>Convite por e-mail</button>
        <button type="button" onClick={() => setForm({ ...form, modo: "senha" })} className={form.modo === "senha" ? "rounded-xl bg-amber-400 px-4 py-2 font-bold text-black" : "rounded-xl border border-white/10 px-4 py-2"}>Senha definida pelo Administrador</button>
      </div>}
      <form onSubmit={salvar} className="mt-6 grid gap-5 md:grid-cols-2">
        <FormField id="usuario-nome" label="Nome completo" required><input id="usuario-nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={campo} /></FormField>
        <FormField id="usuario-email" label="E-mail" required><input id="usuario-email" required disabled={Boolean(editando)} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={campo} /></FormField>
        <FormField id="usuario-obreiro" label="Obreiro vinculado" optional description="Obrigatório para quem acessa o Portal.">
          <select id="usuario-obreiro" value={form.obreiroId} onChange={(e) => {
            const obreiro = obreiros.find((item) => item.id === e.target.value);
            setForm({ ...form, obreiroId: e.target.value, nome: obreiro?.nome || form.nome, email: obreiro?.email || form.email });
          }} className={campo}><option value="">Selecione um obreiro</option>{obreiros.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}</select>
        </FormField>
        <FormField id="usuario-perfil" label="Perfil de acesso" required>
          <select id="usuario-perfil" value={form.perfil} onChange={(e) => {
            const perfil = e.target.value as PerfilUsuario;
            setForm({ ...form, perfil, permissoes: perfil === "Obreiro" ? ["/portal-obreiro"] : permissoesPadrao(perfil) });
          }} className={campo}>{perfis.map((perfil) => <option key={perfil}>{perfil}</option>)}</select>
        </FormField>
        <label className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 md:col-span-2">
          <input type="checkbox" checked={form.acessoPortal} onChange={(e) => setForm({ ...form, acessoPortal: e.target.checked })} className="mt-1 h-4 w-4 accent-amber-400" />
          <span><b>Liberar “Meu Portal” nesta Loja</b><small className="mt-1 block text-zinc-400">Exige status ativo e Obreiro vinculado. O próprio usuário não pode alterar esta opção.</small></span>
        </label>

        {form.modo === "senha" && <>
          <FormField id="senha-temporaria" label={editando ? "Nova senha definida pelo Administrador (opcional)" : "Senha definida pelo Administrador"} required={!editando} description="Pode ser qualquer senha com pelo menos 6 caracteres. Ela continuará válida enquanto a troca obrigatória não for marcada.">
            <div className="flex gap-2"><input id="senha-temporaria" required={!editando} minLength={6} type={form.mostrarSenha ? "text" : "password"} autoComplete="new-password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className={campo} />
            <button type="button" onClick={() => setForm({ ...form, mostrarSenha: !form.mostrarSenha })} className="rounded-xl border border-white/10 px-3">{form.mostrarSenha ? "Ocultar" : "Mostrar"}</button></div>
          </FormField>
          <FormField id="confirmar-senha" label="Confirmar senha" required={!editando}><input id="confirmar-senha" required={!editando} minLength={6} type={form.mostrarSenha ? "text" : "password"} autoComplete="new-password" value={form.confirmar} onChange={(e) => setForm({ ...form, confirmar: e.target.value })} className={campo} /></FormField>
          <div className="rounded-xl border border-white/10 p-4 text-sm md:col-span-2">
            <p className={senhaValida ? "text-emerald-300" : "text-zinc-400"}>{senhaValida ? "✓ Senha aceita" : "Use pelo menos 6 caracteres."}</p>
            {form.confirmar && <p className={form.senha === form.confirmar ? "mt-1 text-emerald-300" : "mt-1 text-red-300"}>{form.senha === form.confirmar ? "✓ Confirmação correta" : "As senhas não conferem."}</p>}
          </div>
          <FormField id="motivo-senha" label="Motivo administrativo" required={!editando || Boolean(form.senha || form.confirmar)}><input id="motivo-senha" required={!editando || Boolean(form.senha || form.confirmar)} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={campo} placeholder="Ex.: primeiro acesso assistido" /></FormField>
          <label className="flex items-center gap-3 rounded-xl border border-white/10 p-4"><input type="checkbox" checked={form.obrigarTroca} onChange={(e) => setForm({ ...form, obrigarTroca: e.target.checked })} className="h-4 w-4 accent-amber-400" />Exigir troca no próximo login (opcional)</label>
        </>}

        <fieldset className="md:col-span-2"><legend className="text-sm font-medium">Permissões por módulo</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rotas.map((rota) => <label key={rota} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-3 py-2 text-sm">
            <input type="checkbox" disabled={form.perfil === "Obreiro"} checked={form.permissoes.includes(rota)} onChange={() => alterarPermissao(rota)} className="h-4 w-4 accent-amber-400" /><span>{nomesRotas[rota]}</span>
          </label>)}</div>
        </fieldset>
        <div className="flex gap-3 md:col-span-2"><button disabled={enviando} className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-black">{enviando ? "Salvando…" : editando ? "Salvar alterações" : form.modo === "senha" ? "Criar acesso com a senha informada" : "Enviar convite"}</button>{editando && <button type="button" onClick={cancelar} className="rounded-xl border border-white/10 px-6 py-3">Cancelar</button>}</div>
      </form>
    </section>

    <section className="sigma-surface rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-bold">Acessos cadastrados</h2><p className="text-sm text-zinc-400">{filtrados.length} de {usuarios.length} usuário(s)</p></div><FormField id="busca-usuario" label="Pesquisar"><input id="busca-usuario" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} className={campo} /></FormField></div>
      <div className="mt-5 space-y-3">{filtrados.map((usuario) => {
        const vinculo = vinculos[usuario.id];
        return <article key={usuario.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/15 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold">{usuario.nome}</h3><StatusBadge status={usuario.status.replace("_", " ")} />{vinculo?.acessoPortal && <StatusBadge status="Portal liberado" tone="success" />}{vinculo?.deveTrocarSenha && <StatusBadge status="Troca de senha pendente" tone="warning" />}</div><p className="mt-1 break-all text-sm text-zinc-400">{usuario.email}</p><p className="mt-1 text-xs text-zinc-500">Perfil: {usuario.perfil}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => editar(usuario)} className="rounded-xl border border-sky-400/25 px-3 py-2 text-sm text-sky-200">Editar</button><button type="button" onClick={() => setUsuarioSenha(usuario)} className="rounded-xl border border-amber-400/25 px-3 py-2 text-sm text-amber-200">Definir senha temporária</button><button type="button" onClick={() => void acao(() => reenviarConvite(usuario.email))} className="rounded-xl border border-white/10 px-3 py-2 text-sm">Enviar link por e-mail</button>{usuario.status === "ativo" ? <button type="button" onClick={() => void acao(() => alterarStatusUsuario(usuario.id, "suspenso"))} className="rounded-xl border border-red-400/25 px-3 py-2 text-sm text-red-200">Suspender</button> : <button type="button" onClick={() => void acao(() => alterarStatusUsuario(usuario.id, "ativo"))} className="rounded-xl border border-emerald-400/25 px-3 py-2 text-sm text-emerald-200">Reativar</button>}<button type="button" onClick={() => setUsuarioRevogar(usuario)} className="rounded-xl border border-red-400/25 px-3 py-2 text-sm text-red-200">Revogar</button></div>
        </article>;
      })}{filtrados.length === 0 && <EmptyState title="Nenhum usuário encontrado" description="Revise a busca ou cadastre o primeiro acesso." />}</div>
    </section>

    {usuarioSenha && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"><section role="dialog" aria-modal="true" className="w-full max-w-xl rounded-3xl border border-amber-400/25 bg-[#111312] p-6"><h2 className="text-2xl font-bold">Definir senha para o usuário</h2><p className="mt-2 text-sm text-zinc-400">{usuarioSenha.nome} · {usuarioSenha.email}</p><div className="mt-5 grid gap-4">
      <FormField id="modal-senha" label="Senha definida pelo Administrador" required description="Qualquer senha com pelo menos 6 caracteres."><div className="flex gap-2"><input id="modal-senha" minLength={6} type={senhaModal.mostrar ? "text" : "password"} value={senhaModal.senha} onChange={(e) => setSenhaModal({ ...senhaModal, senha: e.target.value })} className={campo} /><button type="button" onClick={() => setSenhaModal({ ...senhaModal, mostrar: !senhaModal.mostrar })} className="rounded-xl border border-white/10 px-3">{senhaModal.mostrar ? "Ocultar" : "Mostrar"}</button></div></FormField>
      <FormField id="modal-confirmar" label="Confirmar senha" required><input id="modal-confirmar" minLength={6} type={senhaModal.mostrar ? "text" : "password"} value={senhaModal.confirmar} onChange={(e) => setSenhaModal({ ...senhaModal, confirmar: e.target.value })} className={campo} /></FormField>
      <FormField id="modal-motivo" label="Motivo administrativo" required><input id="modal-motivo" value={senhaModal.motivo} onChange={(e) => setSenhaModal({ ...senhaModal, motivo: e.target.value })} className={campo} /></FormField>
      <label className="flex items-center gap-3"><input type="checkbox" checked={senhaModal.obrigar} onChange={(e) => setSenhaModal({ ...senhaModal, obrigar: e.target.checked })} className="h-4 w-4 accent-amber-400" />Exigir troca no próximo login (opcional)</label>
      <p className="text-xs text-zinc-500">A senha será enviada somente ao Supabase Auth. Ela não será salva no banco, logs ou auditoria.</p>
    </div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setUsuarioSenha(null)} className="rounded-xl border border-white/10 px-5 py-3">Cancelar</button><button type="button" disabled={enviando} onClick={() => void salvarSenhaModal()} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-black">Salvar senha informada</button></div></section></div>}

    {usuarioRevogar && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"><section role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-3xl border border-red-400/25 bg-[#111312] p-6"><h2 className="text-2xl font-bold">Revogar acesso?</h2><p className="mt-2 text-sm text-zinc-400">O acesso de <strong className="text-white">{usuarioRevogar.nome}</strong> será revogado.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setUsuarioRevogar(null)} className="rounded-xl border border-white/10 px-5 py-3">Cancelar</button><button type="button" onClick={() => { const id = usuarioRevogar.id; setUsuarioRevogar(null); void acao(() => alterarStatusUsuario(id, "revogado")); }} className="rounded-xl bg-red-500 px-5 py-3 font-bold">Revogar</button></div></section></div>}
  </div>;
}
