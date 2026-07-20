"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listarDocumentosSecretariaAction } from "@/app/secretaria/documentos/actions";
import { lojaAtivaId } from "@/lib/loja-ativa";
import { statusSecretaria, type CategoriaSecretaria } from "@/lib/secretaria-documentos";
import { Feedback } from "@/components/ui/Feedback";

type Item = { id: string; numero: string; categoria: string; tipo: string; data: string; grau: string | null; status: string; tem_financeiro: boolean; tem_presenca: boolean; pdf_url: string | null; versao: number; atualizado_em: string };

const statusCor: Record<string, string> = {
  "Rascunho": "border-slate-400/30 bg-slate-400/10 text-slate-300",
  "Em revisão": "border-sky-400/30 bg-sky-400/10 text-sky-300",
  "Aguardando aprovação": "border-amber-400/30 bg-amber-400/10 text-amber-300",
  "Aprovado": "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  "Arquivado": "border-violet-400/30 bg-violet-400/10 text-violet-300",
  "Cancelado": "border-red-400/30 bg-red-400/10 text-red-300",
};

export function SecretariaDocumentosClient({ categoria }: { categoria: CategoriaSecretaria }) {
  const [itens, setItens] = useState<Item[]>([]);
  const [perfil, setPerfil] = useState("");
  const [status, setStatus] = useState("Todos");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const base = categoria === "Balaústre" ? "/secretaria/balaustres" : "/secretaria/atas-administrativas";

  const carregar = useCallback(async () => {
    const lojaId = lojaAtivaId();
    if (!lojaId) { setErro("Selecione uma Loja ativa."); setCarregando(false); return; }
    setCarregando(true);
    const resposta = await listarDocumentosSecretariaAction({ lojaId, categoria, status });
    if (!resposta.ok) setErro(resposta.erro);
    else { setItens(resposta.data as Item[]); setPerfil(resposta.perfil); setErro(""); }
    setCarregando(false);
  }, [categoria, status]);

  useEffect(() => { void carregar(); }, [carregar]);
  const contadores = useMemo(() => statusSecretaria.map((nome) => [nome, itens.filter((item) => item.status === nome).length] as const), [itens]);
  const podeCriar = ["Administrador", "Secretário"].includes(perfil);

  return <div className="space-y-6">
    {erro && <Feedback tone="error">{erro}</Feedback>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {contadores.map(([nome, total]) => <article key={nome} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-slate-400">{nome}</p><p className="mt-2 text-2xl font-black text-white">{total}</p></article>)}
    </section>
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:flex-row sm:items-end sm:justify-between">
      <label className="text-sm text-slate-300">Filtrar por status<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block min-w-64 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white"><option>Todos</option>{statusSecretaria.map((item) => <option key={item}>{item}</option>)}</select></label>
      {podeCriar && <Link href={`${base}/${categoria === "Balaústre" ? "novo" : "nova"}`} className="rounded-xl bg-amber-400 px-5 py-3 text-center font-bold text-black hover:bg-amber-300">Novo {categoria}</Link>}
    </section>
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-white/[.05] text-slate-400"><tr><th className="p-4">Número / data</th><th className="p-4">Tipo</th><th className="p-4">Integrações</th><th className="p-4">Status</th><th className="p-4">Ações</th></tr></thead><tbody>
        {itens.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="p-4"><p className="font-bold text-white">{item.numero}</p><p className="text-xs text-slate-500">{item.data?.split("-").reverse().join("/")} · versão {item.versao}</p></td><td className="p-4 text-slate-300">{item.tipo}<p className="text-xs text-slate-500">{item.grau || "Sem grau"}</p></td><td className="p-4"><div className="flex gap-2">{item.tem_financeiro && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">Tesouraria</span>}{item.tem_presenca && <span className="rounded-full bg-sky-400/10 px-2 py-1 text-xs text-sky-300">Chancelaria</span>}</div></td><td className="p-4"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusCor[item.status] || statusCor.Rascunho}`}>{item.status}</span></td><td className="p-4"><div className="flex gap-2"><Link href={`${base}/${item.id}`} className="rounded-lg border border-amber-400/30 px-3 py-2 font-semibold text-amber-300">Abrir</Link>{item.pdf_url && <a href={item.pdf_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-400/30 px-3 py-2 font-semibold text-emerald-300">PDF</a>}</div></td></tr>)}
        {!carregando && itens.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-500">Nenhum documento nesta fila.</td></tr>}
        {carregando && <tr><td colSpan={5} className="p-10 text-center text-slate-400">Carregando documentos…</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}

