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
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });

    if (error || !data.user) {
      setErro("E-mail ou senha inválidos.");
      setEnviando(false);
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle();
    if (!profile || profile.status !== "ativo") {
      await supabase.auth.signOut();
      setErro("Seu acesso está suspenso, revogado ou ainda não foi ativado.");
      setEnviando(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-amber-400/15 to-white/[0.03] p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">SIGMA LUMP</p>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">Sistema Integrado de Gestão Maçônica</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">Acesso seguro para gestão da Loja, com dados administrativos e operacionais organizados em um só sistema.</p>
          </section>
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
            <h2 className="text-3xl font-bold">Entrar no sistema</h2>
            <p className="mt-2 text-sm text-zinc-400">Use o e-mail cadastrado pelo Administrador.</p>
            {erro && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{erro}</div>}
            <form onSubmit={entrar} className="mt-6 space-y-4">
              <label className="block"><span className="mb-2 block text-sm text-zinc-300">E-mail</span><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400" /></label>
              <label className="block"><span className="mb-2 block text-sm text-zinc-300">Senha</span><div className="flex gap-2"><input required type={mostrarSenha ? "text" : "password"} autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400" /><button type="button" onClick={() => setMostrarSenha((atual) => !atual)} className="rounded-xl border border-white/10 px-3 text-xs text-zinc-300">{mostrarSenha ? "Ocultar" : "Mostrar"}</button></div></label>
              <div className="text-right"><Link href="/esqueci-senha" className="text-sm text-amber-300 hover:text-amber-200">Esqueci minha senha</Link></div>
              <button disabled={enviando} className="w-full rounded-full bg-amber-400 px-6 py-3 font-bold text-black transition hover:bg-amber-300 disabled:opacity-60">{enviando ? "Entrando..." : "Entrar"}</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
