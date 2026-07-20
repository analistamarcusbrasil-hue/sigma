import type { StatusPreCadastro } from "@/lib/pre-cadastro-validacao";

export type PreCadastroAdmin = {
  id: string; protocolo: string; lojaId: string; lojaNome: string; lojaNumero: string;
  nomeCompleto: string; nomePreferido: string; email: string; telefone: string; cpf: string;
  dataNascimento: string; cim: string; grau: string; situacao: string; lojaOrigem: string;
  oriente: string; potencia: string; cargoFuncao: string; observacoes: string;
  status: StatusPreCadastro; parecer: string; avaliadoEm: string; obreiroId: string; usuarioId: string;
  criadoEm: string; atualizadoEm: string;
};
