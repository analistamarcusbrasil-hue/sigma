"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  criarBackupAction,
  detalhesBackupAction,
  excluirBackupAction,
  listarBackupsAction,
  previsualizarRestauracaoAction,
} from "@/app/backup/actions";
import { Feedback, LoadingState } from "@/components/ui/Feedback";
import { lojaAtivaId } from "@/lib/loja-ativa";

type BackupResumo = {
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

type BackupDetalhes = BackupResumo & {
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

type Modal = "novo" | "detalhes" | "restaurar" | "apagar" | null;

const nomesModulos: Record<string, string> = {
  loja: "Loja",
  obreiros: "Obreiros",
  sessoes: "Sessões",
  presencas: "Presenças",
  administracoes: "Gestões",
  administracao_cargos: "Cargos da gestão",
  agenda_eventos: "Agenda",
  regras_mensalidade: "Regras de mensalidade",
  mensalidades: "Mensalidades",
  recebimentos: "Recebimentos",
  lancamentos_financeiros: "Livro Caixa",
  custos_loja: "Custos fixos",
  tronco_solidariedade: "Tronco de Solidariedade",
  comunicados_internos: "Comunicados",
  solicitacoes_obreiro: "Solicitações",
  documentos_gestao: "Documentos",
  documentos_secretaria: "Secretaria / Atas",
  patrimonios: "Patrimônio",
};

function formatarData(valor: string) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(valor));
}

function formatarTamanho(bytes: number) {
  if (!bytes) return "0 B";
  const unidades = ["B", "KB", "MB", "GB"];
  const indice = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
  return `${(bytes / 1024 ** indice).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unidades[indice]}`;
}

function classeStatus(status: BackupResumo["status"]) {
  if (status === "Concluído" || status === "Restaurado") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (status === "Falhou") return "border-red-400/30 bg-red-400/10 text-red-200";
  if (status === "Excluído") return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  return "border-amber-400/30 bg-amber-400/10 text-amber-200";
}

function nomeEvento(acao: string) {
  return acao.replaceAll("_", " ").replace(/^./, (letra) => letra.toUpperCase());
}

export function BackupDadosClient() {
  const [lojaId, setLojaId] = useState("");
  const [backups, setBackups] = useState<BackupResumo[]>([]);
  const [selecionado, setSelecionado] = useState<BackupResumo | null>(null);
  const [detalhes, setDetalhes] = useState<BackupDetalhes | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [aviso, setAviso] = useState("");
  const [observacao, setObservacao] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [preview, setPreview] = useState<{ backupSegurancaId: string; contagens: Record<string, number> } | null>(null);

  const carregar = useCallback(async (id: string, silencioso = false) => {
    if (!silencioso) setCarregando(true);
    setErro("");
    const resultado = await listarBackupsAction(id);
    if (resultado.ok) setBackups(resultado.data);
    else setErro(resultado.erro);
    setCarregando(false);
  }, []);

  useEffect(() => {
    const ativa = lojaAtivaId();
    setLojaId(ativa);
    if (!ativa) {
      setErro("Selecione uma Loja ativa no menu lateral.");
      setCarregando(false);
      return;
    }
    void carregar(ativa);
  }, [carregar]);

  const concluidos = backups.filter((item) => item.status === "Concluído" || item.status === "Restaurado");
  const falhas = backups.filter((item) => item.status === "Falhou");
  const ultimo = concluidos[0];
  const espaco = backups.filter((item) => item.status !== "Excluído").reduce((total, item) => total + item.tamanhoBytes, 0);

  const contagensDetalhes = useMemo(() => {
    const valor = detalhes?.metadados?.contagens;
    return valor && typeof valor === "object" ? Object.entries(valor as Record<string, number>) : [];
  }, [detalhes]);

  function limparMensagens() {
    setErro("");
    setSucesso("");
    setAviso("");
  }

  function fecharModal() {
    setModal(null);
    setSelecionado(null);
    setDetalhes(null);
    setObservacao("");
    setConfirmado(false);
    setConfirmacao("");
    setJustificativa("");
    setPreview(null);
  }

  async function criar() {
    limparMensagens();
    setProcessando(true);
    const resultado = await criarBackupAction({ lojaId, observacao, confirmado });
    setProcessando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setSucesso(resultado.mensagem ?? "Backup criado com sucesso.");
    setAviso(resultado.aviso ?? "");
    fecharModal();
    await carregar(lojaId, true);
  }

  async function abrirDetalhes(item: BackupResumo) {
    limparMensagens();
    setSelecionado(item);
    setDetalhes(null);
    setModal("detalhes");
    const resultado = await detalhesBackupAction({ id: item.id, lojaId });
    if (resultado.ok) setDetalhes(resultado.data);
    else setErro(resultado.erro);
  }

  function abrirRestauracao(item: BackupResumo) {
    limparMensagens();
    setSelecionado(item);
    setConfirmacao("");
    setJustificativa("");
    setPreview(null);
    setModal("restaurar");
  }

  async function restaurar() {
    if (!selecionado) return;
    limparMensagens();
    setProcessando(true);
    const resultado = await previsualizarRestauracaoAction({
      id: selecionado.id,
      lojaId,
      confirmacao,
      justificativa,
    });
    setProcessando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setPreview(resultado.data);
    setSucesso(resultado.mensagem ?? "Pré-visualização concluída.");
    await carregar(lojaId, true);
  }

  function abrirExclusao(item: BackupResumo) {
    limparMensagens();
    setSelecionado(item);
    setConfirmacao("");
    setModal("apagar");
  }

  async function apagar() {
    if (!selecionado) return;
    limparMensagens();
    setProcessando(true);
    const resultado = await excluirBackupAction({ id: selecionado.id, lojaId, confirmacao });
    setProcessando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setSucesso(resultado.mensagem ?? "Backup apagado.");
    fecharModal();
    await carregar(lojaId, true);
  }

  const podeUsar = (item: BackupResumo) => item.status === "Concluído" || item.status === "Restaurado";

  return (
    <div className="mt-8 space-y-6">
      {erro && <Feedback tone="error">{erro}</Feedback>}
      {sucesso && <Feedback tone="success">{sucesso}</Feedback>}
      {aviso && <Feedback tone="warning">{aviso}</Feedback>}

      <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/15 via-white/[0.04] to-sky-400/5 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-amber-300">Proteção por Loja</p>
            <h2 className="mt-2 text-2xl font-black text-white">Versões de segurança privadas e auditáveis</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
              O arquivo contém somente dados da Loja ativa. Senhas, usuários, perfis, tokens, chaves e variáveis de ambiente nunca entram no backup.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => { limparMensagens(); setModal("novo"); }} disabled={!lojaId} className="rounded-full bg-amber-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300 disabled:opacity-40">
              + Novo backup
            </button>
            <button type="button" onClick={() => void carregar(lojaId)} disabled={!lojaId || carregando} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
              Atualizar lista
            </button>
            {ultimo && (
              <a href={`/api/backups/${ultimo.id}/download?lojaId=${encodeURIComponent(lojaId)}`} className="rounded-full border border-emerald-400/30 px-5 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10">
                Baixar último
              </a>
            )}
            <a href="https://github.com/analistamarcusbrasil-hue/sigma/blob/main/docs/BACKUP_SIGMA.md" target="_blank" rel="noreferrer" className="rounded-full border border-sky-400/30 px-5 py-3 text-sm font-semibold text-sky-200 hover:bg-sky-400/10">
              Documentação
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Último backup", ultimo ? formatarData(ultimo.criadoEm) : "Nenhum", "text-white"],
          ["Total de versões", String(backups.length), "text-amber-300"],
          ["Concluídos", String(concluidos.length), "text-emerald-300"],
          ["Com falha", String(falhas.length), "text-red-300"],
          ["Espaço utilizado", formatarTamanho(espaco), "text-sky-300"],
        ].map(([titulo, valor, cor]) => (
          <article key={titulo} className="sigma-surface rounded-2xl p-5">
            <p className="text-sm text-zinc-400">{titulo}</p>
            <p className={`mt-3 text-2xl font-black ${cor}`}>{valor}</p>
          </article>
        ))}
      </section>

      <section className="sigma-surface overflow-hidden rounded-3xl">
        <div className="border-b border-white/10 px-6 py-5">
          <h3 className="text-xl font-bold">Histórico de backups</h3>
          <p className="mt-1 text-sm text-zinc-400">Versões, responsáveis, integridade e ações da Loja ativa.</p>
        </div>
        {carregando ? (
          <div className="p-6"><LoadingState label="Carregando versões de backup…" /></div>
        ) : backups.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-lg font-semibold">Nenhum backup criado</p>
            <p className="mt-2 text-sm text-zinc-400">Crie a primeira versão de segurança da Loja ativa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <thead className="bg-white/[0.04] text-zinc-400">
                <tr>
                  {["Data/hora", "Tipo", "Escopo / Loja", "Criado por", "Tamanho", "Status", "Observação", "Ações"].map((item) => <th key={item} className="px-5 py-4 font-semibold">{item}</th>)}
                </tr>
              </thead>
              <tbody>
                {backups.map((item) => (
                  <tr key={item.id} className="border-t border-white/10 align-top">
                    <td className="whitespace-nowrap px-5 py-4 text-zinc-300">{formatarData(item.criadoEm)}</td>
                    <td className="px-5 py-4"><span className="font-semibold text-white">{item.tipoBackup === "backup_pre_restauracao" ? "Pré-restauração" : "Manual"}</span><span className="mt-1 block text-xs text-zinc-500">v{item.versaoBackup}</span></td>
                    <td className="px-5 py-4"><span className="text-white">{item.escopo}</span><span className="mt-1 block text-xs text-zinc-500">{item.lojaNome}</span></td>
                    <td className="px-5 py-4 text-zinc-300">{item.criadoPor}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-zinc-300">{formatarTamanho(item.tamanhoBytes)}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classeStatus(item.status)}`}>{item.status}</span></td>
                    <td className="max-w-64 px-5 py-4 text-zinc-400">{item.observacao || item.erro || "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void abrirDetalhes(item)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5">Detalhes</button>
                        {podeUsar(item) && <a href={`/api/backups/${item.id}/download?lojaId=${encodeURIComponent(lojaId)}`} className="rounded-full border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/10">Baixar</a>}
                        {podeUsar(item) && <button type="button" onClick={() => abrirRestauracao(item)} className="rounded-full border border-sky-400/30 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-400/10">Restaurar</button>}
                        {item.status !== "Excluído" && item.status !== "Em andamento" && <button type="button" onClick={() => abrirExclusao(item)} className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-400/10">Apagar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-sky-400/20 bg-sky-400/[0.07] p-6">
        <h3 className="text-lg font-bold text-sky-100">Restauração protegida</h3>
        <p className="mt-2 text-sm leading-6 text-sky-100/75">
          Nesta fase, o SIGMA valida integralmente o arquivo, confirma versão, hash e Loja, cria um backup automático do estado atual e apresenta a pré-visualização. Nenhum dado atual é apagado ou substituído automaticamente.
        </p>
      </section>

      {modal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="backup-modal-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/15 bg-[#0b1728] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-300">Backup SIGMA</p>
                <h3 id="backup-modal-title" className="mt-2 text-2xl font-black">
                  {modal === "novo" ? "Criar novo backup" : modal === "detalhes" ? "Detalhes do backup" : modal === "restaurar" ? "Pré-visualizar restauração" : "Apagar backup"}
                </h3>
              </div>
              <button type="button" onClick={fecharModal} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-xl text-zinc-300 hover:bg-white/5">×</button>
            </div>

            {modal === "novo" && (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold">Tipo: Loja ativa</p>
                  <p className="mt-1 text-xs text-zinc-400">Backup global está documentado como evolução; esta versão impede mistura entre Lojas.</p>
                </div>
                <label className="block text-sm text-zinc-300">Observação opcional
                  <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-4 text-white outline-none focus:border-amber-400" placeholder="Motivo ou contexto desta versão" />
                </label>
                <label className="flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                  <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} className="mt-1 h-4 w-4 accent-amber-400" />
                  Confirmo que desejo gerar uma nova versão de backup dos dados atuais.
                </label>
                <button type="button" onClick={() => void criar()} disabled={processando || !confirmado} className="w-full rounded-xl bg-amber-400 px-5 py-3 font-bold text-black disabled:opacity-40">{processando ? "Gerando backup seguro…" : "Gerar backup agora"}</button>
              </div>
            )}

            {modal === "detalhes" && (
              <div className="mt-6">
                {!detalhes ? <LoadingState label="Carregando detalhes e auditoria…" /> : (
                  <div className="space-y-6">
                    <dl className="grid gap-3 sm:grid-cols-2">
                      {[
                        ["ID", detalhes.id],
                        ["Arquivo", detalhes.nomeArquivo],
                        ["Data", formatarData(detalhes.criadoEm)],
                        ["Loja", detalhes.lojaNome],
                        ["Criado por", detalhes.criadoPor],
                        ["Status", detalhes.status],
                        ["Tamanho", formatarTamanho(detalhes.tamanhoBytes)],
                        ["Hash SHA-256", detalhes.hashArquivo || "—"],
                        ["Observação", detalhes.observacao || "—"],
                        ["Armazenamento", String(detalhes.metadados.armazenamento ?? "—")],
                      ].map(([termo, valor]) => <div key={termo} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><dt className="text-xs uppercase tracking-wider text-zinc-500">{termo}</dt><dd className="mt-1 break-all text-sm text-white">{valor}</dd></div>)}
                    </dl>
                    <div>
                      <h4 className="font-bold">Registros por módulo</h4>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {contagensDetalhes.map(([modulo, total]) => <div key={modulo} className="flex justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"><span className="text-zinc-400">{nomesModulos[modulo] ?? modulo.replaceAll("_", " ")}</span><b>{Number(total)}</b></div>)}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold">Histórico de ações</h4>
                      <div className="mt-3 space-y-2">
                        {detalhes.eventos.map((evento) => <div key={evento.id} className="rounded-xl border border-white/10 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><b>{nomeEvento(evento.acao)}</b><span className="text-zinc-500">{formatarData(evento.criadoEm)}</span></div><p className="mt-1 text-zinc-400">{evento.usuario} · {evento.resultado}</p>{evento.justificativa && <p className="mt-1 text-zinc-300">{evento.justificativa}</p>}{evento.erro && <p className="mt-1 text-red-300">{evento.erro}</p>}</div>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {modal === "restaurar" && selecionado && (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
                  <b>Atenção:</b> restaurar um backup pode substituir dados atuais. O SIGMA criará primeiro um backup automático e, nesta fase, fará somente a pré-visualização segura, sem modificar registros.
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div><dt className="text-xs text-zinc-500">Backup</dt><dd className="mt-1 text-sm">{selecionado.nomeArquivo}</dd></div>
                  <div><dt className="text-xs text-zinc-500">Loja</dt><dd className="mt-1 text-sm">{selecionado.lojaNome}</dd></div>
                  <div><dt className="text-xs text-zinc-500">Data</dt><dd className="mt-1 text-sm">{formatarData(selecionado.criadoEm)}</dd></div>
                  <div><dt className="text-xs text-zinc-500">Criado por</dt><dd className="mt-1 text-sm">{selecionado.criadoPor}</dd></div>
                </dl>
                <label className="block text-sm text-zinc-300">Justificativa obrigatória
                  <textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} minLength={10} maxLength={1000} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-4 text-white outline-none focus:border-sky-400" placeholder="Explique por que deseja validar esta restauração" />
                </label>
                <label className="block text-sm text-zinc-300">Digite <b className="text-red-300">RESTAURAR</b>
                  <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-4 font-bold uppercase text-white outline-none focus:border-red-400" />
                </label>
                <button type="button" onClick={() => void restaurar()} disabled={processando || confirmacao.trim().toUpperCase() !== "RESTAURAR" || justificativa.trim().length < 10} className="w-full rounded-xl bg-sky-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">{processando ? "Criando backup pré-restauração e validando…" : "Criar backup e pré-visualizar"}</button>
                {preview && <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100"><b>Validação concluída.</b><p className="mt-1">Backup de segurança: {preview.backupSegurancaId}</p><p className="mt-1">{Object.values(preview.contagens).reduce((a, b) => a + b, 0)} registros seriam considerados. Nenhum dado atual foi alterado.</p></div>}
              </div>
            )}

            {modal === "apagar" && selecionado && (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
                  O arquivo e a cópia de dados serão removidos. O registro histórico permanecerá como <b>Excluído</b> para auditoria.
                </div>
                <p className="break-all text-sm text-zinc-300">{selecionado.nomeArquivo} · {formatarData(selecionado.criadoEm)}</p>
                <label className="block text-sm text-zinc-300">Digite <b className="text-red-300">APAGAR</b>
                  <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-4 font-bold uppercase text-white outline-none focus:border-red-400" />
                </label>
                <button type="button" onClick={() => void apagar()} disabled={processando || confirmacao.trim().toUpperCase() !== "APAGAR"} className="w-full rounded-xl bg-red-500 px-5 py-3 font-bold text-white disabled:opacity-40">{processando ? "Apagando com auditoria…" : "Apagar backup"}</button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
