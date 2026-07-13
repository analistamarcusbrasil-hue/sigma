"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { alterarSenhaObrigatoria } from "@/app/alterar-senha/actions";

export function AlterarSenhaClient() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const requisitos = {
    tamanho: senha.length >= 8, minuscula: /[a-z]/.test(senha),
    maiuscula: /[A-Z]/.test(senha), numero: /[0-9]/.test(senha),
  };
  const valida = Object.values(requisitos).every(Boolean) && senha === confirmacao;

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault(); setErro(""); setEnviando(true);
    try {
      const destino = await alterarSenhaObrigatoria({ senha, confirmacao });
      router.replace(destino); router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível alterar a senha. Você pode tentar novamente.");
      setEnviando(false);
    }
  }

  return <main className="min-h-screen bg-[#070707] px-4 py-8 text-white"><section className="mx-auto max-w-xl rounded-[2rem] border border-amber-400/20 bg-white/[.04] p-6 sm:p-8">
    <p className="text-xs font-bold uppercase tracking-[.24em] text-amber-300">Primeiro acesso seguro</p>
    <h1 className="mt-3 text-3xl font-black">Crie sua nova senha</h1>
    <p className="mt-3 text-sm leading-6 text-zinc-400">A senha fornecida pelo Administrador é temporária. Defina uma senha pessoal para liberar a navegação no SIGMA 2.0.</p>
    {erro && <div role="alert" className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-100">{erro}</div>}
    <form onSubmit={salvar} className="mt-6 space-y-5">
      <label className="block"><span className="mb-2 block text-sm font-medium">Nova senha</span><div className="flex gap-2"><input required type={mostrar ? "text" : "password"} autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400" /><button type="button" onClick={() => setMostrar(!mostrar)} className="rounded-xl border border-white/10 px-4 text-sm">{mostrar ? "Ocultar" : "Mostrar"}</button></div></label>
      <label className="block"><span className="mb-2 block text-sm font-medium">Confirmar nova senha</span><input required type={mostrar ? "text" : "password"} autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400" /></label>
      <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm sm:grid-cols-2">
        {[["8 ou mais caracteres", requisitos.tamanho], ["Letra maiúscula", requisitos.maiuscula], ["Letra minúscula", requisitos.minuscula], ["Número", requisitos.numero], ["Senhas conferem", Boolean(confirmacao) && senha === confirmacao]].map(([texto, ok]) => <p key={String(texto)} className={ok ? "text-emerald-300" : "text-zinc-500"}>{ok ? "✓ " : "○ "}{texto}</p>)}
      </div>
      <button disabled={enviando || !valida} className="w-full rounded-xl bg-amber-400 px-6 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-50">{enviando ? "Alterando…" : "Alterar senha e continuar"}</button>
      <p className="text-center text-xs text-zinc-500">Se houver erro, corrija os campos e tente novamente. Sua senha não é armazenada pelo SIGMA.</p>
    </form>
  </section></main>;
}
