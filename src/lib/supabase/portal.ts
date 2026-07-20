import { createClient } from "@/lib/supabase/client";
import { lojaAtivaId } from "@/lib/loja-ativa";

export type TramitacaoSolicitacao = {
  id: string;
  statusAnterior: string;
  statusNovo: string;
  etapa: string;
  mensagem: string;
  autorPerfil: string;
  arquivoUrl: string;
  criadoEm: string;
  tipoEvento: string;
  requerAcao: boolean;
  destinatarioPerfil: string;
};

export type AnexoSolicitacao = {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  categoria: string;
  autorPerfil: string;
  criadoEm: string;
  storagePath: string;
  url: string;
};

export type SessaoSolicitacao = {
  id: string;
  data: string;
  titulo: string;
  tipo: string;
  status: string;
};

export type SolicitacaoPortal = {
  id: string;
  lojaId: string;
  protocolo: string;
  tipo: string;
  titulo: string;
  descricao: string;
  status: string;
  resposta: string;
  criadoEm: string;
  obreiroId: string;
  obreiroNome: string;
  dados: Record<string, unknown>;
  areaDestino: string;
  responsavelPerfil: string;
  responsavelTecnicoPerfil: string;
  prioridade: string;
  prazoEm: string;
  etapaAtual: string;
  ultimoMovimentoEm: string;
  arquivoFinalUrl: string;
  concluidoEm: string;
  sessaoId: string;
  sessaoData: string;
  sessaoTitulo: string;
  sessaoTipo: string;
  frequenciaAjustadaEm: string;
  periodoInicio: string;
  periodoFim: string;
  parecerTecnico: string;
  parecerTecnicoEm: string;
  encaminhadaVeneravelEm: string;
  decisaoFinal: string;
  decisaoFinalEm: string;
  aguardandoDe: string;
  codigoComprovante: string;
  comprovanteEmitidoEm: string;
  perfilVisualizador: string;
  sessoes: SessaoSolicitacao[];
  anexos: AnexoSolicitacao[];
  tramitacoes: TramitacaoSolicitacao[];
};

export type ComunicadoPortal = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  prioridade: string;
  publicoAlvo: string;
  status: string;
  publicadoEm: string;
  expiraEm: string;
};

async function contextoBase(exigirPortal: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Entre novamente.");

  const preferida = lojaAtivaId();
  let q = supabase.from("loja_usuarios")
    .select("loja_id,perfil,obreiro_id,acesso_portal_obreiro,permissoes")
    .eq("usuario_id", user.id)
    .eq("status", "ativo");
  if (preferida) q = q.eq("loja_id", preferida);

  const { data: vinculo, error } = await q.limit(1).maybeSingle();
  if (error || !vinculo) throw new Error("Seu usuário ainda não está vinculado a uma Loja.");
  if (exigirPortal && !vinculo.acesso_portal_obreiro) throw new Error("O acesso ao Portal não está liberado para esta Loja.");
  if (exigirPortal && !vinculo.obreiro_id) throw new Error("Vincule um Obreiro antes de acessar o Portal.");

  return {
    supabase,
    user,
    perfil: vinculo.perfil,
    lojaId: vinculo.loja_id,
    obreiroId: vinculo.obreiro_id ?? "",
  };
}

const contextoPortal = () => contextoBase(true);
const contextoGestao = () => contextoBase(false);

function mapearSolicitacao(i: Record<string, unknown>): SolicitacaoPortal {
  const obreiro = i.obreiro_solicitante as { nome?: string } | null;
  const dados = (i.dados_json ?? {}) as unknown as Record<string, unknown>;

  const eventos = ((i.solicitacoes_tramitacoes ?? []) as unknown as Record<string, unknown>[])
    .map((t) => ({
      id: String(t.id ?? ""),
      statusAnterior: String(t.status_anterior ?? ""),
      statusNovo: String(t.status_novo ?? ""),
      etapa: String(t.etapa ?? ""),
      mensagem: String(t.mensagem ?? ""),
      autorPerfil: String(t.autor_perfil ?? "Sistema"),
      arquivoUrl: String(t.arquivo_url ?? ""),
      criadoEm: String(t.criado_em ?? ""),
      tipoEvento: String(t.tipo_evento ?? "Movimentação"),
      requerAcao: Boolean(t.requer_acao),
      destinatarioPerfil: String(t.destinatario_perfil ?? ""),
    }))
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));

  const sessoes = ((i.sessoes_vinculadas ?? []) as unknown as Record<string, unknown>[])
    .map((v) => {
      const s = v.sessao as unknown as Record<string, unknown> | null;
      return {
        id: String(v.sessao_id ?? ""),
        data: String(s?.data ?? ""),
        titulo: String(s?.titulo ?? ""),
        tipo: String(s?.tipo ?? ""),
        status: String(s?.status ?? ""),
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  const anexos = ((i.anexos_solicitacao ?? []) as unknown as Record<string, unknown>[])
    .map((a) => ({
      id: String(a.id ?? ""),
      nome: String(a.nome_arquivo ?? ""),
      tipo: String(a.tipo_mime ?? ""),
      tamanho: Number(a.tamanho_bytes ?? 0),
      categoria: String(a.categoria ?? ""),
      autorPerfil: String(a.autor_perfil ?? ""),
      criadoEm: String(a.criado_em ?? ""),
      storagePath: String(a.storage_path ?? ""),
      url: "",
    }))
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));

  const primeiraSessao = sessoes[0];
  return {
    id: String(i.id ?? ""),
    lojaId: String(i.loja_id ?? ""),
    protocolo: String(i.protocolo ?? ""),
    tipo: String(i.tipo ?? ""),
    titulo: String(i.titulo ?? ""),
    descricao: String(i.descricao ?? ""),
    status: String(i.status ?? "Pendente"),
    resposta: String(i.resposta ?? ""),
    criadoEm: String(i.criado_em ?? ""),
    obreiroId: String(i.obreiro_id ?? ""),
    obreiroNome: obreiro?.nome ?? "",
    dados,
    areaDestino: String(i.area_destino ?? "Administração"),
    responsavelPerfil: String(i.responsavel_perfil ?? "Venerável Mestre"),
    responsavelTecnicoPerfil: String(i.responsavel_tecnico_perfil ?? i.responsavel_perfil ?? "Venerável Mestre"),
    prioridade: String(i.prioridade ?? "Normal"),
    prazoEm: String(i.prazo_em ?? ""),
    etapaAtual: String(i.etapa_atual ?? "Recebida"),
    ultimoMovimentoEm: String(i.ultimo_movimento_em ?? i.criado_em ?? ""),
    arquivoFinalUrl: String(i.arquivo_final_url ?? ""),
    concluidoEm: String(i.concluido_em ?? ""),
    sessaoId: String(i.sessao_id ?? primeiraSessao?.id ?? dados.sessaoId ?? ""),
    sessaoData: String(primeiraSessao?.data ?? dados.sessaoData ?? ""),
    sessaoTitulo: String(primeiraSessao?.titulo ?? dados.sessaoTitulo ?? ""),
    sessaoTipo: String(primeiraSessao?.tipo ?? dados.sessaoTipo ?? ""),
    frequenciaAjustadaEm: String(i.frequencia_ajustada_em ?? ""),
    periodoInicio: String(i.periodo_inicio ?? ""),
    periodoFim: String(i.periodo_fim ?? ""),
    parecerTecnico: String(i.parecer_tecnico ?? ""),
    parecerTecnicoEm: String(i.parecer_tecnico_em ?? ""),
    encaminhadaVeneravelEm: String(i.encaminhada_veneravel_em ?? ""),
    decisaoFinal: String(i.decisao_final ?? ""),
    decisaoFinalEm: String(i.decisao_final_em ?? ""),
    aguardandoDe: String(i.aguardando_de ?? ""),
    codigoComprovante: String(i.codigo_comprovante ?? ""),
    comprovanteEmitidoEm: String(i.comprovante_emitido_em ?? ""),
    perfilVisualizador: "",
    sessoes,
    anexos,
    tramitacoes: eventos,
  };
}

const selecaoSolicitacao = [
  "*",
  "obreiro_solicitante:obreiros!solicitacoes_obreiro_obreiro_id_fkey(nome)",
  "solicitacoes_tramitacoes(*)",
  "sessoes_vinculadas:solicitacoes_sessoes!solicitacoes_sessoes_solicitacao_id_fkey(*,sessao:sessoes!solicitacoes_sessoes_sessao_id_fkey(data,tipo,titulo,status))",
  "anexos_solicitacao:solicitacoes_anexos!solicitacoes_anexos_solicitacao_id_fkey(*)",
].join(",");

async function assinarAnexos(
  supabase: ReturnType<typeof createClient>,
  solicitacoes: SolicitacaoPortal[],
) {
  await Promise.all(solicitacoes.flatMap((solicitacao) => solicitacao.anexos.map(async (anexo) => {
    const { data } = await supabase.storage
      .from("solicitacoes-anexos")
      .createSignedUrl(anexo.storagePath, 3600);
    anexo.url = data?.signedUrl ?? "";
  })));
  return solicitacoes;
}

export async function carregarPortal() {
  const c = await contextoPortal();
  if (!c.obreiroId) return {
    ...c,
    obreiro: null,
    presencas: [],
    mensalidades: [],
    recebimentos: [],
    agenda: [],
    documentos: [],
    comunicados: [],
    sessoesDisponiveis: [],
    solicitacoes: [] as SolicitacaoPortal[],
  };

  const hoje = new Date().toISOString().slice(0, 10);
  const inicio = new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().slice(0, 10);
  const [o, p, m, r, a, d, co, se, so] = await Promise.all([
    c.supabase.from("obreiros").select("*").eq("id", c.obreiroId).maybeSingle(),
    c.supabase.from("presencas").select("*,sessoes(data,tipo,titulo)").eq("obreiro_id", c.obreiroId),
    c.supabase.from("mensalidades").select("*").eq("obreiro_id", c.obreiroId).order("competencia", { ascending: false }),
    c.supabase.from("recebimentos").select("*").eq("obreiro_id", c.obreiroId).order("data", { ascending: false }),
    c.supabase.from("agenda_eventos").select("*").eq("loja_id", c.lojaId).order("inicio"),
    c.supabase.from("documentos_gestao").select("*").eq("loja_id", c.lojaId).order("data_documento", { ascending: false }),
    c.supabase.from("comunicados_internos").select("*").eq("loja_id", c.lojaId).eq("status", "Publicado").in("publico_alvo", ["Todos os obreiros", c.perfil]).or(`expira_em.is.null,expira_em.gte.${hoje}`).order("publicado_em", { ascending: false }),
    c.supabase.from("sessoes").select("id,data,tipo,titulo,status").eq("loja_id", c.lojaId).gte("data", inicio).lte("data", hoje).neq("status", "cancelada").order("data", { ascending: false }).limit(150),
    c.supabase.from("solicitacoes_obreiro").select(selecaoSolicitacao).or(`usuario_id.eq.${c.user.id},obreiro_id.eq.${c.obreiroId}`).order("criado_em", { ascending: false }),
  ]);

  for (const x of [o, p, m, r, a, d, co, se, so]) {
    if (x.error) throw new Error("Não foi possível carregar todas as informações do Portal.");
  }

  const solicitacoes = await assinarAnexos(
    c.supabase,
    (so.data ?? []).map((item) => mapearSolicitacao(item as unknown as Record<string, unknown>)),
  );

  return {
    ...c,
    obreiro: o.data,
    presencas: p.data ?? [],
    mensalidades: m.data ?? [],
    recebimentos: r.data ?? [],
    agenda: a.data ?? [],
    documentos: d.data ?? [],
    comunicados: co.data ?? [],
    sessoesDisponiveis: se.data ?? [],
    solicitacoes,
  };
}

export async function carregarComprovanteSolicitacao(id: string) {
  const c = await contextoPortal();
  const { data, error } = await c.supabase
    .from("solicitacoes_obreiro")
    .select(selecaoSolicitacao)
    .eq("id", id)
    .eq("usuario_id", c.user.id)
    .maybeSingle();
  if (error || !data) throw new Error("Comprovante não encontrado ou não pertence ao seu usuário.");
  const [solicitacao] = await assinarAnexos(c.supabase, [mapearSolicitacao(data as unknown as Record<string, unknown>)]);
  return { ...c, solicitacao };
}

export async function listarComunicados(): Promise<ComunicadoPortal[]> {
  const c = await contextoGestao();
  const { data, error } = await c.supabase.from("comunicados_internos").select("*").eq("loja_id", c.lojaId).order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((i) => ({
    id: i.id,
    titulo: i.titulo,
    mensagem: i.mensagem,
    tipo: i.tipo,
    prioridade: i.prioridade,
    publicoAlvo: i.publico_alvo,
    status: i.status,
    publicadoEm: i.publicado_em ?? "",
    expiraEm: i.expira_em ?? "",
  }));
}

export async function salvarComunicado(i: ComunicadoPortal) {
  const c = await contextoGestao();
  const p = {
    loja_id: c.lojaId,
    titulo: i.titulo.trim(),
    mensagem: i.mensagem.trim(),
    tipo: i.tipo,
    prioridade: i.prioridade,
    publico_alvo: i.publicoAlvo,
    status: i.status,
    publicado_em: i.status === "Publicado" ? (i.publicadoEm || new Date().toISOString()) : null,
    expira_em: i.expiraEm || null,
  };
  const q = i.id
    ? c.supabase.from("comunicados_internos").update(p).eq("id", i.id)
    : c.supabase.from("comunicados_internos").insert(p);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export async function listarSolicitacoesAdministrativas(): Promise<SolicitacaoPortal[]> {
  const c = await contextoGestao();
  const { data, error } = await c.supabase
    .from("solicitacoes_obreiro")
    .select(selecaoSolicitacao)
    .eq("loja_id", c.lojaId)
    .order("prazo_em", { ascending: true });
  if (error) throw new Error(error.message);
  const itens = (data ?? []).map((item) => ({
    ...mapearSolicitacao(item as unknown as Record<string, unknown>),
    perfilVisualizador: c.perfil,
  }));
  return assinarAnexos(c.supabase, itens);
}

export async function listarResumoSolicitacoesGestao(): Promise<SolicitacaoPortal[]> {
  return listarSolicitacoesAdministrativas();
}
