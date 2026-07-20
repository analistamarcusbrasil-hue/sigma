export const grausPreCadastro = ["Aprendiz", "Companheiro", "Mestre", "Mestre Instalado", "Não informado"] as const;
export const situacoesPreCadastro = ["Ativo", "Filiado", "Regularizando", "Visitante", "Licenciado", "Em processo de retorno", "Outro"] as const;
export const statusPreCadastro = ["Pendente", "Em análise", "Aprovado", "Recusado", "Correção solicitada", "Convertido em Obreiro", "Arquivado"] as const;

export type GrauPreCadastro = typeof grausPreCadastro[number];
export type SituacaoPreCadastro = typeof situacoesPreCadastro[number];
export type StatusPreCadastro = typeof statusPreCadastro[number];

export type EntradaPreCadastro = {
  lojaId: string; nomeCompleto: string; nomePreferido?: string; email: string; telefone: string;
  cpf?: string; dataNascimento?: string; cim: string; grau: string; situacao: string;
  lojaOrigem?: string; oriente?: string; potencia?: string; cargoFuncao?: string;
  observacoes?: string; consentimento: boolean; website?: string;
};

export type DadosPreCadastroValidos = Omit<EntradaPreCadastro, "grau" | "situacao" | "website"> & {
  grau: GrauPreCadastro; situacao: SituacaoPreCadastro;
};

const limites: Record<string, number> = {
  nomeCompleto: 160, nomePreferido: 80, email: 254, telefone: 30, cpf: 20,
  cim: 40, lojaOrigem: 160, oriente: 120, potencia: 120, cargoFuncao: 120, observacoes: 1500,
};

const texto = (valor: unknown) => typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";

export function validarEntradaPreCadastro(entrada: EntradaPreCadastro): { ok: true; dados: DadosPreCadastroValidos } | { ok: false; erro: string } {
  const dados = {
    lojaId: texto(entrada.lojaId), nomeCompleto: texto(entrada.nomeCompleto), nomePreferido: texto(entrada.nomePreferido),
    email: texto(entrada.email).toLowerCase(), telefone: texto(entrada.telefone), cpf: texto(entrada.cpf).replace(/\D/g, ""),
    dataNascimento: texto(entrada.dataNascimento), cim: texto(entrada.cim), grau: texto(entrada.grau), situacao: texto(entrada.situacao),
    lojaOrigem: texto(entrada.lojaOrigem), oriente: texto(entrada.oriente), potencia: texto(entrada.potencia),
    cargoFuncao: texto(entrada.cargoFuncao), observacoes: typeof entrada.observacoes === "string" ? entrada.observacoes.trim() : "",
    consentimento: entrada.consentimento === true,
  };
  if (!/^[0-9a-f-]{36}$/i.test(dados.lojaId)) return { ok: false, erro: "Selecione uma Loja válida." };
  if (dados.nomeCompleto.length < 3) return { ok: false, erro: "Informe seu nome completo." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) return { ok: false, erro: "Informe um e-mail válido." };
  const telefoneDigitos = dados.telefone.replace(/\D/g, "");
  if (telefoneDigitos.length < 10 || telefoneDigitos.length > 15) return { ok: false, erro: "Informe um telefone ou WhatsApp válido, com DDD." };
  if (dados.cim.length < 2) return { ok: false, erro: "Informe seu CIM maçônico." };
  if (!grausPreCadastro.includes(dados.grau as GrauPreCadastro)) return { ok: false, erro: "Selecione um grau maçônico válido." };
  if (!situacoesPreCadastro.includes(dados.situacao as SituacaoPreCadastro)) return { ok: false, erro: "Selecione uma situação válida." };
  if (dados.dataNascimento && !/^\d{4}-\d{2}-\d{2}$/.test(dados.dataNascimento)) return { ok: false, erro: "Informe uma data de nascimento válida." };
  if (dados.cpf && dados.cpf.length !== 11) return { ok: false, erro: "O CPF deve conter 11 números." };
  if (!dados.consentimento) return { ok: false, erro: "Confirme a veracidade e o consentimento para enviar." };
  for (const [campo, maximo] of Object.entries(limites)) {
    if (String(dados[campo as keyof typeof dados] ?? "").length > maximo) return { ok: false, erro: "Revise os campos: há uma informação maior que o permitido." };
  }
  return { ok: true, dados: dados as DadosPreCadastroValidos };
}
