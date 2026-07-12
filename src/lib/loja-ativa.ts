const CHAVE="sigma:loja-ativa";
export function lojaAtivaId(){return typeof window==="undefined"?"":window.localStorage.getItem(CHAVE)??"";}
export function definirLojaAtiva(id:string){if(typeof window!=="undefined")window.localStorage.setItem(CHAVE,id);}
