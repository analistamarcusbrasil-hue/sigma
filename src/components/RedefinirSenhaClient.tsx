"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ativarPerfilAposDefinirSenha } from "@/app/redefinir-senha/actions";
import { createClient } from "@/lib/supabase/client";

export function RedefinirSenhaClient() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const requisitos = [
    ["Pelo menos 8 caracteres", senha.length >= 8],
    ["Uma letra maiúscula", /[A-ZÀ-Ý]/.test(senha)],
    ["Uma letra minúscula", /[a-zà-ÿ]/.test(senha)],
    ["Um número", /\d/.test(senha)],
  ] as const;
  const senhaValida = requisitos.every(([, atendido]) => atendido);
  const senhasIguais = confirmacao.length > 0 && senha === confirmacao;

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setErro("");
    if (!senhaValida) return setErro("A senha ainda não atende a todos os requisitos abaixo.");
    if (!senhasIguais) return setErro("As duas senhas não são iguais. Corrija e tente novamente.");
    setEnviando(true);
    const { error } = await createClient().auth.updateUser({ password: senha });
    if (error) { setErro(/session|expired|token|jwt/i.test(error.message) ? "Este link expirou ou já foi usado. Solicite um novo link abaixo." : "Não foi possível salvar essa senha. Escolha outra e tente novamente."); setEnviando(false); return; }
    try { await ativarPerfilAposDefinirSenha(); setSucesso(true); window.setTimeout(() => router.replace("/login"), 1800); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível ativar o acesso."); setEnviando(false); }
  }

  return <main className="min-h-screen bg-[#070707] px-4 py-8 text-white"><section className="mx-auto mt-12 max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.04] p-8"><p className="text-sm uppercase tracking-[0.25em] text-amber-300">Primeiro acesso</p><h1 className="mt-3 text-3xl font-bold">Crie sua senha</h1><p className="mt-2 text-sm text-zinc-400">Use uma senha segura e digite-a novamente para confirmar.</p>{sucesso ? <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-emerald-100"><b>Senha criada e acesso ativado.</b><p className="mt-1 text-sm">Você já pode entrar no Meu Portal.</p></div> : <form onSubmit={salvar} className="mt-6 space-y-5">{erro && <div aria-live="polite" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{erro}</div>}<label className="block"><span className="mb-2 block text-sm">Nova senha</span><div className="flex gap-2"><input required minLength={8} autoComplete="new-password" type={mostrarSenha ? "text" : "password"} value={senha} onChange={(e) => { setSenha(e.target.value); setErro(""); }} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3"/><button type="button" onClick={() => setMostrarSenha((v) => !v)} className="rounded-xl border border-white/10 px-4 text-sm">{mostrarSenha ? "Ocultar" : "Mostrar"}</button></div></label><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><b className="text-sm">Sua senha precisa ter:</b><ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{requisitos.map(([texto, atendido]) => <li key={texto} className={atendido ? "text-emerald-300" : "text-zinc-500"}>{atendido ? "✓" : "○"} {texto}</li>)}</ul></div><label className="block"><span className="mb-2 block text-sm">Confirme a nova senha</span><input required minLength={8} autoComplete="new-password" type={mostrarSenha ? "text" : "password"} value={confirmacao} onChange={(e) => { setConfirmacao(e.target.value); setErro(""); }} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3"/>{confirmacao && <span className={`mt-2 block text-sm ${senhasIguais ? "text-emerald-300" : "text-red-300"}`}>{senhasIguais ? "✓ As senhas são iguais." : "As senhas ainda não são iguais."}</span>}</label><button disabled={enviando} className="w-full rounded-full bg-amber-400 px-5 py-3 font-bold text-black disabled:opacity-60">{enviando ? "Salvando..." : "Criar senha e acessar"}</button><p className="text-center text-sm text-zinc-400">Se algo der errado, corrija e tente novamente. <Link href="/esqueci-senha" className="text-amber-300">Pedir novo link</Link></p></form>}</section></main>;
}
