"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { modulos } from "@/lib/mock-data";
import { podeAcessarModulo, type PerfilSigma } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

type AppShellProps = { secao: string; titulo: string; subtitulo: string; children: ReactNode };

function iniciais(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
}

export function AppShell({ secao, titulo, subtitulo, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<PerfilSigma | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let ativo = true;

    async function carregarPerfil() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: perfil } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!perfil || perfil.status !== "ativo") {
        await supabase.auth.signOut();
        router.replace("/login?erro=acesso");
        return;
      }

      if (ativo) {
        setUsuario({ ...perfil, permissoes: Array.isArray(perfil.permissoes) ? perfil.permissoes : [] } as PerfilSigma);
        setCarregando(false);
      }
    }

    void carregarPerfil();
    return () => { ativo = false; };
  }, [router]);

  const modulosPermitidos = useMemo(() => {
    if (!usuario) return [];
    const itens = modulos.filter((modulo) => podeAcessarModulo(usuario.permissoes, modulo.href));
    if (usuario.perfil === "Administrador") itens.push({ nome: "Usuários", href: "/usuarios", descricao: "Acessos, convites e permissões." });
    return itens;
  }, [usuario]);

  const acessoPermitido = useMemo(() => !usuario ? false : podeAcessarModulo(usuario.permissoes, pathname), [usuario, pathname]);

  async function sair() {
    setSaindo(true);
    try {
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setSaindo(false);
    }
  }

  if (carregando || !usuario) return <main className="min-h-screen bg-[#070707] px-6 py-8 text-white"><div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">Verificando acesso...</div></main>;

  return <div className="min-h-screen bg-[#070707] text-white"><div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-5 xl:flex-row">
    <aside className="xl:sticky xl:top-5 xl:h-[calc(100vh-2.5rem)] xl:w-72"><div className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
      <Link href="/dashboard" className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5"><p className="text-xs uppercase tracking-[0.3em] text-amber-300">SIGMA</p><h1 className="mt-2 text-2xl font-black">LUMP</h1><p className="mt-2 text-xs text-zinc-400">Sistema Integrado de Gestão Maçônica</p></Link>
      <nav className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">{modulosPermitidos.map((modulo) => { const ativo = pathname === modulo.href || pathname.startsWith(`${modulo.href}/`); return <Link key={modulo.href} href={modulo.href} className={`block rounded-2xl px-4 py-3 text-sm transition ${ativo ? "bg-amber-400 text-black" : "text-zinc-300 hover:bg-white/10 hover:text-amber-300"}`}><span className="font-semibold">{modulo.nome}</span><span className={`mt-1 block text-xs ${ativo ? "text-black/70" : "text-zinc-500"}`}>{modulo.descricao}</span></Link>; })}</nav>
      <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400 font-black text-black">{iniciais(usuario.nome)}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{usuario.nome}</p><p className="truncate text-xs text-amber-300">{usuario.perfil}</p></div></div><button type="button" onClick={sair} className="mt-4 w-full rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-200">Sair</button></div>
    </div></aside>
    <main className="min-w-0 flex-1"><div className="mb-3 flex justify-end"><button type="button" onClick={sair} disabled={saindo} className="rounded-full border border-red-400/30 px-5 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-wait disabled:opacity-60">{saindo ? "Saindo..." : "Sair da conta"}</button></div><header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-sm uppercase tracking-[0.25em] text-amber-300">{secao}</p><h2 className="mt-3 text-3xl font-black md:text-4xl">{titulo}</h2><p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">{subtitulo}</p></div><div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm"><p className="text-zinc-500">Usuário</p><p className="font-semibold text-white">{usuario.nome}</p><p className="text-xs text-amber-300">{usuario.perfil}</p></div></div></header>
      {!acessoPermitido ? <section className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/10 p-6"><h3 className="text-2xl font-bold text-white">Acesso não permitido</h3><p className="mt-3 text-sm text-red-100/80">Seu perfil atual não possui permissão para acessar este módulo.</p><Link href="/dashboard" className="mt-6 inline-flex rounded-full bg-amber-400 px-5 py-3 font-semibold text-black">Voltar ao Dashboard</Link></section> : children}
    </main>
  </div></div>;
}
