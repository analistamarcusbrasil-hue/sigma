import { createClient } from "@/lib/supabase/client";
import type { Obreiro, RegistroPresenca, Sessao } from "@/types";

type Loja = { id: string; nome: string };

export type GestaoOperacional = {
  id: string;
  nomeGestao: string;
  gestaoAnteriorRepasse: string;
  dataInicioGestao: string;
  dataFimGestao: string;
  anoTrabalho: number;
  financeiroPositivoRecebido: number;
  financeiroNegativoRecebido: number;
  caixaFisicoRecebido: number;
  contaBancariaRecebida: number;
  creditosReceber: number;
  status: "Rascunho" | "Atual" | "Encerrada";
  observacaoRepasse: string;
  cargos: Record<string, string>;
  diretoria: Record<string, string>;
  ativa?: boolean;
};

export type RegraFinanceira = { id: string; dataInicio: string; valor: number; descricao: string };
export type RecebimentoFinanceiro = { id: string; obreiroId: string; mesLancamento: string; valor: number };
export type LancamentoFinanceiro = { id: string; data: string; tipo: string; descricao: string; valor: number; sessaoId?: string };
export type CustoFinanceiro = { id: string; fornecedorNome: string; cnpj: string; tipoDivida: string; descricao: string; valorTotal: number; parcelasQtd: number; dataInicio: string; dataFim: string; parcelas: unknown[] };
export type TesourariaBanco = { regras: RegraFinanceira[]; recebimentos: RecebimentoFinanceiro[]; lancamentos: LancamentoFinanceiro[]; custos: CustoFinanceiro[] };
export type DocumentoBanco = { id: string; numero: string; tipo: string; sessaoId: string; data: string; titulo: string; grau: string; status: string; ordemDoDia: string; resumo: string; deliberacoes: string; tronco: string; observacoes: string; relatoBruto: string; decisoesLoja: string; textoGerado: string };
export type AcaoBanco = { id: string; titulo: string; responsavelId: string; prazo: string; status: string; observacao: string };
export type ProcessoBanco = { id: string; nome: string; tipo: string; etapa: string; responsavelId: string; dataPrevista: string; status: string; observacao: string };
export type PecaBanco = { id: string; titulo: string; obreiroId: string; grau: string; dataPrevista: string; status: string; observacao: string };
export type DecisaoBanco = { id: string; documentoId: string; sessaoId: string; data: string; texto: string; status: string; origem: string };
export type SecretariaBanco = { documentos: DocumentoBanco[]; acoes: AcaoBanco[]; processos: ProcessoBanco[]; pecas: PecaBanco[]; decisoes: DecisaoBanco[] };
export type EventoAuditoria = {
  id: number;
  usuarioId: string | null;
  tabela: string;
  operacao: "INSERT" | "UPDATE" | "DELETE";
  registroId: string | null;
  alteracoes: Record<string, { antes: unknown; depois: unknown }>;
  ocorridoEm: string;
};
export type TipoEventoAgenda = "Sessão" | "Reunião" | "Cerimônia" | "Evento social" | "Prazo" | "Financeiro" | "Comissão" | "Outro";
export type StatusEventoAgenda = "Planejado" | "Confirmado" | "Concluído" | "Cancelado";
export type EventoAgenda = { id: string; sessaoId: string; titulo: string; tipo: TipoEventoAgenda; descricao: string; inicio: string; fim: string; diaInteiro: boolean; local: string; responsavelId: string; status: StatusEventoAgenda; recorrencia: "Nenhuma" | "Semanal" | "Mensal" | "Anual"; lembreteMinutos: number | null };
export type ContaFinanceira = { id: string; nome: string; tipo: "Caixa" | "Conta corrente" | "Poupança" | "Investimento" | "PIX" | "Outros"; banco: string; agencia: string; numero: string; saldoInicial: number; ativa: boolean };
export type CategoriaFinanceira = { id: string; nome: string; natureza: "Receita" | "Despesa" | "Ambos"; cor: string; ativa: boolean };
export type CentroCusto = { id: string; nome: string; descricao: string; ativo: boolean };
export type CadastrosFinanceiros = { contas: ContaFinanceira[]; categorias: CategoriaFinanceira[]; centros: CentroCusto[] };
export type StatusLivroCaixa = "Rascunho" | "Lançado" | "Conferido" | "Aprovado" | "Conciliado" | "Cancelado";
export type LancamentoLivroCaixa = { id:string; gestaoId:string; data:string; competencia:string; natureza:"Entrada"|"Saída"; origem:"Manual"|"Mensalidade"|"Tronco"|"Despesa"|"Evento"|"Repasse"|"Outro"; contaId:string; categoriaId:string; centroCustoId:string; formaPagamento:string; valor:number; descricao:string; observacoes:string; status:StatusLivroCaixa; comprovanteUrl:string; comprovanteObservacao:string; documentoNumero:string; comprovanteData:string; responsavelId:string; criadoEm:string; atualizadoEm:string };
export type StatusFechamentoMensal = "Aberto" | "Em conferência" | "Fechado" | "Aprovado" | "Reaberto";
export type FechamentoMensal = { id:string; gestaoId:string; competencia:string; status:StatusFechamentoMensal; saldoInicial:number; totalEntradas:number; totalSaidas:number; saldoFinal:number; mensalidadesRecebidas:number; mensalidadesAbertas:number; totalTronco:number; despesasPagas:number; despesasPendentes:number; semComprovante:number; observacoesTesoureiro:string; observacoesAprovacao:string; motivoReabertura:string; responsavelFechamentoId:string; responsavelAprovacaoId:string; fechadoEm:string; aprovadoEm:string; criadoEm:string; atualizadoEm:string };

function mensagem(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message);
  return fallback;
}

export async function obterLojaAtual(): Promise<Loja> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("loja_usuarios")
    .select("loja_id, lojas(id, nome)")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const loja = data?.lojas as unknown as Loja | null;
  if (!loja) throw new Error("Seu usuário ainda não está vinculado a uma Loja.");
  return loja;
}

export async function listarAuditoria(limite = 250): Promise<EventoAuditoria[]> {
  const loja = await obterLojaAtual();
  const { data, error } = await createClient()
    .from("auditoria_eventos")
    .select("id, usuario_id, tabela, operacao, registro_id, alteracoes, ocorrido_em")
    .eq("loja_id", loja.id)
    .order("ocorrido_em", { ascending: false })
    .limit(Math.min(Math.max(limite, 1), 500));
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => ({
    id: Number(item.id), usuarioId: item.usuario_id, tabela: item.tabela,
    operacao: item.operacao as EventoAuditoria["operacao"], registroId: item.registro_id,
    alteracoes: (item.alteracoes ?? {}) as EventoAuditoria["alteracoes"], ocorridoEm: item.ocorrido_em,
  }));
}

export async function listarAgenda(): Promise<EventoAgenda[]> {
  const loja = await obterLojaAtual();
  const { data, error } = await createClient().from("agenda_eventos").select("*").eq("loja_id", loja.id).order("inicio");
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => ({ id: item.id, sessaoId: item.sessao_id ?? "", titulo: item.titulo, tipo: item.tipo as TipoEventoAgenda, descricao: item.descricao ?? "", inicio: item.inicio, fim: item.fim ?? "", diaInteiro: item.dia_inteiro, local: item.local ?? "", responsavelId: item.responsavel_id ?? "", status: item.status as StatusEventoAgenda, recorrencia: item.recorrencia as EventoAgenda["recorrencia"], lembreteMinutos: item.lembrete_minutos }));
}

export async function salvarEventoAgenda(evento: EventoAgenda): Promise<EventoAgenda> {
  const loja = await obterLojaAtual();
  const payload = { loja_id: loja.id, sessao_id: evento.sessaoId || null, titulo: evento.titulo.trim(), tipo: evento.tipo, descricao: evento.descricao.trim() || null, inicio: evento.inicio, fim: evento.fim || null, dia_inteiro: evento.diaInteiro, local: evento.local.trim() || null, responsavel_id: evento.responsavelId || null, status: evento.status, recorrencia: evento.recorrencia, lembrete_minutos: evento.lembreteMinutos };
  const query = evento.id ? createClient().from("agenda_eventos").update(payload).eq("id", evento.id).eq("loja_id", loja.id) : createClient().from("agenda_eventos").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(error.message);
  return { ...evento, id: data.id };
}

export async function excluirEventoAgenda(id: string) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("agenda_eventos").delete().eq("id", id).eq("loja_id", loja.id);
  if (error) throw new Error(error.message);
}

export async function carregarCadastrosFinanceiros(): Promise<CadastrosFinanceiros> {
  const loja = await obterLojaAtual(); const supabase = createClient();
  const [contas, categorias, centros] = await Promise.all([
    supabase.from("contas_financeiras").select("*").eq("loja_id", loja.id).order("nome"),
    supabase.from("categorias_financeiras").select("*").eq("loja_id", loja.id).order("natureza").order("nome"),
    supabase.from("centros_custo").select("*").eq("loja_id", loja.id).order("nome"),
  ]);
  for (const resultado of [contas, categorias, centros]) if (resultado.error) throw new Error(resultado.error.message);
  return { contas: (contas.data ?? []).map((i) => ({ id:i.id, nome:i.nome, tipo:i.tipo as ContaFinanceira["tipo"], banco:i.banco ?? "", agencia:i.agencia ?? "", numero:i.numero ?? "", saldoInicial:Number(i.saldo_inicial), ativa:i.ativa })), categorias: (categorias.data ?? []).map((i) => ({ id:i.id, nome:i.nome, natureza:i.natureza as CategoriaFinanceira["natureza"], cor:i.cor ?? "#fbbf24", ativa:i.ativa })), centros: (centros.data ?? []).map((i) => ({ id:i.id, nome:i.nome, descricao:i.descricao ?? "", ativo:i.ativo })) };
}
export async function salvarContaFinanceira(item: ContaFinanceira) { const loja = await obterLojaAtual(); const payload={ loja_id:loja.id,nome:item.nome.trim(),tipo:item.tipo,banco:item.banco.trim()||null,agencia:item.agencia.trim()||null,numero:item.numero.trim()||null,saldo_inicial:item.saldoInicial,ativa:item.ativa }; const query=item.id?createClient().from("contas_financeiras").update(payload).eq("id",item.id).eq("loja_id",loja.id):createClient().from("contas_financeiras").insert(payload); const {data,error}=await query.select("id").single(); if(error)throw new Error(error.message); return {...item,id:data.id}; }
export async function salvarCategoriaFinanceira(item: CategoriaFinanceira) { const loja=await obterLojaAtual(); const payload={loja_id:loja.id,nome:item.nome.trim(),natureza:item.natureza,cor:item.cor,ativa:item.ativa}; const query=item.id?createClient().from("categorias_financeiras").update(payload).eq("id",item.id).eq("loja_id",loja.id):createClient().from("categorias_financeiras").insert(payload); const {data,error}=await query.select("id").single(); if(error)throw new Error(error.message); return {...item,id:data.id}; }
export async function salvarCentroCusto(item: CentroCusto) { const loja=await obterLojaAtual(); const payload={loja_id:loja.id,nome:item.nome.trim(),descricao:item.descricao.trim()||null,ativo:item.ativo}; const query=item.id?createClient().from("centros_custo").update(payload).eq("id",item.id).eq("loja_id",loja.id):createClient().from("centros_custo").insert(payload); const {data,error}=await query.select("id").single(); if(error)throw new Error(error.message); return {...item,id:data.id}; }
export async function excluirCadastroFinanceiro(tabela: "contas_financeiras"|"categorias_financeiras"|"centros_custo", id:string){ await excluirRegistroDaLoja(tabela,id); }

export async function listarLivroCaixa(): Promise<LancamentoLivroCaixa[]> {
  const loja=await obterLojaAtual(); const {data,error}=await createClient().from("lancamentos_financeiros").select("*").eq("loja_id",loja.id).order("data",{ascending:false}); if(error)throw new Error(error.message);
  return (data??[]).map((i)=>({id:i.id,gestaoId:i.administracao_id??"",data:i.data,competencia:i.competencia??i.data,natureza:(i.natureza??(i.tipo==="Despesa"?"Saída":"Entrada")) as LancamentoLivroCaixa["natureza"],origem:(i.origem??"Manual") as LancamentoLivroCaixa["origem"],contaId:i.conta_id??"",categoriaId:i.categoria_id??"",centroCustoId:i.centro_custo_id??"",formaPagamento:i.forma_pagamento??"",valor:Number(i.valor),descricao:i.descricao,observacoes:i.observacoes??"",status:(i.status_caixa??"Lançado") as StatusLivroCaixa,comprovanteUrl:i.comprovante_url??"",comprovanteObservacao:i.comprovante_observacao??"",documentoNumero:i.documento_numero??"",comprovanteData:i.comprovante_data??"",responsavelId:i.responsavel_id??"",criadoEm:i.created_at,atualizadoEm:i.updated_at}));
}
export async function salvarLancamentoLivroCaixa(item:LancamentoLivroCaixa):Promise<LancamentoLivroCaixa>{
 const loja=await obterLojaAtual(); const payload={loja_id:loja.id,administracao_id:item.gestaoId||null,data:item.data,competencia:item.competencia||item.data,natureza:item.natureza,origem:item.origem,conta_id:item.contaId,categoria_id:item.categoriaId,centro_custo_id:item.centroCustoId||null,forma_pagamento:item.formaPagamento||null,valor:item.valor,descricao:item.descricao.trim(),observacoes:item.observacoes.trim()||null,status_caixa:item.status,comprovante_url:item.comprovanteUrl.trim()||null,comprovante_observacao:item.comprovanteObservacao.trim()||null,documento_numero:item.documentoNumero.trim()||null,comprovante_data:item.comprovanteData||null,tipo:item.origem==="Tronco"?"Tronco de Solidariedade":item.natureza==="Saída"?"Despesa":"Receita Extra"};
 const query=item.id?createClient().from("lancamentos_financeiros").update(payload).eq("id",item.id).eq("loja_id",loja.id):createClient().from("lancamentos_financeiros").insert(payload); const {data,error}=await query.select("id,administracao_id,created_at,updated_at,responsavel_id").single();if(error)throw new Error(error.message);return{...item,id:data.id,gestaoId:data.administracao_id??item.gestaoId,responsavelId:data.responsavel_id??item.responsavelId,criadoEm:data.created_at,atualizadoEm:data.updated_at};
}
export async function excluirLancamentoLivroCaixa(id:string){await excluirRegistroDaLoja("lancamentos_financeiros",id);}

export async function listarFechamentosMensais():Promise<FechamentoMensal[]> {
 const loja=await obterLojaAtual(); const {data,error}=await createClient().from("fechamentos_mensais").select("*").eq("loja_id",loja.id).order("competencia",{ascending:false}); if(error)throw new Error(error.message);
 return (data??[]).map(i=>({id:i.id,gestaoId:i.administracao_id,competencia:i.competencia,status:i.status as StatusFechamentoMensal,saldoInicial:Number(i.saldo_inicial),totalEntradas:Number(i.total_entradas),totalSaidas:Number(i.total_saidas),saldoFinal:Number(i.saldo_final),mensalidadesRecebidas:Number(i.total_mensalidades_recebidas),mensalidadesAbertas:Number(i.total_mensalidades_abertas),totalTronco:Number(i.total_tronco),despesasPagas:Number(i.total_despesas_pagas),despesasPendentes:Number(i.total_despesas_pendentes),semComprovante:Number(i.lancamentos_sem_comprovante),observacoesTesoureiro:i.observacoes_tesoureiro??"",observacoesAprovacao:i.observacoes_aprovacao??"",motivoReabertura:i.motivo_reabertura??"",responsavelFechamentoId:i.responsavel_fechamento_id??"",responsavelAprovacaoId:i.responsavel_aprovacao_id??"",fechadoEm:i.fechado_em??"",aprovadoEm:i.aprovado_em??"",criadoEm:i.criado_em,atualizadoEm:i.atualizado_em}));
}
export async function salvarFechamentoMensal(item:FechamentoMensal):Promise<FechamentoMensal>{
 const loja=await obterLojaAtual(); const payload={loja_id:loja.id,administracao_id:item.gestaoId,competencia:`${item.competencia.slice(0,7)}-01`,status:item.status,saldo_inicial:item.saldoInicial,total_entradas:item.totalEntradas,total_saidas:item.totalSaidas,saldo_final:item.saldoFinal,total_mensalidades_recebidas:item.mensalidadesRecebidas,total_mensalidades_abertas:item.mensalidadesAbertas,total_tronco:item.totalTronco,total_despesas_pagas:item.despesasPagas,total_despesas_pendentes:item.despesasPendentes,lancamentos_sem_comprovante:item.semComprovante,observacoes_tesoureiro:item.observacoesTesoureiro.trim()||null,observacoes_aprovacao:item.observacoesAprovacao.trim()||null,motivo_reabertura:item.motivoReabertura.trim()||null};
 const query=item.id?createClient().from("fechamentos_mensais").update(payload).eq("id",item.id).eq("loja_id",loja.id):createClient().from("fechamentos_mensais").insert(payload); const {data,error}=await query.select("id,fechado_em,aprovado_em,responsavel_fechamento_id,responsavel_aprovacao_id,criado_em,atualizado_em").single(); if(error)throw new Error(error.message); return{...item,id:data.id,fechadoEm:data.fechado_em??"",aprovadoEm:data.aprovado_em??"",responsavelFechamentoId:data.responsavel_fechamento_id??"",responsavelAprovacaoId:data.responsavel_aprovacao_id??"",criadoEm:data.criado_em,atualizadoEm:data.atualizado_em};
}

export async function listarObreiros(): Promise<Obreiro[]> {
  const loja = await obterLojaAtual();
  const { data, error } = await createClient().from("obreiros").select("*").eq("loja_id", loja.id).order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => ({
    id: item.id, nome: item.nome, grau: item.grau, cargo: item.cargo ?? "", telefone: item.telefone ?? "",
    email: item.email ?? "", situacao: item.situacao, dataCadastro: item.data_cadastro,
    observacoes: item.observacoes ?? "", tipo: item.tipo, lojaOrigem: item.loja_origem ?? "",
  }));
}

export async function salvarObreiro(obreiro: Obreiro): Promise<Obreiro> {
  const loja = await obterLojaAtual();
  const payload = {
    loja_id: loja.id, nome: obreiro.nome.trim(), grau: obreiro.grau, cargo: obreiro.cargo || null,
    telefone: obreiro.telefone || null, email: obreiro.email.trim().toLowerCase() || null,
    situacao: obreiro.situacao, data_cadastro: obreiro.dataCadastro, observacoes: obreiro.observacoes || null,
    tipo: obreiro.tipo ?? "Obreiro da Loja", loja_origem: obreiro.lojaOrigem || null,
  };
  const query = obreiro.id
    ? createClient().from("obreiros").update(payload).eq("id", obreiro.id).eq("loja_id", loja.id)
    : createClient().from("obreiros").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(error.message);
  return { ...obreiro, id: data.id };
}

export async function excluirObreiro(id: string) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("obreiros").delete().eq("id", id).eq("loja_id", loja.id);
  mensagem(error, "");
}

export async function listarSessoes(): Promise<Sessao[]> {
  const loja = await obterLojaAtual();
  const { data, error } = await createClient().from("sessoes").select("id, data, tipo, grau, titulo, observacao").eq("loja_id", loja.id).order("data", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => ({ ...item, observacao: item.observacao ?? "" }));
}

export async function salvarSessao(sessao: Sessao): Promise<Sessao> {
  const loja = await obterLojaAtual();
  const payload = { loja_id: loja.id, data: sessao.data, tipo: sessao.tipo, grau: sessao.grau, titulo: sessao.titulo.trim(), observacao: sessao.observacao || null };
  const query = sessao.id
    ? createClient().from("sessoes").update(payload).eq("id", sessao.id).eq("loja_id", loja.id)
    : createClient().from("sessoes").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(error.message);
  return { ...sessao, id: data.id };
}

export async function excluirSessao(id: string) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("sessoes").delete().eq("id", id).eq("loja_id", loja.id);
  mensagem(error, "");
}

export async function listarPresencas(): Promise<RegistroPresenca[]> {
  const loja = await obterLojaAtual();
  const { data: sessoes, error: sessoesError } = await createClient().from("sessoes").select("id").eq("loja_id", loja.id);
  if (sessoesError) throw new Error(sessoesError.message);
  const ids = (sessoes ?? []).map((item) => item.id);
  if (!ids.length) return [];
  const { data, error } = await createClient().from("presencas").select("sessao_id, obreiro_id, status, observacao, cargo_sessao").in("sessao_id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => ({ sessaoId: item.sessao_id, obreiroId: item.obreiro_id, status: item.status, observacao: item.observacao ?? "", cargoSessao: item.cargo_sessao ?? "" }));
}

export async function salvarPresencas(registros: RegistroPresenca[]) {
  if (!registros.length) return;
  const payload = registros.map((item) => ({ sessao_id: item.sessaoId, obreiro_id: item.obreiroId, status: item.status, observacao: item.observacao || null, cargo_sessao: item.cargoSessao || null }));
  const { error } = await createClient().from("presencas").upsert(payload, { onConflict: "sessao_id,obreiro_id" });
  mensagem(error, "");
}

export async function listarGestoes(): Promise<GestaoOperacional[]> {
  const loja = await obterLojaAtual();
  const { data, error } = await createClient().from("administracoes").select("*").eq("loja_id", loja.id).order("data_inicio", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => ({
    id: item.id, nomeGestao: item.nome, gestaoAnteriorRepasse: item.gestao_anterior_repasse ?? "",
    dataInicioGestao: item.data_inicio, dataFimGestao: item.data_fim ?? "", anoTrabalho: item.ano_trabalho,
    financeiroPositivoRecebido: Number(item.saldo_positivo_inicial), financeiroNegativoRecebido: Number(item.saldo_negativo_inicial),
    caixaFisicoRecebido: Number(item.caixa_fisico_inicial ?? 0), contaBancariaRecebida: Number(item.conta_bancaria_inicial ?? 0),
    creditosReceber: Number(item.creditos_receber_iniciais ?? 0), status: (item.status ?? (item.ativa ? "Atual" : "Rascunho")) as GestaoOperacional["status"],
    observacaoRepasse: item.observacoes ?? "", cargos: (item.cargos ?? {}) as Record<string, string>, diretoria: (item.diretoria ?? {}) as Record<string, string>, ativa: item.ativa,
  }));
}

export async function salvarGestaoBanco(gestao: GestaoOperacional): Promise<GestaoOperacional> {
  const loja = await obterLojaAtual();
  const supabase = createClient();
  if (gestao.ativa) {
    const { error } = await supabase.from("administracoes").update({ ativa: false }).eq("loja_id", loja.id).eq("ativa", true);
    if (error) throw new Error(error.message);
  }
  const payload = {
    loja_id: loja.id, nome: gestao.nomeGestao.trim(), gestao_anterior_repasse: gestao.gestaoAnteriorRepasse.trim() || null,
    data_inicio: gestao.dataInicioGestao, data_fim: gestao.dataFimGestao || null, ano_trabalho: gestao.anoTrabalho,
    saldo_positivo_inicial: gestao.financeiroPositivoRecebido, saldo_negativo_inicial: gestao.financeiroNegativoRecebido,
    caixa_fisico_inicial: gestao.caixaFisicoRecebido, conta_bancaria_inicial: gestao.contaBancariaRecebida,
    creditos_receber_iniciais: gestao.creditosReceber, status: gestao.status,
    observacoes: gestao.observacaoRepasse || null, cargos: gestao.cargos, diretoria: gestao.diretoria, ativa: gestao.status === "Atual",
  };
  const query = gestao.id ? supabase.from("administracoes").update(payload).eq("id", gestao.id).eq("loja_id", loja.id) : supabase.from("administracoes").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(error.message);
  return { ...gestao, id: data.id };
}

export async function ativarGestaoBanco(id: string) {
  const { error } = await createClient().rpc("ativar_administracao", {
    alvo_administracao: id,
  });
  if (error) throw new Error(error.message);
}

export async function excluirGestaoBanco(id: string) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("administracoes").delete().eq("id", id).eq("loja_id", loja.id);
  if (error) throw new Error(error.message);
}

export async function carregarTesouraria(): Promise<TesourariaBanco> {
  const loja = await obterLojaAtual();
  const supabase = createClient();
  const [regras, recebimentos, lancamentos, custos] = await Promise.all([
    supabase.from("regras_mensalidade").select("*").eq("loja_id", loja.id).order("data_inicio"),
    supabase.from("recebimentos").select("*").eq("loja_id", loja.id).order("data"),
    supabase.from("lancamentos_financeiros").select("*").eq("loja_id", loja.id).order("data"),
    supabase.from("custos_loja").select("*").eq("loja_id", loja.id).order("data_inicio", { ascending: false }),
  ]);
  for (const resultado of [regras, recebimentos, lancamentos, custos]) if (resultado.error) throw new Error(resultado.error.message);
  return {
    regras: (regras.data ?? []).map((i) => ({ id: i.id, dataInicio: i.data_inicio, valor: Number(i.valor), descricao: i.descricao ?? "" })),
    recebimentos: (recebimentos.data ?? []).map((i) => ({ id: i.id, obreiroId: i.obreiro_id, mesLancamento: String(i.data).slice(0, 7), valor: Number(i.valor) })),
    lancamentos: (lancamentos.data ?? []).filter((i) => !["Rascunho", "Cancelado"].includes(i.status_caixa ?? "Lançado")).map((i) => ({ id: i.id, data: i.data, tipo: i.tipo, descricao: i.descricao, valor: Number(i.valor), sessaoId: i.sessao_id ?? undefined })),
    custos: (custos.data ?? []).map((i) => ({ id: i.id, fornecedorNome: i.fornecedor_nome, cnpj: i.cnpj ?? "", tipoDivida: i.tipo_divida, descricao: i.descricao ?? "", valorTotal: Number(i.valor_total), parcelasQtd: i.parcelas_qtd, dataInicio: i.data_inicio, dataFim: i.data_fim ?? "", parcelas: Array.isArray(i.parcelas) ? i.parcelas : [] })),
  };
}

async function reconciliarTabela(tabela: string, lojaId: string, itens: Array<Record<string, unknown>>) {
  const supabase = createClient();
  const ids = itens.map((item) => String(item.id));
  let exclusao = supabase.from(tabela).delete().eq("loja_id", lojaId);
  if (ids.length) exclusao = exclusao.not("id", "in", `(${ids.join(",")})`);
  const { error: deleteError } = await exclusao;
  if (deleteError) throw new Error(deleteError.message);
  if (itens.length) {
    const { error } = await supabase.from(tabela).upsert(itens);
    if (error) throw new Error(error.message);
  }
}

/** @deprecated Use as mutações pontuais abaixo. Mantido temporariamente para compatibilidade. */
export async function sincronizarTesouraria(estado: TesourariaBanco) {
  const loja = await obterLojaAtual();
  await Promise.all([
    reconciliarTabela("regras_mensalidade", loja.id, estado.regras.map((i) => ({ id: i.id, loja_id: loja.id, data_inicio: i.dataInicio, valor: i.valor, descricao: i.descricao || null }))),
    reconciliarTabela("recebimentos", loja.id, estado.recebimentos.map((i) => ({ id: i.id, loja_id: loja.id, obreiro_id: i.obreiroId, data: `${i.mesLancamento}-01`, valor: i.valor, descricao: "Mensalidade" }))),
    reconciliarTabela("lancamentos_financeiros", loja.id, estado.lancamentos.map((i) => ({ id: i.id, loja_id: loja.id, sessao_id: i.sessaoId || null, data: i.data, tipo: i.tipo, descricao: i.descricao, valor: i.valor }))),
    reconciliarTabela("custos_loja", loja.id, estado.custos.map((i) => ({ id: i.id, loja_id: loja.id, fornecedor_nome: i.fornecedorNome, cnpj: i.cnpj || null, tipo_divida: i.tipoDivida, descricao: i.descricao || null, valor_total: i.valorTotal, parcelas_qtd: i.parcelasQtd, data_inicio: i.dataInicio, data_fim: i.dataFim || null, parcelas: i.parcelas }))),
  ]);
}

export async function salvarRegrasFinanceiras(itens: RegraFinanceira[]) {
  if (!itens.length) return;
  const loja = await obterLojaAtual();
  const payload = itens.map((i) => ({ id: i.id, loja_id: loja.id, data_inicio: i.dataInicio, valor: i.valor, descricao: i.descricao || null }));
  const { error } = await createClient().from("regras_mensalidade").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function excluirRegraFinanceira(id: string) {
  await excluirRegistroDaLoja("regras_mensalidade", id);
}

export async function salvarRecebimentosFinanceiros(itens: RecebimentoFinanceiro[]) {
  if (!itens.length) return;
  const loja = await obterLojaAtual();
  const payload = itens.map((i) => ({ id: i.id, loja_id: loja.id, obreiro_id: i.obreiroId, data: `${i.mesLancamento}-01`, valor: i.valor, descricao: "Mensalidade" }));
  const { error } = await createClient().from("recebimentos").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function excluirRecebimentosDaCompetencia(mes: string) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("recebimentos").delete().eq("loja_id", loja.id).eq("data", `${mes}-01`);
  if (error) throw new Error(error.message);
}

export async function salvarLancamentoFinanceiro(item: LancamentoFinanceiro) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("lancamentos_financeiros").upsert({ id: item.id, loja_id: loja.id, sessao_id: item.sessaoId || null, data: item.data, tipo: item.tipo, descricao: item.descricao, valor: item.valor });
  if (error) throw new Error(error.message);
}

export async function excluirLancamentoFinanceiro(id: string) {
  await excluirRegistroDaLoja("lancamentos_financeiros", id);
}

export async function salvarCustoFinanceiro(item: CustoFinanceiro) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("custos_loja").upsert({ id: item.id, loja_id: loja.id, fornecedor_nome: item.fornecedorNome, cnpj: item.cnpj || null, tipo_divida: item.tipoDivida, descricao: item.descricao || null, valor_total: item.valorTotal, parcelas_qtd: item.parcelasQtd, data_inicio: item.dataInicio, data_fim: item.dataFim || null, parcelas: item.parcelas });
  if (error) throw new Error(error.message);
}

export async function excluirCustoFinanceiro(id: string) {
  await excluirRegistroDaLoja("custos_loja", id);
}

async function excluirRegistroDaLoja(tabela: string, id: string) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from(tabela).delete().eq("id", id).eq("loja_id", loja.id);
  if (error) throw new Error(error.message);
}

export async function carregarSecretaria(): Promise<SecretariaBanco> {
  const loja = await obterLojaAtual();
  const supabase = createClient();
  const [documentos, acoes, processos, pecas, decisoes] = await Promise.all([
    supabase.from("documentos_secretaria").select("*").eq("loja_id", loja.id).order("data", { ascending: false }),
    supabase.from("acoes_secretaria").select("*").eq("loja_id", loja.id).order("prazo"),
    supabase.from("processos_secretaria").select("*").eq("loja_id", loja.id).order("data_prevista"),
    supabase.from("pecas_arquitetura").select("*").eq("loja_id", loja.id).order("data_prevista"),
    supabase.from("decisoes_loja").select("*").eq("loja_id", loja.id).order("data", { ascending: false }),
  ]);
  for (const resultado of [documentos, acoes, processos, pecas, decisoes]) if (resultado.error) throw new Error(resultado.error.message);
  return {
    documentos: (documentos.data ?? []).map((i) => ({ id:i.id, numero:i.numero, tipo:i.tipo, sessaoId:i.sessao_id ?? "", data:i.data, titulo:i.titulo, grau:i.grau ?? "", status:i.status, ordemDoDia:i.ordem_do_dia ?? "", resumo:i.resumo ?? "", deliberacoes:i.deliberacoes ?? "", tronco:i.tronco ?? "", observacoes:i.observacoes ?? "", relatoBruto:i.relato_bruto ?? "", decisoesLoja:i.decisoes_loja ?? "", textoGerado:i.texto_gerado ?? "" })),
    acoes: (acoes.data ?? []).map((i) => ({ id:i.id, titulo:i.titulo, responsavelId:i.responsavel_id ?? "", prazo:i.prazo ?? "", status:i.status, observacao:i.observacao ?? "" })),
    processos: (processos.data ?? []).map((i) => ({ id:i.id, nome:i.nome, tipo:i.tipo, etapa:i.etapa ?? "", responsavelId:i.responsavel_id ?? "", dataPrevista:i.data_prevista ?? "", status:i.status, observacao:i.observacao ?? "" })),
    pecas: (pecas.data ?? []).map((i) => ({ id:i.id, titulo:i.titulo, obreiroId:i.obreiro_id ?? "", grau:i.grau ?? "", dataPrevista:i.data_prevista ?? "", status:i.status, observacao:i.observacao ?? "" })),
    decisoes: (decisoes.data ?? []).map((i) => ({ id:i.id, documentoId:i.documento_id ?? "", sessaoId:i.sessao_id ?? "", data:i.data, texto:i.texto, status:i.status, origem:i.origem ?? "" })),
  };
}

export async function sincronizarSecretaria(estado: SecretariaBanco) {
  const loja = await obterLojaAtual();
  await Promise.all([
    reconciliarTabela("documentos_secretaria", loja.id, estado.documentos.map((i) => ({ id:i.id, loja_id:loja.id, numero:i.numero, tipo:i.tipo, sessao_id:i.sessaoId || null, data:i.data, titulo:i.titulo, grau:i.grau || null, status:i.status, ordem_do_dia:i.ordemDoDia || null, resumo:i.resumo || null, deliberacoes:i.deliberacoes || null, tronco:i.tronco || null, observacoes:i.observacoes || null, relato_bruto:i.relatoBruto || null, decisoes_loja:i.decisoesLoja || null, texto_gerado:i.textoGerado || null }))),
    reconciliarTabela("acoes_secretaria", loja.id, estado.acoes.map((i) => ({ id:i.id, loja_id:loja.id, titulo:i.titulo, responsavel_id:i.responsavelId || null, prazo:i.prazo || null, status:i.status, observacao:i.observacao || null }))),
    reconciliarTabela("processos_secretaria", loja.id, estado.processos.map((i) => ({ id:i.id, loja_id:loja.id, nome:i.nome, tipo:i.tipo, etapa:i.etapa || null, responsavel_id:i.responsavelId || null, data_prevista:i.dataPrevista || null, status:i.status, observacao:i.observacao || null }))),
    reconciliarTabela("pecas_arquitetura", loja.id, estado.pecas.map((i) => ({ id:i.id, loja_id:loja.id, titulo:i.titulo, obreiro_id:i.obreiroId || null, grau:i.grau || null, data_prevista:i.dataPrevista || null, status:i.status, observacao:i.observacao || null }))),
    reconciliarTabela("decisoes_loja", loja.id, estado.decisoes.map((i) => ({ id:i.id, loja_id:loja.id, documento_id:i.documentoId || null, sessao_id:i.sessaoId || null, data:i.data, texto:i.texto, status:i.status, origem:i.origem || null }))),
  ]);
}

export async function salvarAcaoSecretaria(item: AcaoBanco) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("acoes_secretaria").upsert({ id: item.id, loja_id: loja.id, titulo: item.titulo, responsavel_id: item.responsavelId || null, prazo: item.prazo || null, status: item.status, observacao: item.observacao || null });
  if (error) throw new Error(error.message);
}

export async function excluirAcaoSecretaria(id: string) {
  await excluirRegistroDaLoja("acoes_secretaria", id);
}

export async function salvarProcessoSecretaria(item: ProcessoBanco) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("processos_secretaria").upsert({ id: item.id, loja_id: loja.id, nome: item.nome, tipo: item.tipo, etapa: item.etapa || null, responsavel_id: item.responsavelId || null, data_prevista: item.dataPrevista || null, status: item.status, observacao: item.observacao || null });
  if (error) throw new Error(error.message);
}

export async function excluirProcessoSecretaria(id: string) {
  await excluirRegistroDaLoja("processos_secretaria", id);
}

export async function salvarPecaArquitetura(item: PecaBanco) {
  const loja = await obterLojaAtual();
  const { error } = await createClient().from("pecas_arquitetura").upsert({ id: item.id, loja_id: loja.id, titulo: item.titulo, obreiro_id: item.obreiroId || null, grau: item.grau || null, data_prevista: item.dataPrevista || null, status: item.status, observacao: item.observacao || null });
  if (error) throw new Error(error.message);
}

export async function excluirPecaArquitetura(id: string) {
  await excluirRegistroDaLoja("pecas_arquitetura", id);
}

export async function salvarDocumentoComDecisoes(documento: DocumentoBanco, decisoes: DecisaoBanco[]) {
  const loja = await obterLojaAtual();
  const p_documento = { id: documento.id, loja_id: loja.id, sessao_id: documento.sessaoId, numero: documento.numero, tipo: documento.tipo, data: documento.data, titulo: documento.titulo, grau: documento.grau, status: documento.status, ordem_do_dia: documento.ordemDoDia, resumo: documento.resumo, deliberacoes: documento.deliberacoes, tronco: documento.tronco, observacoes: documento.observacoes, relato_bruto: documento.relatoBruto, decisoes_loja: documento.decisoesLoja, texto_gerado: documento.textoGerado };
  const p_decisoes = decisoes.map((item) => ({ id:item.id, sessao_id:item.sessaoId || null, data:item.data, texto:item.texto, status:item.status, origem:item.origem }));
  const { error } = await createClient().rpc("salvar_documento_com_decisoes", { p_documento, p_decisoes });
  if (error) throw new Error(error.message);
}

export async function removerDocumentoSecretaria(id: string) {
  const { error } = await createClient().rpc("remover_documento_secretaria", { p_documento: id });
  if (error) throw new Error(error.message);
}
