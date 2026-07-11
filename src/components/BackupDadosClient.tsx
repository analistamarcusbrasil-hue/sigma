"use client";

import { useEffect, useState } from "react";
import { carregarSecretaria, carregarTesouraria, listarGestoes, listarObreiros, listarPresencas, listarSessoes } from "@/lib/supabase/operacional";

export function BackupDadosClient() {
  const [resumo, setResumo] = useState<{ grupos: number; registros: number } | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([listarGestoes(), listarObreiros(), listarSessoes(), listarPresencas(), carregarTesouraria(), carregarSecretaria()])
      .then(([gestoes, obreiros, sessoes, presencas, financeiro, secretaria]) => {
        const grupos = [gestoes, obreiros, sessoes, presencas, financeiro.regras, financeiro.recebimentos, financeiro.lancamentos, financeiro.custos, secretaria.documentos, secretaria.acoes, secretaria.processos, secretaria.pecas, secretaria.decisoes];
        setResumo({ grupos: grupos.length, registros: grupos.reduce((total, itens) => total + itens.length, 0) });
      })
      .catch((falha: unknown) => setErro(falha instanceof Error ? falha.message : "Não foi possível consultar o banco."));
  }, []);

  return <div className="mt-8 space-y-6">
    <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/15 to-white/[0.03] p-6">
      <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Segurança dos dados</p>
      <h3 className="mt-3 text-3xl font-bold text-white">Dados protegidos no Supabase</h3>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">O SIGMA não depende mais de backups do navegador. Os dados operacionais são armazenados centralmente no Supabase, com autenticação, RLS e infraestrutura de recuperação da plataforma.</p>
    </section>
    {erro && <section className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{erro}</section>}
    <section className="grid gap-4 md:grid-cols-2">
      <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-zinc-400">Grupos protegidos</p><h4 className="mt-3 text-3xl font-bold text-amber-300">{resumo?.grupos ?? "..."}</h4></article>
      <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-zinc-400">Registros encontrados</p><h4 className="mt-3 text-3xl font-bold text-white">{resumo?.registros ?? "..."}</h4></article>
    </section>
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h4 className="text-xl font-bold">Backup administrativo</h4><p className="mt-3 text-sm leading-6 text-zinc-400">Exportações e restaurações integrais devem ser feitas pelo painel do Supabase por um administrador. A restauração local foi desativada para impedir que arquivos do navegador sobrescrevam o banco oficial.</p></section>
  </div>;
}
