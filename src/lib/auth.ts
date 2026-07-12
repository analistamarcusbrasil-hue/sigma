export type PerfilUsuario =
  | "Administrador"
  | "Venerável Mestre"
  | "Secretário"
  | "Tesoureiro"
  | "Chanceler"
  | "Orador"
  | "Consulta"
  | "Obreiro";

export type StatusPerfil = "convite_enviado" | "ativo" | "suspenso" | "revogado";

export type PerfilSigma = {
  id: string;
  obreiro_id: string | null;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  status: StatusPerfil;
  permissoes: string[];
  convite_enviado_em: string | null;
  ativado_em: string | null;
  ultimo_acesso_em: string | null;
};

export const permissoesPorPerfil: Record<PerfilUsuario, string[]> = {
  Administrador: ["/dashboard", "/agenda", "/obreiros", "/tesouraria", "/chancelaria", "/secretaria", "/prestacao-contas", "/patrimonio", "/documentos", "/configuracoes", "/auditoria", "/backup", "/usuarios", "/comunicados", "/solicitacoes"],
  "Venerável Mestre": ["/dashboard", "/agenda", "/obreiros", "/tesouraria", "/chancelaria", "/secretaria", "/prestacao-contas", "/patrimonio", "/documentos", "/configuracoes", "/auditoria", "/comunicados", "/solicitacoes"],
  Secretário: ["/dashboard", "/agenda", "/obreiros", "/chancelaria", "/secretaria", "/prestacao-contas", "/documentos", "/comunicados", "/solicitacoes"],
  Tesoureiro: ["/dashboard", "/obreiros", "/tesouraria", "/prestacao-contas", "/documentos", "/comunicados", "/solicitacoes"],
  Chanceler: ["/dashboard", "/agenda", "/obreiros", "/chancelaria", "/comunicados", "/solicitacoes"],
  Orador: ["/dashboard", "/agenda", "/secretaria", "/documentos", "/prestacao-contas"],
  Consulta: ["/dashboard", "/agenda", "/prestacao-contas", "/documentos"],
  Obreiro: ["/dashboard", "/agenda", "/portal-obreiro"],
};

export type AcaoPermissao="visualizar"|"criar"|"editar"|"excluir"|"aprovar"|"cancelar"|"reabrir"|"exportar"|"gerar_pdf"|"alterar_protegido"|"desbloquear"|"ver_auditoria";
const leitura:AcaoPermissao[]=["visualizar","exportar","gerar_pdf"];
const escrita:AcaoPermissao[]=[...leitura,"criar","editar"];
export const acoesPorPerfil:Record<PerfilUsuario,Partial<Record<string,AcaoPermissao[]>>>={
 Administrador:{"*":[...escrita,"excluir","aprovar","cancelar","reabrir","alterar_protegido","desbloquear","ver_auditoria"]},
 "Venerável Mestre":{"*":[...leitura,"aprovar"],"/configuracoes":[...escrita,"aprovar"],"/prestacao-contas":[...escrita,"aprovar","reabrir"],"/comunicados":escrita,"/solicitacoes":escrita},
 Tesoureiro:{"/tesouraria":[...escrita,"cancelar"],"/prestacao-contas":[...escrita,"aprovar"],"/documentos":escrita,"/comunicados":escrita,"/solicitacoes":escrita,"/dashboard":leitura,"/obreiros":leitura},
 Secretário:{"/secretaria":escrita,"/documentos":escrita,"/agenda":escrita,"/chancelaria":escrita,"/comunicados":escrita,"/solicitacoes":escrita,"/prestacao-contas":leitura,"/dashboard":leitura,"/obreiros":leitura},
 Chanceler:{"/chancelaria":escrita,"/agenda":escrita,"/comunicados":escrita,"/solicitacoes":escrita,"/dashboard":leitura,"/obreiros":leitura},Orador:{"*":leitura},Consulta:{"*":leitura},Obreiro:{"/dashboard":leitura,"/agenda":leitura,"/portal-obreiro":[...leitura,"criar"]}
};
export function podeExecutar(perfil:PerfilUsuario,modulo:string,acao:AcaoPermissao){const regras=acoesPorPerfil[perfil];return Boolean(regras[modulo]?.includes(acao)||regras["*"]?.includes(acao));}
export function moduloDaRota(rota:string){const modulos=Object.values(permissoesPorPerfil).flat();return [...new Set(modulos)].sort((a,b)=>b.length-a.length).find(m=>rota===m||rota.startsWith(`${m}/`))??rota;}

export function permissoesPadrao(perfil: PerfilUsuario) {
  return permissoesPorPerfil[perfil];
}

export function podeAcessarModulo(permissoes: string[], rota: string) {
  return permissoes.some((permitida) => rota === permitida || rota.startsWith(`${permitida}/`));
}
