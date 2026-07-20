"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listarNotificacoesAction,
  processarFilaAction,
  reenviarNotificacaoAction,
  testarEnvioAdministradorAction,
} from "@/app/notificacoes/actions";
import { lojaAtivaId } from "@/lib/loja-ativa";

type StatusEmail =
  | "Aguardando configuração"
  | "Pendente"
  | "Enviando"
  | "Enviado"
  | "Falhou"
  | "Ignorado";

type ItemEmail = {
  id: string;
  destinatarioEmail: string;
  destinatarioNome: string;
  assunto: string;
  eventoTipo: string;
  rotaDestino: string;
  status: StatusEmail;
  tentativas: number;
  ultimoErro: string;
  enviadoEm: string;
  processadoEm: string;
  criadoEm: string;
  atualizadoEm: string;
};

type Configuracao = {
  resendConfigurado: boolean;
  remetenteConfigurado: boolean;
  configurado: boolean;
};

const statusDisponiveis = [
  "Todos",
  "Aguardando configuração",
  "Pendente",
  "Enviando",
  "Enviado",
  "Falhou",
  "Ignorado",
] as const;

function formatarData(valor: string) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(valor));
}

function classeStatus(status: StatusEmail) {
  if (status === "Enviado") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (status === "Falhou") return "border-red-400/30 bg-red-400/10 text-red-200";
  if (status === "Ignorado") return "border-slate-400/30 bg-slate-400/10 text-slate-300";
  if (status === "Aguardando configuração") return "border-orange-400/30 bg-orange-400/10 text-orange-200";
  if (status === "Enviando") return "border-sky-400/30 bg-sky-400/10 text-sky-200";
  return "border-amber-400/30 bg-amber-400/10 text-amber-200";
}

export function NotificacoesEmailClient() {
  const [lojaId, setLojaId] = useState("");
  const [itens, setItens] = useState<ItemEmail[]>([]);
  const [configuracao, setConfiguracao] = useState<Configuracao>({
    resendConfigurado: false,
    remetenteConfigurado: false,
    configurado: false,
  });
  const [filtro, setFiltro] = useState<(typeof statusDisponiveis)[number]>("Todos");
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregar = useCallback(async (id: string, silencioso = false) => {
    if (!silencioso) setCarregando(true);
    setErro("");
    const resultado = await listarNotificacoesAction({ lojaId: id, status: "Todos" });
    if (resultado.ok) {
      setItens(resultado.data as ItemEmail[]);
      setConfiguracao(resultado.configuracao);
    } else {
      setErro(resultado.erro);
    }
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

  const filtrados = useMemo(
    () => filtro === "Todos" ? itens : itens.filter((item) => item.status === filtro),
    [filtro, itens],
  );

  const totais = useMemo(() => ({
    aguardando: itens.filter((item) => item.status === "Aguardando configuração").length,
    pendentes: itens.filter((item) => ["Pendente", "Enviando"].includes(item.status)).length,
    enviados: itens.filter((item) => item.status === "Enviado").length,
    falhas: itens.filter((item) => item.status === "Falhou").length,
    ignorados: itens.filter((item) => item.status === "Ignorado").length,
  }), [itens]);

  async function processarFila() {
    setErro("");
    setSucesso("");
    setProcessando("fila");
    const resultado = await processarFilaAction(lojaId);
    setProcessando("");
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    const dados = resultado.data;
    setSucesso(`Fila processada: ${dados.enviadas} enviado(s), ${dados.falhas} falha(s) e ${dados.ignoradas} ignorado(s).`);
    await carregar(lojaId, true);
  }

  async function testar() {
    setErro("");
    setSucesso("");
    setProcessando("teste");
    const resultado = await testarEnvioAdministradorAction(lojaId);
    setProcessando("");
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setSucesso(resultado.mensagem);
    await carregar(lojaId, true);
  }

  async function reenviar(id: string) {
    setErro("");
    setSucesso("");
    setProcessando(id);
    const resultado = await reenviarNotificacaoAction({ id, lojaId });
    setProcessando("");
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setSucesso("Reenvio processado. Consulte o novo status na fila.");
    await carregar(lojaId, true);
  }

  return (
    <section className="space-y-6 py-6">
      {!configuracao.configurado && !carregando && (
        <div className="rounded-2xl border border-orange-400/30 bg-orange-400/10 p-5 text-orange-100" role="status">
          <h2 className="font-bold">Envio externo aguardando configuração</h2>
          <p className="mt-1 text-sm leading-6 text-orange-100/80">
            Configure RESEND_API_KEY e EMAIL_FROM no ambiente da Vercel. A aplicação continua funcionando e os avisos ficam preservados na fila.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full border px-3 py-1 ${configuracao.resendConfigurado ? "border-emerald-400/30 text-emerald-200" : "border-red-400/30 text-red-200"}`}>
              RESEND_API_KEY: {configuracao.resendConfigurado ? "configurada" : "ausente"}
            </span>
            <span className={`rounded-full border px-3 py-1 ${configuracao.remetenteConfigurado ? "border-emerald-400/30 text-emerald-200" : "border-red-400/30 text-red-200"}`}>
              EMAIL_FROM: {configuracao.remetenteConfigurado ? "configurado" : "ausente"}
            </span>
          </div>
        </div>
      )}

      {erro && <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-100" role="alert">{erro}</div>}
      {sucesso && <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-100" role="status">{sucesso}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Aguardando configuração", totais.aguardando, "text-orange-300"],
          ["Pendentes", totais.pendentes, "text-amber-300"],
          ["Enviados", totais.enviados, "text-emerald-300"],
          ["Falharam", totais.falhas, "text-red-300"],
          ["Ignorados", totais.ignorados, "text-slate-300"],
        ].map(([rotulo, valor, cor]) => (
          <article key={String(rotulo)} className="rounded-2xl border border-slate-700/60 bg-slate-900/55 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">{rotulo}</p>
            <p className={`mt-2 text-3xl font-black ${cor}`}>{valor}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/45 p-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="text-sm text-slate-300">
          Status
          <select
            value={filtro}
            onChange={(evento) => setFiltro(evento.target.value as (typeof statusDisponiveis)[number])}
            className="mt-1 block min-w-64 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          >
            {statusDisponiveis.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void carregar(lojaId)}
            disabled={carregando || Boolean(processando)}
            className="rounded-xl border border-slate-600 px-4 py-3 font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-50"
          >
            {carregando ? "Atualizando…" : "Atualizar fila"}
          </button>
          <button
            type="button"
            onClick={() => void processarFila()}
            disabled={Boolean(processando)}
            className="rounded-xl border border-amber-400/30 px-4 py-3 font-semibold text-amber-200 hover:bg-amber-400/10 disabled:opacity-50"
          >
            {processando === "fila" ? "Processando…" : "Processar pendentes"}
          </button>
          <button
            type="button"
            onClick={() => void testar()}
            disabled={Boolean(processando)}
            className="rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {processando === "teste" ? "Enviando teste…" : "Testar no meu e-mail"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/40">
        <div className="border-b border-slate-700/60 px-5 py-4">
          <h2 className="text-lg font-bold">Fila de e-mails</h2>
          <p className="mt-1 text-sm text-slate-500">O conteúdo do e-mail é sempre genérico e direciona o usuário ao SIGMA.</p>
        </div>

        {carregando ? (
          <div className="p-10 text-center text-slate-400" role="status">Carregando notificações…</div>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Nenhum e-mail neste status.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtrados.map((item) => (
              <article key={item.id} className="grid gap-4 p-5 xl:grid-cols-[1.5fr_1.2fr_auto] xl:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${classeStatus(item.status)}`}>{item.status}</span>
                    <span className="text-xs text-slate-500">{item.eventoTipo}</span>
                  </div>
                  <h3 className="mt-2 truncate font-semibold text-white">{item.assunto}</h3>
                  <p className="mt-1 truncate text-sm text-slate-400">{item.destinatarioNome} · {item.destinatarioEmail}</p>
                </div>
                <div className="text-sm text-slate-400">
                  <p>Criado: <span className="text-slate-200">{formatarData(item.criadoEm)}</span></p>
                  <p className="mt-1">Tentativas: <span className="text-slate-200">{item.tentativas}</span></p>
                  {item.ultimoErro && <p className="mt-2 line-clamp-2 text-xs text-red-300" title={item.ultimoErro}>{item.ultimoErro}</p>}
                </div>
                <div className="flex justify-end">
                  {(item.status === "Falhou" || item.status === "Aguardando configuração") && (
                    <button
                      type="button"
                      onClick={() => void reenviar(item.id)}
                      disabled={Boolean(processando)}
                      className="rounded-xl border border-amber-400/30 px-4 py-2.5 text-sm font-bold text-amber-200 hover:bg-amber-400/10 disabled:opacity-50"
                    >
                      {processando === item.id ? "Reenviando…" : "Reenviar"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-5 text-sm leading-6 text-sky-100/85">
        Por segurança, nenhuma senha, documento, justificativa, comprovante ou resposta é incluída no e-mail. O destinatário recebe apenas o aviso e acessa o conteúdo autenticado dentro do SIGMA.
      </div>
    </section>
  );
}
