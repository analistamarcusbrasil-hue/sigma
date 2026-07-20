import type { Metadata } from "next";
import Link from "next/link";
import { PreCadastroPublicoClient } from "@/components/PreCadastroPublicoClient";
import { listarLojasPublicasPreCadastro } from "@/lib/pre-cadastro-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pré-cadastro do Obreiro", description: "Solicitação pública de pré-cadastro para avaliação administrativa da Loja." };

export default async function PreCadastroPage() {
  let lojas: Awaited<ReturnType<typeof listarLojasPublicasPreCadastro>> = [];
  let erro = "";
  try { lojas = await listarLojasPublicasPreCadastro(); } catch { erro = "As Lojas não puderam ser carregadas agora. Tente novamente mais tarde."; }
  return <main className="min-h-screen bg-[#08111f] px-4 py-6 text-white sm:py-10">
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-center justify-between gap-4"><Link href="/login" className="font-black tracking-[.18em] text-amber-300">SIGMA LUMP</Link><Link href="/login" className="text-sm text-zinc-400 underline">Já tenho acesso</Link></header>
      <section className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-[#12233a] to-[#0b1728] p-5 shadow-2xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Solicitação pública</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Pré-cadastro do Obreiro</h1>
        <p className="mt-3 max-w-3xl leading-7 text-zinc-300">Envie seus dados para avaliação da Administração da Loja. O envio deste formulário não garante acesso automático ao sistema. A liberação dependerá de análise e aprovação administrativa.</p>
      </section>
      <PreCadastroPublicoClient lojas={lojas} erroInicial={erro} />
      <footer className="py-8 text-center text-xs text-zinc-500">SIGMA LUMP · Dados utilizados somente para avaliação cadastral da Loja selecionada.</footer>
    </div>
  </main>;
}
