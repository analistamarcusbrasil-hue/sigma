export type PerfilUsuario =
  | "Administrador"
  | "Venerável Mestre"
  | "Secretário"
  | "Tesoureiro"
  | "Chanceler";

export type UsuarioSigma = {
  id: string;
  nome: string;
  login: string;
  senha: string;
  perfil: PerfilUsuario;
  ativo: boolean;
};

export type UsuarioLogado = Omit<UsuarioSigma, "senha">;

export const chaveUsuarios = "sigma_usuarios";
export const chaveUsuarioLogado = "sigma_usuario_logado";

export const usuariosPadrao: UsuarioSigma[] = [
  {
    id: "admin",
    nome: "Administrador SIGMA",
    login: "admin",
    senha: "admin123",
    perfil: "Administrador",
    ativo: true,
  },
  {
    id: "vm",
    nome: "Venerável Mestre",
    login: "veneravel",
    senha: "vm123",
    perfil: "Venerável Mestre",
    ativo: true,
  },
  {
    id: "secretario",
    nome: "Secretário da Loja",
    login: "secretario",
    senha: "sec123",
    perfil: "Secretário",
    ativo: true,
  },
  {
    id: "tesoureiro",
    nome: "Tesoureiro da Loja",
    login: "tesoureiro",
    senha: "tes123",
    perfil: "Tesoureiro",
    ativo: true,
  },
  {
    id: "chanceler",
    nome: "Chanceler da Loja",
    login: "chanceler",
    senha: "chan123",
    perfil: "Chanceler",
    ativo: true,
  },
];

export const permissoesPorPerfil: Record<PerfilUsuario, string[]> = {
  Administrador: [
    "/dashboard",
    "/obreiros",
    "/tesouraria",
    "/chancelaria",
    "/secretaria",
    "/prestacao-contas",
    "/configuracoes",
    "/backup",
  ],
  "Venerável Mestre": [
    "/dashboard",
    "/obreiros",
    "/tesouraria",
    "/chancelaria",
    "/secretaria",
    "/prestacao-contas",
  ],
  Secretário: [
    "/dashboard",
    "/obreiros",
    "/chancelaria",
    "/secretaria",
    "/prestacao-contas",
  ],
  Tesoureiro: [
    "/dashboard",
    "/obreiros",
    "/tesouraria",
    "/prestacao-contas",
  ],
  Chanceler: [
    "/dashboard",
    "/obreiros",
    "/chancelaria",
  ],
};

export function podeAcessarModulo(perfil: PerfilUsuario, rota: string) {
  const permissoes = permissoesPorPerfil[perfil] ?? [];

  return permissoes.some((permitida) => {
    return rota === permitida || rota.startsWith(`${permitida}/`);
  });
}

export function usuarioSemSenha(usuario: UsuarioSigma): UsuarioLogado {
  const { senha, ...semSenha } = usuario;
  return semSenha;
}
