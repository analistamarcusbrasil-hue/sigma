import { lojaAtivaId } from "@/lib/loja-ativa";

export function urlRelatorio(tipo:string, parametros:Record<string,string|undefined>={}, baixar=false){
  const pesquisa=new URLSearchParams({lojaId:lojaAtivaId(),disposition:baixar?"attachment":"inline"});
  Object.entries(parametros).forEach(([chave,valor])=>{if(valor)pesquisa.set(chave,valor);});
  return `/api/relatorios/${tipo}?${pesquisa}`;
}

export function abrirRelatorio(tipo:string,parametros:Record<string,string|undefined>={}){
  window.open(urlRelatorio(tipo,parametros,false),"_blank","noopener,noreferrer");
}
