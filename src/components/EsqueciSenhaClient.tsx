"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function EsqueciSenhaClient() {
  const [email, setEmail] = useState(""); const [mensagem, setMensagem] = useState(""); const [enviando, setEnviando] = useState(false);
  async function enviar(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setEnviando(true); await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/confirm?next=/redefinir-senha` }); setMensagem("Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha."); setEnviando(false); }
  return <main className="min-h-screen bg-[#070707] px-4 py-8 text-white"><section className="mx-auto mt-20 max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8"><h1 className="text-3xl font-bold">Recuperar senha</h1><p className="mt-2 text-sm text-zinc-400">Informe seu e-mail para receber as instruções.</p>{mensagem && <p className="mt-5 rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-200">{mensagem}</p>}<form onSubmit={enviar} className="mt-6 space-y-4"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400"/><button disabled={enviando} className="w-full rounded-full bg-amber-400 px-5 py-3 font-bold text-black">{enviando ? "Enviando..." : "Enviar instruções"}</button></form><Link href="/login" className="mt-6 block text-center text-sm text-amber-300">Voltar ao login</Link></section></main>;
}
