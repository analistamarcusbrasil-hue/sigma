export type TipoObreiro = "Obreiro da Loja" | "Visitante";

export type SituacaoObreiro = "Ativo" | "Inativo";

export type Obreiro = {
  id: string;
  nome: string;
  grau: string;
  cargo: string;
  telefone: string;
  email: string;
  situacao: SituacaoObreiro;
  dataCadastro: string;
  observacoes: string;
  tipo?: TipoObreiro;
  lojaOrigem?: string;
};

export type StatusPresenca = "Não marcado" | "Presente" | "Falta" | "Justificado";

export type RegistroPresenca = {
  sessaoId: string;
  obreiroId: string;
  status: StatusPresenca;
  observacao?: string;
  cargoSessao?: string;
};
