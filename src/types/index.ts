export type Obreiro = {
  id: string;
  nome: string;
  grau: string;
  cargo: string;
  telefone: string;
  email: string;
  situacao: string;
};

export type StatusPresenca = "Não marcado" | "Presente" | "Falta" | "Justificado";

export type RegistroPresenca = {
  sessaoId: string;
  obreiroId: string;
  status: StatusPresenca;
};
