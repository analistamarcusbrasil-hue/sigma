"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { modulos } from "@/lib/mock-data";

type AppShellProps = {
  secao: string;
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  acao?: ReactNode;
};

export function AppShell({ secao, titulo, subtitulo, children, acao }: AppShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[#0B0F17] p-6 lg:block">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-400">SIGMA</p>
            <h1 className="mt-3 text-2xl font-bold">LUMP</h1>
            <p className="mt-2 text-sm text-zinc-400">Gestão Maçônica Integrada</p>
          </div>

          <nav className="mt-10 space-y-2">
            {modulos.map((modulo) => {
              const ativo = pathname === modulo.href;

              return (
                <Link
                  key={modulo.href}
                  href={modulo.href}
                  className={`block w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                    ativo
                      ? "bg-amber-400 text-black"
                      : "text-zinc-300 hover:bg-white/10 hover:text-amber-300"
                  }`}
                >
                  {modulo.nome}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="flex-1 p-6 lg:p-10">
          <header className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-amber-400">{secao}</p>
              <h2 className="mt-3 text-4xl font-bold">{titulo}</h2>
              <p className="mt-3 max-w-3xl text-zinc-400">{subtitulo}</p>
            </div>

            {acao}
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}
