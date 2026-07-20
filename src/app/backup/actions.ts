"use server";

import { headers } from "next/headers";
import {
  criarBackup,
  excluirBackup,
  listarBackups,
  obterDetalhesBackup,
  previsualizarRestauracao,
  type BackupDetalhes,
  type BackupResumo,
} from "@/lib/backup/server";

type Resultado<T> = { ok: true; data: T; mensagem?: string; aviso?: string } | { ok: false; erro: string };

async function contextoRequisicao(justificativa?: string) {
  const cabecalhos = await headers();
  return {
    ip: cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? cabecalhos.get("x-real-ip") ?? "",
    userAgent: cabecalhos.get("user-agent") ?? "",
    justificativa,
  };
}

function falha(erro: unknown, fallback: string): { ok: false; erro: string } {
  return { ok: false, erro: erro instanceof Error ? erro.message : fallback };
}

export async function listarBackupsAction(lojaId: string): Promise<Resultado<BackupResumo[]>> {
  try {
    return { ok: true, data: await listarBackups(lojaId, await contextoRequisicao()) };
  } catch (erro) {
    return falha(erro, "Não foi possível carregar os backups.");
  }
}

export async function criarBackupAction(input: {
  lojaId: string;
  observacao: string;
  confirmado: boolean;
}): Promise<Resultado<{ id: string }>> {
  if (!input.confirmado) return { ok: false, erro: "Confirme a criação da nova versão de backup." };
  try {
    const resultado = await criarBackup(input.lojaId, input.observacao, await contextoRequisicao());
    return {
      ok: true,
      data: { id: resultado.id },
      mensagem: "Backup criado com sucesso.",
      aviso: resultado.aviso || undefined,
    };
  } catch (erro) {
    return falha(erro, "Não foi possível criar o backup.");
  }
}

export async function detalhesBackupAction(input: {
  id: string;
  lojaId: string;
}): Promise<Resultado<BackupDetalhes>> {
  try {
    return { ok: true, data: await obterDetalhesBackup(input.id, input.lojaId, await contextoRequisicao()) };
  } catch (erro) {
    return falha(erro, "Não foi possível abrir os detalhes.");
  }
}

export async function excluirBackupAction(input: {
  id: string;
  lojaId: string;
  confirmacao: string;
}): Promise<Resultado<null>> {
  try {
    await excluirBackup(input.id, input.lojaId, input.confirmacao, await contextoRequisicao());
    return { ok: true, data: null, mensagem: "Backup apagado com segurança e histórico preservado." };
  } catch (erro) {
    return falha(erro, "Não foi possível apagar o backup.");
  }
}

export async function previsualizarRestauracaoAction(input: {
  id: string;
  lojaId: string;
  confirmacao: string;
  justificativa: string;
}): Promise<Resultado<{ backupSegurancaId: string; contagens: Record<string, number> }>> {
  try {
    const data = await previsualizarRestauracao(
      input.id,
      input.lojaId,
      input.confirmacao,
      input.justificativa,
      await contextoRequisicao(input.justificativa),
    );
    return {
      ok: true,
      data,
      mensagem: "Backup de segurança criado. Pré-visualização concluída sem alterar os dados atuais.",
    };
  } catch (erro) {
    return falha(erro, "Não foi possível pré-visualizar a restauração.");
  }
}
