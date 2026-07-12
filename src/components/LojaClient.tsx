"use client";
import{useEffect,useState}from"react";
import{obterLojaInstitucional,salvarLoja,type LojaInstitucional}from"@/lib/supabase/lojas";
import{Feedback,LoadingState}from"@/components/ui/Feedback";
const c="w-full rounded-xl border border-white/10 bg-black/25 p-3";
export function LojaClient(){
 const[f,setF]=useState<LojaInstitucional>(),[msg,setMsg]=useState("");
 useEffect(()=>{obterLojaInstitucional().then(setF).catch(e=>setMsg(e.message));},[]);
 if(!f)return msg?<Feedback tone="error">{msg}</Feedback>:<LoadingState/>;
 async function salvar(){if(!f)return;try{await salvarLoja(f);setMsg("Dados salvos para a Loja ativa.");}catch(e){setMsg(e instanceof Error?e.message:"Erro ao salvar.");}}
 const campo=(k:keyof LojaInstitucional,l:string)=><label>{l}<input value={String(f[k]??"")} onChange={e=>setF({...f,[k]:e.target.value})} className={c}/></label>;
 return <div className="mt-8 space-y-5">{msg&&<Feedback tone={msg.includes("salvos")?"success":"error"}>{msg}</Feedback>}<section className="sigma-surface rounded-3xl p-6"><h2 className="text-xl font-black">Identificação institucional</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{campo("nome","Nome da Loja")}{campo("numero","Número")}{campo("potencia","Potência")}{campo("oriente","Oriente")}{campo("rito","Rito")}{campo("jurisdicao","Jurisdição")}{campo("cnpj","CNPJ")}{campo("dataFundacao","Data de fundação")}{campo("templo","Templo/local")}{campo("endereco","Endereço")}{campo("cidade","Cidade")}{campo("uf","UF")}{campo("pais","País")}{campo("email","E-mail institucional")}{campo("telefone","Telefone")}{campo("site","Site")}</div></section><section className="sigma-surface rounded-3xl p-6"><h2 className="text-xl font-black">Operação e identidade</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{campo("diasSessao","Dias de sessão")}{campo("horarioSessao","Horário padrão")}{campo("logoUrl","URL da logo")}{campo("corPrimaria","Cor primária")}{campo("corSecundaria","Cor secundária")}<label>Status<select value={f.status} onChange={e=>setF({...f,status:e.target.value})} className={c}>{["Ativa","Inativa","Suspensa","Em implantação"].map(x=><option key={x}>{x}</option>)}</select></label><label className="sm:col-span-2 lg:col-span-3">Rodapé documental<textarea value={f.rodape} onChange={e=>setF({...f,rodape:e.target.value})} className={c}/></label></div><button onClick={()=>void salvar()} className="mt-5 rounded-xl bg-amber-400 px-6 py-3 font-bold text-black">Salvar Loja ativa</button></section></div>;
}
