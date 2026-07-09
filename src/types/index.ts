export type TipoObreiro = "Obreiro da Loja" | "Visitante";

export type Obreiro = {
  id: string;
  nome: string;
  grau: string;
  cargo: string;
  telefone: string;
  email: string;
  situacao: string;
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
