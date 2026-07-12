"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { podeAcessarModulo, type PerfilSigma } from "@/lib/auth";
import { modulos } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";
import { AccessBoundary } from "@/components/AccessBoundary";
import { moduloDaRota } from "@/lib/auth";

type AppShellProps = {
  secao: string;
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  acao?: ReactNode;
};

function iniciais(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
}

function MenuIcon({ aberto }: { aberto: boolean }) {
  return aberto ? <span aria-hidden="true" className="text-2xl leading-none">×</span> : <span aria-hidden="true" className="text-xl leading-none">☰</span>;
}

const iconesModulo: Record<string, string> = {
  "/dashboard": "⌂",
  "/agenda": "▦",
  "/obreiros": "♙",
  "/tesouraria": "↗",
  "/chancelaria": "✓",
  "/secretaria": "▤",
  "/prestacao-contas": "▥",
  "/patrimonio": "◇",
  "/documentos": "▤",
  "/configuracoes": "⚙",
  "/auditoria": "◎",
  "/backup": "↻",
  "/usuarios": "♚",
};

export function AppShell({ secao, titulo, subtitulo, children, acao }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<PerfilSigma | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const acessoRegistrado = useRef("");

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

  useEffect(() => { setMenuAberto(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuAberto]);

  const modulosPermitidos = useMemo(() => {
    if (!usuario) return [];
    const itens = modulos.filter((modulo) => modulo.href === "/agenda" || usuario.perfil === "Administrador" || (usuario.perfil === "Venerável Mestre" && modulo.href === "/auditoria") || podeAcessarModulo(usuario.permissoes, modulo.href));
    if (usuario.perfil === "Administrador") itens.push({ nome: "Usuários", href: "/usuarios", descricao: "Acessos, convites e permissões." });
    return itens;
  }, [usuario]);

  const acessoPermitido = useMemo(
    () => Boolean(usuario && (pathname.startsWith("/agenda") || usuario.perfil === "Administrador" || (usuario.perfil === "Venerável Mestre" && pathname.startsWith("/auditoria")) || podeAcessarModulo(usuario.permissoes, pathname))),
    [usuario, pathname],
  );

  useEffect(()=>{if(!usuario||acessoPermitido||acessoRegistrado.current===pathname)return;acessoRegistrado.current=pathname;const supabase=createClient();void supabase.from("loja_usuarios").select("loja_id").limit(1).maybeSingle().then(({data})=>{if(data?.loja_id)return supabase.rpc("registrar_evento_seguranca",{alvo_loja:data.loja_id,modulo:pathname,acao:"visualizar",resultado:"bloqueado",descricao:"Tentativa de acesso direto a módulo sem permissão.",motivo:null});});},[usuario,acessoPermitido,pathname]);

  async function sair() {
    setSaindo(true);
    try {
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally { setSaindo(false); }
  }

  if (carregando || !usuario) {
    return <main className="min-h-screen px-4 py-8 text-white" aria-busy="true"><div className="sigma-surface mx-auto max-w-5xl animate-pulse rounded-3xl p-6 text-zinc-400" role="status">Verificando seu acesso ao SIGMA 2.0…</div></main>;
  }

  const navegacao = (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-3 border-b border-white/10 px-1 pb-5" aria-label="Ir para o Dashboard do SIGMA 2.0">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-xl font-black text-slate-950 shadow-lg shadow-amber-950/30">Σ</span>
        <span><span className="block text-lg font-black tracking-[.12em] text-white">SIGMA <b className="text-amber-300">2.0</b></span><span className="mt-0.5 block text-[10px] uppercase tracking-[.14em] text-slate-500">Gestão Maçônica</span></span>
      </Link>
      <nav className="sigma-scrollbar mt-5 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1" aria-label="Navegação principal">
        {modulosPermitidos.map((modulo) => {
          const ativo = pathname === modulo.href || pathname.startsWith(`${modulo.href}/`);
          return <Link key={modulo.href} href={modulo.href} aria-current={ativo ? "page" : undefined} className={`group relative flex gap-3 rounded-xl px-3 py-2.5 text-sm transition ${ativo ? "bg-white/[.09] text-white shadow-inner shadow-white/[.03] before:absolute before:-left-1 before:top-2 before:h-8 before:w-1 before:rounded-full before:bg-amber-400" : "text-slate-400 hover:bg-white/[.05] hover:text-white"}`}>
            <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${ativo ? "bg-amber-400/15 text-amber-300" : "bg-slate-800/70 text-slate-500 group-hover:text-amber-300"}`}>{iconesModulo[modulo.href] ?? "•"}</span>
            <span className="min-w-0"><span className="block font-semibold">{modulo.nome}</span>
            <span className={`mt-0.5 block text-[10px] leading-4 ${ativo ? "text-slate-400" : "text-slate-600"}`}>{modulo.descricao}</span></span>
          </Link>;
        })}
      </nav>
      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400 font-black text-black" aria-hidden="true">{iniciais(usuario.nome)}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{usuario.nome}</p><p className="truncate text-xs text-amber-300">{usuario.perfil}</p></div></div>
        <button type="button" onClick={sair} disabled={saindo} className="mt-4 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-200">{saindo ? "Saindo…" : "Sair da conta"}</button>
      </div>
    </div>
  );

  return <div className="sigma-app-grid min-h-screen bg-[#08111f] text-white">
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-700/60 bg-[#0b1728]/95 px-4 py-3 backdrop-blur-xl xl:hidden">
      <Link href="/dashboard" className="font-black tracking-[.16em] text-amber-300">SIGMA 2.0</Link>
      <button type="button" onClick={() => setMenuAberto((valor) => !valor)} aria-expanded={menuAberto} aria-controls="menu-mobile" aria-label={menuAberto ? "Fechar menu" : "Abrir menu"} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[.05]"><MenuIcon aberto={menuAberto} /></button>
    </div>
    {menuAberto && <button type="button" className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm xl:hidden" onClick={() => setMenuAberto(false)} aria-label="Fechar menu" />}
    <aside id="menu-mobile" className={`fixed inset-y-0 left-0 z-50 w-[min(88vw,20rem)] border-r border-slate-700/60 bg-[#0b1728] p-4 shadow-2xl transition-transform duration-200 xl:hidden ${menuAberto ? "translate-x-0" : "-translate-x-full"}`}>{navegacao}</aside>
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[19rem] shrink-0 border-r border-slate-700/50 bg-[#0b1728]/95 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl xl:block">{navegacao}</aside>
      <main id="conteudo-principal" className="min-w-0 flex-1 px-3 pb-10 pt-4 sm:px-6 xl:px-8 xl:pt-0">
        <header className="sticky top-0 z-20 -mx-3 mb-1 border-b border-slate-700/40 bg-[#08111f]/90 px-3 py-5 backdrop-blur-xl sm:-mx-6 sm:px-6 xl:-mx-8 xl:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[.24em] text-amber-300">SIGMA 2.0 <span className="mx-2 text-slate-700">/</span> {secao}</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{titulo}</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">{subtitulo}</p></div>
            {acao ? <div className="shrink-0">{acao}</div> : <div className="hidden shrink-0 items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/50 px-3 py-2 text-sm lg:flex"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/15 font-bold text-amber-300">{iniciais(usuario.nome)}</div><div><p className="max-w-48 truncate font-semibold">{usuario.nome}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">{usuario.perfil}</p></div></div>}
          </div>
        </header>
        {!acessoPermitido ? <section className="mt-6 rounded-3xl border border-red-400/20 bg-red-400/10 p-6" role="alert"><h2 className="text-xl font-bold">Acesso não permitido</h2><p className="mt-2 text-sm text-red-100/80">Seu perfil não possui permissão para acessar este módulo. A tentativa foi registrada para auditoria.</p><Link href="/dashboard" className="mt-5 inline-flex rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black">Voltar ao Dashboard</Link></section> : <AccessBoundary perfil={usuario.perfil} modulo={moduloDaRota(pathname)}>{children}</AccessBoundary>}
      </main>
    </div>
  </div>;
}
