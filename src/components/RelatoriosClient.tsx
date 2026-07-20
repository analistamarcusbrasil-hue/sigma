"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { lojaAtivaId } from "@/lib/loja-ativa";
import { createClient } from "@/lib/supabase/client";
import { Feedback, LoadingState } from "@/components/ui/Feedback";

type Sessao = { id:string; data:string; titulo:string };
const hoje=()=>new Date().toISOString().slice(0,10);
const primeiroDia=()=>`${hoje().slice(0,7)}-01`;
const campo="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white";
const relatorios=[
  ["frequencia-sessao","Frequência da Sessão","Lista nominal, situação e assinaturas da Chancelaria."],
  ["frequencia-mensal","Frequência Mensal","Consolidado de presenças, faltas e justificativas."],
  ["livro-caixa","Livro Caixa","Movimentações oficiais e totais financeiros."],
  ["fechamento-mensal","Fechamento Mensal","Saldos, receitas, despesas e aprovação."],
  ["prestacao-contas","Prestação de Contas","Consolidação financeira institucional."],
  ["repasse-gestao","Termo de Repasse","Valores, pendências e assinaturas da transição."],
  ["tronco-solidariedade","Tronco de Solidariedade","Arrecadações registradas no período."],
  ["custos-fixos","Custos Fixos","Contratos, vigências, parcelas e totais."],
  ["solicitacoes","Solicitações","Protocolos, setores, prazos e situações."],
] as const;

export function RelatoriosClient(){
  const[lojaId,setLojaId]=useState("");const[perfil,setPerfil]=useState("");const[sessoes,setSessoes]=useState<Sessao[]>([]);const[sessaoId,setSessaoId]=useState("");
  const[inicio,setInicio]=useState(primeiroDia());const[fim,setFim]=useState(hoje());const[preview,setPreview]=useState("");const[erro,setErro]=useState("");const[carregando,setCarregando]=useState(true);
  useEffect(()=>{const id=lojaAtivaId();setLojaId(id);if(!id){setCarregando(false);return;}const supabase=createClient();supabase.auth.getUser().then(async({data:{user}})=>{if(!user)throw new Error("Sua sessão expirou.");const[v,s]=await Promise.all([supabase.from("loja_usuarios").select("perfil").eq("loja_id",id).eq("usuario_id",user.id).eq("status","ativo").maybeSingle(),supabase.from("sessoes").select("id,data,titulo").eq("loja_id",id).order("data",{ascending:false}).limit(100)]);if(v.error)throw v.error;if(s.error)throw s.error;setPerfil(v.data?.perfil||"");setSessoes((s.data||[]) as Sessao[]);setSessaoId(s.data?.[0]?.id||"");}).catch(e=>setErro(e instanceof Error?e.message:"Não foi possível carregar os relatórios.")).finally(()=>setCarregando(false));},[]);
  const permitidos=useMemo(()=>relatorios.filter(([tipo])=>["Administrador","Venerável Mestre"].includes(perfil)||(tipo.startsWith("frequencia")?["Chanceler","Secretário"].includes(perfil):tipo==="solicitacoes"?["Secretário","Tesoureiro","Chanceler"].includes(perfil):perfil==="Tesoureiro")),[perfil]);
  function url(tipo:string,download=false){const p=new URLSearchParams({lojaId,inicio,fim,disposition:download?"attachment":"inline"});if(tipo==="frequencia-sessao"&&sessaoId)p.set("sessaoId",sessaoId);return`/api/relatorios/${tipo}?${p}`;}
  function visualizar(tipo:string){setErro("");if(!lojaId)return setErro("Selecione uma Loja ativa.");if(inicio>fim)return setErro("A data inicial não pode ser posterior à final.");if(tipo==="frequencia-sessao"&&!sessaoId)return setErro("Selecione uma sessão.");setPreview(url(tipo));}
  if(carregando)return <LoadingState label="Carregando central de relatórios…"/>;
  return <div className="mt-8 space-y-6">
    {erro&&<Feedback tone="error">{erro}</Feedback>}
    <Feedback tone="info">A visualização e o download usam exatamente o mesmo PDF auditado. Datas seguem o padrão brasileiro, valores usam R$ e todas as páginas recebem identificação institucional.</Feedback>
    <section className="sigma-surface grid gap-4 rounded-3xl p-5 md:grid-cols-3">
      <label className="text-sm text-zinc-400">Data inicial<input type="date" value={inicio} onChange={e=>setInicio(e.target.value)} className={campo}/></label>
      <label className="text-sm text-zinc-400">Data final<input type="date" value={fim} onChange={e=>setFim(e.target.value)} className={campo}/></label>
      <label className="text-sm text-zinc-400">Sessão para frequência<select value={sessaoId} onChange={e=>setSessaoId(e.target.value)} className={campo}><option value="">Selecione</option>{sessoes.map(s=><option key={s.id} value={s.id}>{s.data.split("-").reverse().join("/")} · {s.titulo}</option>)}</select></label>
    </section>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{permitidos.map(([tipo,titulo,descricao])=><article key={tipo} className="sigma-surface flex min-h-52 flex-col rounded-3xl p-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-300">PDF institucional</p><h2 className="mt-2 text-xl font-black">{titulo}</h2><p className="mt-2 flex-1 text-sm leading-6 text-zinc-400">{descricao}</p><div className="mt-5 flex flex-wrap gap-2"><button onClick={()=>visualizar(tipo)} className="rounded-xl border border-sky-300/30 px-4 py-2 text-sm font-bold text-sky-100">Visualizar</button><a href={url(tipo,true)} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black">Baixar PDF</a></div></article>)}</section>
    <section className="sigma-surface rounded-3xl p-5"><h2 className="text-xl font-black">Balaústres e Atas</h2><p className="mt-2 text-sm text-zinc-400">Os PDFs definitivos da Secretaria usam o padrão institucional após aprovação.</p><div className="mt-4 flex gap-3"><Link href="/secretaria/balaustres" className="rounded-xl border border-white/10 px-4 py-2">Abrir Balaústres</Link><Link href="/secretaria/atas-administrativas" className="rounded-xl border border-white/10 px-4 py-2">Abrir Atas</Link></div></section>
    {preview&&<div className="fixed inset-0 z-[90] flex flex-col bg-black/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Pré-visualização do PDF"><div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-t-2xl bg-slate-900 p-3"><b>Pré-visualização institucional</b><button onClick={()=>setPreview("")} className="rounded-xl border border-white/15 px-4 py-2">Fechar</button></div><iframe title="Pré-visualização do relatório" src={preview} className="mx-auto h-full w-full max-w-6xl rounded-b-2xl bg-white"/></div>}
  </div>;
}
