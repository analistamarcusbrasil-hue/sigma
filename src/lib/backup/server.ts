import "server-only";

import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "backups-sigma";
const VERSAO = "1.0";
const PAGINA = 1000;

export type BackupResumo = {
  id: string;
  lojaId: string;
  lojaNome: string;
  tipoBackup: "backup_loja" | "backup_pre_restauracao";
  escopo: string;
  versaoBackup: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  hashArquivo: string;
  status: "Criado" | "Em andamento" | "Concluído" | "Falhou" | "Restaurado" | "Excluído";
  criadoPor: string;
  criadoEm: string;
  restauradoEm: string;
  excluidoEm: string;
  observacao: string;
  erro: string;
  metadados: Record<string, unknown>;
};

export type BackupDetalhes = BackupResumo & {
  eventos: Array<{
    id: number;
    acao: string;
    resultado: string;
    usuario: string;
    justificativa: string;
    erro: string;
    criadoEm: string;
  }>;
};

type Contexto = {
  usuarioId: string;
  usuarioNome: string;
  perfil: "Administrador" | "Venerável Mestre";
  lojaId: string;
  lojaNome: string;
};

type AuditoriaContexto = {
  ip?: string;
  userAgent?: string;
  justificativa?: string;
};

const TABELAS_DIRETAS = [
  "obreiros",
  "sessoes",
  "administracoes",
  "agenda_eventos",
  "regras_mensalidade",
  "recebimentos",
  "mensalidades",
  "lancamentos_financeiros",
  "custos_loja",
  "tronco_solidariedade",
  "contas_financeiras",
  "categorias_financeiras",
  "centros_custo",
  "fechamentos_mensais",
  "prestacoes_finais",
  "repasses_gestao",
  "comunicados_internos",
  "solicitacoes_obreiro",
  "solicitacoes_tramitacoes",
  "solicitacoes_sessoes",
  "solicitacoes_anexos",
  "isencoes_mensalidades",
  "documentos_gestao",
  "documentos_secretaria",
  "patrimonios",
  "acoes_secretaria",
  "processos_secretaria",
  "pecas_arquitetura",
  "decisoes_loja",
] as const;

function erroAmigavel(erro: unknown, fallback: string) {
  if (erro instanceof Error && erro.message) return erro.message;
  return fallback;
}

function nomeSeguro(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "Loja";
}

function nomeArquivo(lojaNome: string, data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(data);
  const obter = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? "00";
  return `sigma_backup_${nomeSeguro(lojaNome)}_${obter("year")}-${obter("month")}-${obter("day")}_${obter("hour")}-${obter("minute")}.json`;
}

function normalizarEstavel(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(normalizarEstavel);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([chave, item]) => [chave, normalizarEstavel(item)]),
    );
  }
  return valor;
}

function stringifyEstavel(valor: unknown) {
  return JSON.stringify(normalizarEstavel(valor));
}

function hashConteudo(conteudo: string) {
  return createHash("sha256").update(conteudo, "utf8").digest("hex");
}

async function selecionarTodos(tabela: string, coluna: string, valor: string) {
  const admin = createAdminClient();
  const registros: Record<string, unknown>[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await admin.from(tabela).select("*").eq(coluna, valor).range(inicio, inicio + PAGINA - 1);
    if (error) throw new Error(`Falha ao proteger ${tabela}: ${error.message}`);
    registros.push(...((data ?? []) as Record<string, unknown>[]));
    if ((data ?? []).length < PAGINA) break;
  }
  return registros;
}

async function selecionarPorIds(tabela: string, coluna: string, ids: string[]) {
  if (!ids.length) return [] as Record<string, unknown>[];
  const admin = createAdminClient();
  const registros: Record<string, unknown>[] = [];
  for (let inicio = 0; inicio < ids.length; inicio += 100) {
    const bloco = ids.slice(inicio, inicio + 100);
    const { data, error } = await admin.from(tabela).select("*").in(coluna, bloco);
    if (error) throw new Error(`Falha ao proteger ${tabela}: ${error.message}`);
    registros.push(...((data ?? []) as Record<string, unknown>[]));
  }
  return registros;
}

async function autorizar(lojaId: string, auditoria?: AuditoriaContexto): Promise<Contexto> {
  if (!/^[0-9a-f-]{36}$/i.test(lojaId)) throw new Error("Selecione uma Loja válida.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id,nome,perfil,status")
    .eq("id", user.id)
    .maybeSingle();

  const admin = createAdminClient();
  const { data: loja } = await admin.from("lojas").select("id,nome").eq("id", lojaId).maybeSingle();
  if (!loja) throw new Error("A Loja selecionada não foi encontrada.");

  const administrador = perfil?.status === "ativo" && perfil.perfil === "Administrador";
  let veneravel = false;
  if (!administrador && perfil?.status === "ativo") {
    const { data: vinculo } = await supabase
      .from("loja_usuarios")
      .select("perfil,status")
      .eq("usuario_id", user.id)
      .eq("loja_id", lojaId)
      .eq("status", "ativo")
      .maybeSingle();
    veneravel = vinculo?.perfil === "Venerável Mestre";
  }

  if (!administrador && !veneravel) {
    await admin.from("backups_eventos").insert({
      loja_id: lojaId,
      usuario_id: user.id,
      acao: "acesso_negado",
      resultado: "Bloqueado",
      ip: auditoria?.ip ?? null,
      user_agent: auditoria?.userAgent ?? null,
      erro: "Perfil sem permissão para gerenciar Backup.",
    });
    throw new Error("Somente Administrador ou Venerável Mestre da Loja pode acessar backups.");
  }

  return {
    usuarioId: user.id,
    usuarioNome: perfil?.nome ?? user.email ?? "Usuário",
    perfil: administrador ? "Administrador" : "Venerável Mestre",
    lojaId,
    lojaNome: loja.nome,
  };
}

async function registrarEvento(
  contexto: Contexto,
  backupId: string | null,
  acao: string,
  resultado: "Sucesso" | "Falha" | "Bloqueado" | "Simulado",
  auditoria: AuditoriaContexto = {},
  erro?: string,
  metadados: Record<string, unknown> = {},
) {
  await createAdminClient().from("backups_eventos").insert({
    backup_id: backupId,
    loja_id: contexto.lojaId,
    usuario_id: contexto.usuarioId,
    acao,
    resultado,
    justificativa: auditoria.justificativa?.trim() || null,
    ip: auditoria.ip ?? null,
    user_agent: auditoria.userAgent ?? null,
    erro: erro ?? null,
    metadados,
  });
}

async function montarConteudo(contexto: Contexto, tipoBackup: "backup_loja" | "backup_pre_restauracao") {
  const admin = createAdminClient();
  const { data: loja, error: lojaErro } = await admin.from("lojas").select("*").eq("id", contexto.lojaId).single();
  if (lojaErro) throw new Error("Não foi possível consultar os dados da Loja.");

  const pares = await Promise.all(
    TABELAS_DIRETAS.map(async (tabela) => [tabela, await selecionarTodos(tabela, "loja_id", contexto.lojaId)] as const),
  );
  const dados = Object.fromEntries(pares) as Record<string, Record<string, unknown>[]>;
  dados.loja = [loja as Record<string, unknown>];

  const administracaoIds = dados.administracoes.map((item) => String(item.id));
  const sessaoIds = dados.sessoes.map((item) => String(item.id));
  const comunicadoIds = dados.comunicados_internos.map((item) => String(item.id));
  const documentoIds = dados.documentos_gestao.map((item) => String(item.id));

  dados.administracao_cargos = await selecionarPorIds("administracao_cargos", "administracao_id", administracaoIds);
  dados.presencas = await selecionarPorIds("presencas", "sessao_id", sessaoIds);
  dados.comunicados_leituras = await selecionarPorIds("comunicados_leituras", "comunicado_id", comunicadoIds);
  dados.documento_vinculos = await selecionarPorIds("documento_vinculos", "documento_id", documentoIds);

  const contagens = Object.fromEntries(Object.entries(dados).map(([chave, itens]) => [chave, itens.length]));
  return {
    tipo: tipoBackup,
    versao_backup: VERSAO,
    gerado_em: new Date().toISOString(),
    gerado_por: contexto.usuarioId,
    loja_id: contexto.lojaId,
    loja_nome: contexto.lojaNome,
    sistema: "SIGMA 2.0",
    dados_excluidos: ["auth.users", "profiles", "loja_usuarios", "senhas", "tokens", "segredos", "notificacoes_email", "auditoria_eventos", "eventos_seguranca"],
    dados,
    metadados: { contagens, total_registros: Object.values(contagens).reduce((total, valor) => total + Number(valor), 0) },
  };
}

async function carregarConteudo(row: Record<string, unknown>) {
  const admin = createAdminClient();
  let objeto: unknown = row.conteudo;
  if (row.caminho_storage) {
    const { data, error } = await admin.storage.from(BUCKET).download(String(row.caminho_storage));
    if (!error && data) {
      const texto = await data.text();
      try {
        objeto = JSON.parse(texto);
      } catch {
        throw new Error("O arquivo armazenado não contém JSON válido.");
      }
    } else if (!objeto) {
      throw new Error("Arquivo privado indisponível e cópia de contingência ausente.");
    }
  }
  if (!objeto || typeof objeto !== "object") throw new Error("Conteúdo do backup indisponível.");
  const texto = stringifyEstavel(objeto);
  const hash = hashConteudo(texto);
  if (!row.hash_arquivo || hash !== row.hash_arquivo) throw new Error("A verificação de integridade do backup falhou.");
  return { objeto: objeto as Record<string, unknown>, texto, hash };
}

async function buscarBackupAutorizado(id: string, lojaId: string, auditoria?: AuditoriaContexto) {
  const contexto = await autorizar(lojaId, auditoria);
  const { data, error } = await createAdminClient()
    .from("backups_sistema")
    .select("*")
    .eq("id", id)
    .eq("loja_id", contexto.lojaId)
    .maybeSingle();
  if (error || !data) throw new Error("Backup não encontrado nesta Loja.");
  return { contexto, row: data as Record<string, unknown> };
}

function resumo(row: Record<string, unknown>, lojaNome: string, autores: Map<string, string>): BackupResumo {
  return {
    id: String(row.id),
    lojaId: String(row.loja_id),
    lojaNome,
    tipoBackup: row.tipo_backup as BackupResumo["tipoBackup"],
    escopo: String(row.escopo ?? "Loja ativa"),
    versaoBackup: String(row.versao_backup ?? ""),
    nomeArquivo: String(row.nome_arquivo ?? ""),
    tamanhoBytes: Number(row.tamanho_bytes ?? 0),
    hashArquivo: String(row.hash_arquivo ?? ""),
    status: row.status as BackupResumo["status"],
    criadoPor: autores.get(String(row.criado_por)) ?? "Usuário removido",
    criadoEm: String(row.criado_em ?? ""),
    restauradoEm: String(row.restaurado_em ?? ""),
    excluidoEm: String(row.excluido_em ?? ""),
    observacao: String(row.observacao ?? ""),
    erro: String(row.erro ?? ""),
    metadados: (row.metadados ?? {}) as Record<string, unknown>,
  };
}

export async function listarBackups(lojaId: string, auditoria?: AuditoriaContexto) {
  const contexto = await autorizar(lojaId, auditoria);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("backups_sistema")
    .select("id,loja_id,tipo_backup,escopo,versao_backup,nome_arquivo,tamanho_bytes,hash_arquivo,status,criado_por,criado_em,restaurado_em,excluido_em,observacao,erro,metadados")
    .eq("loja_id", contexto.lojaId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error("Não foi possível carregar o histórico de backups.");
  const ids = [...new Set((data ?? []).map((item) => item.criado_por).filter(Boolean))] as string[];
  const autores = new Map<string, string>();
  if (ids.length) {
    const { data: perfis } = await admin.from("profiles").select("id,nome").in("id", ids);
    for (const perfil of perfis ?? []) autores.set(perfil.id, perfil.nome);
  }
  return (data ?? []).map((item) => resumo(item as Record<string, unknown>, contexto.lojaNome, autores));
}

export async function criarBackup(
  lojaId: string,
  observacao: string,
  auditoria: AuditoriaContexto = {},
  tipoBackup: "backup_loja" | "backup_pre_restauracao" = "backup_loja",
  backupOrigemId?: string,
) {
  const contexto = await autorizar(lojaId, auditoria);
  const admin = createAdminClient();
  const arquivo = nomeArquivo(contexto.lojaNome);
  const { data: criado, error: criarErro } = await admin.from("backups_sistema").insert({
    loja_id: contexto.lojaId,
    tipo_backup: tipoBackup,
    escopo: "Loja ativa",
    versao_backup: VERSAO,
    nome_arquivo: arquivo,
    status: "Em andamento",
    criado_por: contexto.usuarioId,
    observacao: observacao.trim() || null,
    backup_origem_id: backupOrigemId ?? null,
    metadados: { armazenamento: "preparando" },
  }).select("id").single();
  if (criarErro || !criado) throw new Error("Não foi possível iniciar o backup.");
  const backupId = criado.id;
  await registrarEvento(contexto, backupId, "backup_iniciado", "Sucesso", auditoria);

  try {
    const objeto = await montarConteudo(contexto, tipoBackup);
    const texto = stringifyEstavel(objeto);
    const bytes = Buffer.byteLength(texto, "utf8");
    const hash = hashConteudo(texto);
    const caminho = `${contexto.lojaId}/${backupId}/${arquivo}`;
    const { error: storageErro } = await admin.storage.from(BUCKET).upload(caminho, Buffer.from(texto, "utf8"), {
      contentType: "application/json",
      upsert: false,
    });
    const armazenamento = storageErro ? "jsonb_fallback" : "storage_privado";
    const aviso = storageErro ? "O Storage privado está indisponível; a cópia segura foi mantida no banco." : "";

    const { error: atualizarErro } = await admin.from("backups_sistema").update({
      caminho_storage: storageErro ? null : caminho,
      tamanho_bytes: bytes,
      hash_arquivo: hash,
      status: "Concluído",
      erro: storageErro ? aviso : null,
      conteudo: objeto,
      metadados: { ...(objeto.metadados as object), armazenamento, aviso },
      atualizado_em: new Date().toISOString(),
    }).eq("id", backupId);
    if (atualizarErro) throw new Error(atualizarErro.message);
    await registrarEvento(contexto, backupId, "backup_concluido", "Sucesso", auditoria, undefined, { armazenamento, bytes });
    return { id: backupId, aviso };
  } catch (erro) {
    const mensagem = erroAmigavel(erro, "Falha inesperada ao gerar o backup.");
    await admin.from("backups_sistema").update({ status: "Falhou", erro: mensagem, atualizado_em: new Date().toISOString() }).eq("id", backupId);
    await registrarEvento(contexto, backupId, "backup_falhou", "Falha", auditoria, mensagem);
    throw new Error(mensagem);
  }
}

export async function obterDetalhesBackup(id: string, lojaId: string, auditoria?: AuditoriaContexto): Promise<BackupDetalhes> {
  const { contexto, row } = await buscarBackupAutorizado(id, lojaId, auditoria);
  const admin = createAdminClient();
  const autorIds = [row.criado_por, row.restaurado_por, row.excluido_por].filter(Boolean).map(String);
  const { data: eventos } = await admin.from("backups_eventos").select("*").eq("backup_id", id).order("criado_em", { ascending: false });
  const eventoUsuarios = (eventos ?? []).map((evento) => evento.usuario_id).filter(Boolean);
  const ids = [...new Set([...autorIds, ...eventoUsuarios])];
  const autores = new Map<string, string>();
  if (ids.length) {
    const { data: perfis } = await admin.from("profiles").select("id,nome").in("id", ids);
    for (const perfil of perfis ?? []) autores.set(perfil.id, perfil.nome);
  }
  return {
    ...resumo(row, contexto.lojaNome, autores),
    eventos: (eventos ?? []).map((evento) => ({
      id: Number(evento.id),
      acao: evento.acao,
      resultado: evento.resultado,
      usuario: autores.get(evento.usuario_id) ?? "Usuário removido",
      justificativa: evento.justificativa ?? "",
      erro: evento.erro ?? "",
      criadoEm: evento.criado_em,
    })),
  };
}

export async function excluirBackup(
  id: string,
  lojaId: string,
  confirmacao: string,
  auditoria: AuditoriaContexto = {},
) {
  if (confirmacao.trim().toUpperCase() !== "APAGAR") throw new Error("Digite APAGAR para confirmar a exclusão.");
  const { contexto, row } = await buscarBackupAutorizado(id, lojaId, auditoria);
  if (row.status === "Excluído") throw new Error("Este backup já foi excluído.");
  const admin = createAdminClient();
  if (row.caminho_storage) await admin.storage.from(BUCKET).remove([String(row.caminho_storage)]);
  const { error } = await admin.from("backups_sistema").update({
    status: "Excluído",
    excluido_por: contexto.usuarioId,
    excluido_em: new Date().toISOString(),
    caminho_storage: null,
    conteudo: null,
    atualizado_em: new Date().toISOString(),
  }).eq("id", id).eq("loja_id", contexto.lojaId);
  if (error) throw new Error("Não foi possível apagar o backup.");
  await registrarEvento(contexto, id, "backup_excluido", "Sucesso", auditoria);
}

export async function previsualizarRestauracao(
  id: string,
  lojaId: string,
  confirmacao: string,
  justificativa: string,
  auditoria: AuditoriaContexto = {},
) {
  if (confirmacao.trim().toUpperCase() !== "RESTAURAR") throw new Error("Digite RESTAURAR para confirmar.");
  if (justificativa.trim().length < 10) throw new Error("Informe uma justificativa com pelo menos 10 caracteres.");
  const contextoAuditoria = { ...auditoria, justificativa };
  const { contexto, row } = await buscarBackupAutorizado(id, lojaId, contextoAuditoria);
  if (row.status !== "Concluído" && row.status !== "Restaurado") throw new Error("Somente backups concluídos podem ser validados para restauração.");
  await registrarEvento(contexto, id, "restauracao_iniciada", "Simulado", contextoAuditoria);

  try {
    const { objeto } = await carregarConteudo(row);
    if (objeto.versao_backup !== VERSAO) throw new Error("Versão de backup incompatível com esta versão do SIGMA.");
    if (objeto.loja_id !== contexto.lojaId) throw new Error("Este backup pertence a outra Loja e não pode ser restaurado aqui.");
    if (!objeto.dados || typeof objeto.dados !== "object") throw new Error("Estrutura de dados do backup inválida.");
    for (const [modulo, registros] of Object.entries(objeto.dados as Record<string, unknown>)) {
      if (!Array.isArray(registros)) throw new Error(`O módulo ${modulo} não possui uma lista válida.`);
    }

    const seguranca = await criarBackup(
      contexto.lojaId,
      `Backup automático antes da pré-visualização de restauração do backup ${id}.`,
      contextoAuditoria,
      "backup_pre_restauracao",
      id,
    );
    const contagens = Object.fromEntries(
      Object.entries(objeto.dados as Record<string, unknown[]>).map(([modulo, registros]) => [modulo, registros.length]),
    );
    await registrarEvento(contexto, id, "restauracao_previsualizada", "Simulado", contextoAuditoria, undefined, {
      backup_pre_restauracao_id: seguranca.id,
      contagens,
    });
    return { backupSegurancaId: seguranca.id, contagens };
  } catch (erro) {
    const mensagem = erroAmigavel(erro, "Não foi possível validar a restauração.");
    await registrarEvento(contexto, id, "restauracao_falhou", "Falha", contextoAuditoria, mensagem);
    throw new Error(mensagem);
  }
}

export async function obterBackupParaDownload(
  id: string,
  lojaId: string,
  auditoria: AuditoriaContexto = {},
) {
  const { contexto, row } = await buscarBackupAutorizado(id, lojaId, auditoria);
  if (row.status === "Excluído") throw new Error("Este backup foi excluído.");
  if (row.status !== "Concluído" && row.status !== "Restaurado") throw new Error("O backup ainda não está disponível para download.");
  const { texto } = await carregarConteudo(row);
  await registrarEvento(contexto, id, "backup_baixado", "Sucesso", auditoria);
  return { texto, nomeArquivo: String(row.nome_arquivo) };
}
