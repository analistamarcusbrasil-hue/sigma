export type PerfilUsuario =
  | "Administrador"
  | "Venerável Mestre"
  | "Secretário"
  | "Tesoureiro"
  | "Chanceler"
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
  Administrador: ["/dashboard", "/obreiros", "/tesouraria", "/chancelaria", "/secretaria", "/prestacao-contas", "/configuracoes", "/backup", "/usuarios"],
  "Venerável Mestre": ["/dashboard", "/obreiros", "/tesouraria", "/chancelaria", "/secretaria", "/prestacao-contas"],
  Secretário: ["/dashboard", "/obreiros", "/chancelaria", "/secretaria", "/prestacao-contas"],
  Tesoureiro: ["/dashboard", "/obreiros", "/tesouraria", "/prestacao-contas"],
  Chanceler: ["/dashboard", "/obreiros", "/chancelaria"],
  Obreiro: ["/dashboard"],
};

export function permissoesPadrao(perfil: PerfilUsuario) {
  return permissoesPorPerfil[perfil];
}

export function podeAcessarModulo(permissoes: string[], rota: string) {
  return permissoes.some((permitida) => rota === permitida || rota.startsWith(`${permitida}/`));
}
