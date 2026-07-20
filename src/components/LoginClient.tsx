"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginClient({ erroInicial = "" }: { erroInicial?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(erroInicial);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setErro(""); setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error || !data.user) { setErro("E-mail ou senha inválidos. Você pode tentar novamente."); setEnviando(false); return; }

    const [{ data: profile }, { data: vinculos, error: vinculoError }] = await Promise.all([
      supabase.from("profiles").select("status,perfil").eq("id", data.user.id).maybeSingle(),
      supabase.from("loja_usuarios").select("loja_id,perfil,status,obreiro_id,acesso_portal_obreiro,deve_trocar_senha").eq("usuario_id", data.user.id).eq("status", "ativo"),
    ]);
    if (!profile || profile.status !== "ativo") {
      await supabase.auth.signOut();
      setErro("Seu acesso está suspenso, revogado ou ainda não foi ativado.");
      setEnviando(false); return;
    }
    if (vinculoError || !vinculos?.length) {
      await supabase.auth.signOut();
      setErro("Seu usuário não possui vínculo ativo com uma Loja. Procure o Administrador.");
      setEnviando(false); return;
    }
    if (vinculos.some((v) => v.deve_trocar_senha)) {
      router.replace("/alterar-senha"); router.refresh(); return;
    }
    if (profile.perfil === "Obreiro" && !vinculos.some((v) => v.acesso_portal_obreiro && v.obreiro_id)) {
      await supabase.auth.signOut();
      setErro("Seu Portal ainda não foi liberado ou não possui Obreiro vinculado. Procure o Administrador.");
      setEnviando(false); return;
    }
    router.replace(profile.perfil === "Obreiro" ? "/portal-obreiro" : "/dashboard");
    router.refresh();
  }

  return <main className="min-h-screen bg-[#070707] px-4 py-8 text-white"><div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center"><div className="grid w-full gap-8 xl:grid-cols-[1.1fr_0.9fr]">
    <section className="rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-amber-400/15 to-white/[0.03] p-8"><p className="text-sm uppercase tracking-[0.3em] text-amber-300">SIGMA 2.0</p><h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">Sistema Integrado de Gestão Maçônica</h1><p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">Acesso seguro para gestão da Loja e para o Portal do Obreiro.</p></section>
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8"><h2 className="text-3xl font-bold">Entrar no sistema</h2><p className="mt-2 text-sm text-zinc-400">Use o e-mail cadastrado pelo Administrador.</p>
      {erro && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{erro}</div>}
      <form onSubmit={entrar} className="mt-6 space-y-4">
        <label className="block"><span className="mb-2 block text-sm text-zinc-300">E-mail</span><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400" /></label>
        <label className="block"><span className="mb-2 block text-sm text-zinc-300">Senha</span><div className="flex gap-2"><input required type={mostrarSenha ? "text" : "password"} autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400" /><button type="button" onClick={() => setMostrarSenha((atual) => !atual)} className="rounded-xl border border-white/10 px-3 text-xs">{mostrarSenha ? "Ocultar" : "Mostrar"}</button></div></label>
        <div className="text-right"><Link href="/esqueci-senha" className="text-sm text-amber-300">Esqueci minha senha</Link></div>
        <button disabled={enviando} className="w-full rounded-full bg-amber-400 px-6 py-3 font-bold text-black disabled:opacity-60">{enviando ? "Entrando..." : "Entrar"}</button>
      </form>
      <div className="mt-6 border-t border-white/10 pt-5 text-center"><p className="text-sm text-zinc-400">Ainda não possui cadastro?</p><Link href="/pre-cadastro" className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300/30 px-4 py-2 font-bold text-amber-200">Solicitar pré-cadastro</Link></div>
    </section>
  </div></div></main>;
}
