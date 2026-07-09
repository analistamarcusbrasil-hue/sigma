"use client";

import { useEffect, useMemo, useState } from "react";

type BackupSigma = {
  sistema: "SIGMA LUMP";
  versao: string;
  geradoEm: string;
  quantidadeChaves: number;
  dados: Record<string, string>;
};

const chavesSigma = [
  "sigma_obreiros",
  "sigma_presencas",
  "sigma_sessoes",
  "sigma_mensalidades",
  "sigma_recebimentos_tesouraria",
  "sigma_regras_mensalidade",
  "sigma_lancamentos_financeiros",
  "sigma_saldo_anterior",
  "sigma_documentos_secretaria",
  "sigma_acoes_secretaria",
  "sigma_processos_secretaria",
  "sigma_pecas_secretaria",
  "sigma_decisoes_loja",
  "sigma_custos_loja",
  "sigma_ano_trabalho",
  "sigma_data_inicio_gestao",
  "sigma_gestoes",
  "sigma_gestao_atual_id",
  "sigma_configuracao_gestao",
  "sigma_ultimo_backup_data",
];

function formatarDataHora(dataISO: string) {
  if (!dataISO) return "Nunca realizado";

  try {
    return new Date(dataISO).toLocaleString("pt-BR");
  } catch {
    return dataISO;
  }
}

function nomeArquivoBackup() {
  const agora = new Date();
  const data = agora.toISOString().slice(0, 10);
  const hora = agora.toTimeString().slice(0, 5).replace(":", "h");

  return `sigma-lump-backup-${data}-${hora}.json`;
}

function baixarArquivo(nome: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function BackupDadosClient() {
  const [ultimoBackup, setUltimoBackup] = useState("");
  const [backupSelecionado, setBackupSelecionado] = useState<BackupSigma | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [confirmacaoLimpeza, setConfirmacaoLimpeza] = useState("");
  const [totalDadosAtuais, setTotalDadosAtuais] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setUltimoBackup(localStorage.getItem("sigma_ultimo_backup_data") ?? "");
    setTotalDadosAtuais(
      chavesSigma.filter((chave) => localStorage.getItem(chave) !== null).length
    );
  }, []);

  const resumoBackupSelecionado = useMemo(() => {
    if (!backupSelecionado) return null;

    return {
      geradoEm: formatarDataHora(backupSelecionado.geradoEm),
      quantidadeChaves: Object.keys(backupSelecionado.dados ?? {}).length,
      versao: backupSelecionado.versao,
    };
  }, [backupSelecionado]);

  function gerarBackup() {
    if (typeof window === "undefined") return;

    const dados: Record<string, string> = {};

    chavesSigma.forEach((chave) => {
      const valor = localStorage.getItem(chave);

      if (valor !== null) {
        dados[chave] = valor;
      }
    });

    const agora = new Date().toISOString();

    const backup: BackupSigma = {
      sistema: "SIGMA LUMP",
      versao: "1.0",
      geradoEm: agora,
      quantidadeChaves: Object.keys(dados).length,
      dados,
    };

    baixarArquivo(nomeArquivoBackup(), JSON.stringify(backup, null, 2));

    localStorage.setItem("sigma_ultimo_backup_data", agora);
    setUltimoBackup(agora);
    setTotalDadosAtuais(
      chavesSigma.filter((chave) => localStorage.getItem(chave) !== null).length
    );
    setMensagem("Backup baixado com sucesso.");
  }

  function selecionarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];

    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = () => {
      try {
        const conteudo = String(leitor.result ?? "");
        const backup = JSON.parse(conteudo) as BackupSigma;

        if (backup.sistema !== "SIGMA LUMP" || !backup.dados) {
          setMensagem("Arquivo inválido. Selecione um backup gerado pelo SIGMA LUMP.");
          setBackupSelecionado(null);
          return;
        }

        setBackupSelecionado(backup);
        setMensagem("Backup carregado. Confira os dados antes de restaurar.");
      } catch {
        setMensagem("Não foi possível ler este arquivo. Verifique se é um JSON válido.");
        setBackupSelecionado(null);
      }
    };

    leitor.readAsText(arquivo);
  }

  function restaurarBackup() {
    if (typeof window === "undefined" || !backupSelecionado) return;

    const confirmar = window.confirm(
      "Tem certeza que deseja restaurar este backup? Os dados atuais do SIGMA serão substituídos."
    );

    if (!confirmar) return;

    chavesSigma.forEach((chave) => {
      if (chave !== "sigma_ultimo_backup_data") {
        localStorage.removeItem(chave);
      }
    });

    Object.entries(backupSelecionado.dados).forEach(([chave, valor]) => {
      if (chavesSigma.includes(chave)) {
        localStorage.setItem(chave, valor);
      }
    });

    const agora = new Date().toISOString();
    localStorage.setItem("sigma_ultimo_backup_data", agora);

    setUltimoBackup(agora);
    setTotalDadosAtuais(
      chavesSigma.filter((chave) => localStorage.getItem(chave) !== null).length
    );
    setMensagem("Backup restaurado com sucesso. Atualize a página para ver os dados carregados.");
  }

  function limparDados() {
    if (typeof window === "undefined") return;

    if (confirmacaoLimpeza !== "LIMPAR") {
      setMensagem('Para limpar os dados, digite exatamente "LIMPAR".');
      return;
    }

    const confirmar = window.confirm(
      "Atenção: isso vai apagar os dados do SIGMA neste navegador. Faça um backup antes. Deseja continuar?"
    );

    if (!confirmar) return;

    chavesSigma.forEach((chave) => {
      localStorage.removeItem(chave);
    });

    setBackupSelecionado(null);
    setUltimoBackup("");
    setTotalDadosAtuais(0);
    setConfirmacaoLimpeza("");
    setMensagem("Dados locais apagados com sucesso.");
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/15 to-white/[0.03] p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-amber-300">
          Segurança dos dados
        </p>

        <h3 className="mt-3 text-3xl font-bold text-white">Backup do SIGMA LUMP</h3>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
          Enquanto o sistema ainda usa armazenamento local do navegador, esta tela permite baixar
          uma cópia completa dos dados da Loja e restaurar depois, caso troque de computador,
          limpe o navegador ou precise recuperar informações.
        </p>
      </section>

      {mensagem && (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          {mensagem}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Último backup</p>
          <h4 className="mt-3 text-xl font-bold text-white">
            {formatarDataHora(ultimoBackup)}
          </h4>
          <p className="mt-2 text-xs text-zinc-500">
            Data registrada neste navegador.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Dados encontrados</p>
          <h4 className="mt-3 text-xl font-bold text-amber-300">
            {totalDadosAtuais} chave(s)
          </h4>
          <p className="mt-2 text-xs text-zinc-500">
            Quantidade de grupos de dados salvos.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Formato do backup</p>
          <h4 className="mt-3 text-xl font-bold text-white">JSON</h4>
          <p className="mt-2 text-xs text-zinc-500">
            Arquivo leve, portátil e restaurável.
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
          <h3 className="text-2xl font-bold text-white">Baixar backup completo</h3>

          <p className="mt-3 text-sm leading-6 text-emerald-100/80">
            Gera um arquivo com obreiros, sessões, presenças, tesouraria, custos,
            secretaria, decisões, gestão atual e prestação de contas.
          </p>

          <button
            type="button"
            onClick={gerarBackup}
            className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-black transition hover:bg-emerald-300"
          >
            Baixar backup agora
          </button>
        </div>

        <div className="rounded-3xl border border-sky-400/20 bg-sky-400/10 p-6">
          <h3 className="text-2xl font-bold text-white">Restaurar backup</h3>

          <p className="mt-3 text-sm leading-6 text-sky-100/80">
            Selecione um arquivo JSON gerado pelo SIGMA LUMP. Antes de restaurar,
            o sistema vai pedir confirmação.
          </p>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm text-zinc-300">Arquivo de backup</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={selecionarArquivo}
              className="block w-full cursor-pointer rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-sky-400 file:px-4 file:py-2 file:font-semibold file:text-black"
            />
          </label>

          {resumoBackupSelecionado && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">Backup selecionado</p>
              <p className="mt-2 text-sm text-zinc-400">
                Gerado em: {resumoBackupSelecionado.geradoEm}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Dados: {resumoBackupSelecionado.quantidadeChaves} chave(s)
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Versão: {resumoBackupSelecionado.versao}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={restaurarBackup}
            disabled={!backupSelecionado}
            className="mt-6 rounded-full bg-sky-400 px-6 py-3 font-semibold text-black transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Restaurar backup selecionado
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-red-400/20 bg-red-400/10 p-6">
        <h3 className="text-2xl font-bold text-white">Limpar dados locais</h3>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-red-100/80">
          Use apenas para apagar dados de teste ou reiniciar o sistema neste navegador.
          Antes de limpar, baixe um backup. Esta ação não pode ser desfeita sem um arquivo salvo.
        </p>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1">
            <span className="mb-2 block text-sm text-zinc-300">
              Digite LIMPAR para confirmar
            </span>
            <input
              value={confirmacaoLimpeza}
              onChange={(evento) => setConfirmacaoLimpeza(evento.target.value)}
              placeholder="LIMPAR"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </label>

          <button
            type="button"
            onClick={limparDados}
            className="rounded-full bg-red-400 px-6 py-3 font-semibold text-black transition hover:bg-red-300"
          >
            Limpar dados
          </button>
        </div>
      </section>
    </div>
  );
}
