"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { carregarPortal } from "@/lib/supabase/portal";
import { enviarSolicitacaoPortal } from "@/app/portal-obreiro/actions";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/Feedback";
import { FormField } from "@/components/ui/FormField";
import { moedaBR, dataBR } from "@/lib/formatacao";

type Dados = Awaited<ReturnType<typeof carregarPortal>>;
const campo = "w-full rounded-xl border border-white/10 bg-black/25 p-3";
const tipos = [
  "Atualização cadastral",
  "Justificativa de falta",
  "Frequência e presença",
  "Envio de comprovante de pagamento",
  "Assunto financeiro",
  "Kit Placet e documentos",
  "Documento ou certidão",
  "Solicitação à Secretaria",
  "Solicitação à Tesouraria",
  "Solicitação à Chancelaria",
  "Outra",
];
const dataHora = (valor: string) => valor ? new Date(valor).toLocaleString("pt-BR") : "—";
const diasAte = (valor: string) => valor ? Math.ceil((new Date(valor).getTime() - Date.now()) / 86400000) : 0;
const encerrada = (status: string) => ["Aprovada", "Recusada", "Concluída", "Cancelada"].includes(status);

export function PortalObreiroClient() {
  const [dados, setDados] = useState<Dados>();
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [tipo, setTipo] = useState("Atualização cadastral");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataSessao, setDataSessao] = useState("");
  const [sessaoId, setSessaoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const exigeSessao = tipo === "Justificativa de falta" || tipo === "Frequência e presença";
  const hoje = new Date().toISOString().slice(0, 10);
  const sessoesNaData = (dados?.sessoesDisponiveis ?? []).filter((sessao) => !dataSessao || sessao.data === dataSessao);
  const sessaoSelecionada = (dados?.sessoesDisponiveis ?? []).find((sessao) => sessao.id === sessaoId);
  const presencaSelecionada = (dados?.presencas ?? []).find((presenca) => presenca.sessao_id === sessaoId);

  useEffect(() => {
    carregarPortal().then(setDados).catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível abrir o Portal."));
  }, []);

  const resumo = useMemo(() => {
    const presencas = dados?.presencas ?? [];
    const presentes = presencas.filter((i) => i.status === "Presente").length;
    const justificadas = presencas.filter((i) => i.status === "Justificado").length;
    const faltas = presencas.filter((i) => i.status === "Falta").length;
    const frequencia = presencas.length ? Math.round((presentes + justificadas) / presencas.length * 100) : 0;
    const abertas = (dados?.mensalidades ?? []).filter((i) => i.status === "Pendente");
    return { presentes, justificadas, faltas, frequencia, abertas, totalAberto: abertas.reduce((s, i) => s + Number(i.valor || 0), 0) };
  }, [dados]);

  if (!dados && !erro) return <LoadingState />;
  if (erro && !dados) return <Feedback tone="error">{erro}</Feedback>;
  if (!dados?.obreiro) return <Feedback tone="warning">Seu usuário ainda não está vinculado ao cadastro de Obreiro. Solicite regularização à Secretaria da Loja.</Feedback>;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!dados) return;
    setEnviando(true);
    setErro("");
    setSucesso("");
    try {
      const nova = await enviarSolicitacaoPortal({ lojaId: dados.lojaId, tipo, titulo, descricao, sessaoId: exigeSessao ? sessaoId : undefined });
      setSucesso(`Solicitação ${nova.protocolo} enviada para ${nova.areaDestino}. A tramitação já está disponível abaixo.`);
      setTitulo("");
      setDescricao("");
      setDataSessao("");
      setSessaoId("");
      setDados(await carregarPortal());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar a solicitação. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return <div className="mt-8 space-y-6">
    <Feedback tone="info">Acompanhe cada solicitação do protocolo ao resultado final. Toda mudança de área, etapa e resposta aparece na linha do tempo.</Feedback>
    {erro && <Feedback tone="error">{erro}</Feedback>}
    {sucesso && <Feedback tone="success">{sucesso}</Feedback>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Situação cadastral", dados.obreiro.situacao],
        ["Frequência", `${resumo.frequencia}%`],
        ["Mensalidades em aberto", resumo.abertas.length],
        ["Solicitações em andamento", dados.solicitacoes.filter((i) => !encerrada(i.status)).length],
      ].map(([t, v]) => <article key={String(t)} className="sigma-surface rounded-2xl p-5"><p className="text-sm text-zinc-400">{t}</p><p className="mt-2 text-2xl font-black text-amber-200">{v}</p></article>)}
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <article className="sigma-surface rounded-3xl p-6">
        <h2 className="text-xl font-black">Meus Dados</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {[["Nome", dados.obreiro.nome], ["Grau", dados.obreiro.grau], ["Cargo", dados.obreiro.cargo || "Não informado"], ["E-mail", dados.obreiro.email || "Não informado"], ["Telefone", dados.obreiro.telefone || "Não informado"], ["Loja de origem", dados.obreiro.loja_origem || "Não informada"]].map(([t, v]) => <div key={t} className="rounded-xl border border-white/10 p-3"><dt className="text-zinc-500">{t}</dt><dd className="mt-1 font-semibold">{v}</dd></div>)}
        </dl>
      </article>
      <article className="sigma-surface rounded-3xl p-6">
        <h2 className="text-xl font-black">Minha Tesouraria</h2>
        <p className="mt-4 text-3xl font-black text-amber-200">{moedaBR(resumo.totalAberto)}</p>
        <p className="text-sm text-zinc-400">Total de mensalidades pendentes</p>
        <div className="mt-4 space-y-2">{dados.mensalidades.slice(0, 6).map((i) => <div key={i.id} className="flex justify-between rounded-xl border border-white/10 p-3 text-sm"><span>{dataBR(i.competencia)}</span><span>{i.status} · {moedaBR(i.valor)}</span></div>)}</div>
      </article>
    </section>

    <section className="sigma-surface rounded-3xl p-6">
      <h2 className="text-xl font-black">Minha Frequência</h2>
      <p className="mt-2 text-sm text-zinc-400">{resumo.presentes} presenças · {resumo.justificadas} justificadas · {resumo.faltas} faltas</p>
      <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-zinc-400"><th className="p-3">Data</th><th className="p-3">Sessão</th><th className="p-3">Situação</th><th className="p-3">Cargo</th></tr></thead><tbody>{dados.presencas.map((i) => <tr key={`${i.sessao_id}-${i.obreiro_id}`} className="border-t border-white/10"><td className="p-3">{dataBR(i.sessoes?.data)}</td><td className="p-3">{i.sessoes?.titulo || i.sessoes?.tipo}</td><td className="p-3">{i.status}</td><td className="p-3">{i.cargo_sessao || "—"}</td></tr>)}</tbody></table></div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <article className="sigma-surface rounded-3xl p-6"><h2 className="text-xl font-black">Agenda da Loja</h2><div className="mt-4 space-y-3">{dados.agenda.length ? dados.agenda.slice(0, 8).map((i) => <div key={i.id} className="rounded-xl border border-white/10 p-3"><b>{i.titulo}</b><p className="text-sm text-zinc-400">{new Date(i.inicio).toLocaleString("pt-BR")} · {i.local || "Local a confirmar"}</p></div>) : <EmptyState title="Nenhum evento disponível" description="A agenda pública da Loja aparecerá aqui." />}</div></article>
      <article className="sigma-surface rounded-3xl p-6"><h2 className="text-xl font-black">Comunicados</h2><div className="mt-4 space-y-3">{dados.comunicados.length ? dados.comunicados.slice(0, 8).map((i) => <div key={i.id} className={`rounded-xl border p-3 ${i.prioridade === "Urgente" ? "border-red-400/40 bg-red-400/10" : "border-white/10"}`}><b>{i.titulo}</b><p className="mt-1 text-sm text-zinc-300">{i.mensagem}</p></div>) : <EmptyState title="Não há comunicados novos" description="Novos avisos destinados a você aparecerão aqui." />}</div></article>
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <article className="sigma-surface rounded-3xl p-6">
        <h2 className="text-xl font-black">Documentos disponíveis</h2>
        <div className="mt-4 space-y-2">{dados.documentos.length ? dados.documentos.map((i) => <div key={i.id} className="rounded-xl border border-white/10 p-3"><b>{i.titulo}</b><p className="text-xs text-zinc-500">{i.tipo} · {i.status}</p>{i.arquivo_url && <a href={i.arquivo_url} target="_blank" rel="noreferrer" className="text-sm text-amber-200 underline">Abrir documento</a>}</div>) : <EmptyState title="Nenhum documento disponível" description="Somente documentos liberados para você são exibidos." />}</div>
      </article>

      <article className="sigma-surface rounded-3xl p-6">
        <h2 className="text-xl font-black">Nova solicitação</h2>
        <form data-permission-action="criar" onSubmit={e => void enviar(e)} className="mt-4 grid gap-3" aria-busy={enviando}>
          <FormField id="portal-tipo" label="Tipo" description="O sistema encaminha automaticamente ao perfil responsável.">
            <select id="portal-tipo" value={tipo} onChange={(e) => { setTipo(e.target.value); setDataSessao(""); setSessaoId(""); }} disabled={enviando} className={campo}>{tipos.map((x) => <option key={x}>{x}</option>)}</select>
          </FormField>
          {exigeSessao && <div className="grid gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4">
            <p className="font-bold text-amber-100">Qual sessão deseja justificar?</p>
            <p className="text-xs leading-5 text-zinc-400">Abra o calendário, escolha a data da ausência e depois confirme a sessão. Somente sessões já realizadas ou com data até hoje aparecem.</p>
            <FormField id="portal-data-sessao" label="Data da sessão" required description="Clique no campo para abrir o calendário.">
              <input id="portal-data-sessao" type="date" required max={hoje} disabled={enviando} value={dataSessao} onChange={(e) => {
                const data = e.target.value;
                setDataSessao(data);
                const candidatas = (dados?.sessoesDisponiveis ?? []).filter((sessao) => sessao.data === data);
                setSessaoId(candidatas.length === 1 ? candidatas[0].id : "");
              }} className={campo} />
            </FormField>
            <FormField id="portal-sessao" label="Sessão" required description={dataSessao && sessoesNaData.length === 0 ? "Nenhuma sessão cadastrada nessa data. Confirme a data ou procure a Chancelaria." : "Confirme o título da sessão antes de enviar."}>
              <select id="portal-sessao" required disabled={enviando || !dataSessao || sessoesNaData.length === 0} value={sessaoId} onChange={(e) => setSessaoId(e.target.value)} className={campo}>
                <option value="">{dataSessao ? "Selecione a sessão" : "Escolha primeiro a data"}</option>
                {sessoesNaData.map((sessao) => <option key={sessao.id} value={sessao.id}>{sessao.titulo || sessao.tipo} · {dataBR(sessao.data)}</option>)}
              </select>
            </FormField>
            {sessaoSelecionada && <div className="rounded-xl bg-black/25 p-3 text-sm">
              <b>{sessaoSelecionada.titulo || sessaoSelecionada.tipo}</b>
              <p className="text-zinc-400">{dataBR(sessaoSelecionada.data)} · Situação atual na frequência: {presencaSelecionada?.status || "Não marcada"}</p>
            </div>}
          </div>}
          <FormField id="portal-titulo" label="Assunto" required description="Resuma o pedido em até 120 caracteres.">
            <input id="portal-titulo" required minLength={3} maxLength={120} disabled={enviando} value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} />
          </FormField>
          <FormField id="portal-descricao" label="Descrição" required description="Explique o pedido com pelo menos 10 caracteres.">
            <textarea id="portal-descricao" required minLength={10} maxLength={2000} rows={5} disabled={enviando} value={descricao} onChange={(e) => setDescricao(e.target.value)} className={campo} />
          </FormField>
          <p className="text-right text-xs text-zinc-500">{descricao.length}/2000 caracteres</p>
          <button type="submit" disabled={enviando} className="rounded-xl bg-amber-400 p-3 font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60">{enviando ? "Enviando com segurança…" : "Enviar para análise"}</button>
          <p className="text-xs leading-5 text-zinc-500">Você receberá um protocolo, área responsável e prazo de atendimento imediatamente.</p>
        </form>
      </article>
    </section>

    <section className="sigma-surface rounded-3xl p-6">
      <h2 className="text-xl font-black">Minhas solicitações e tramitações</h2>
      <div className="mt-4 space-y-4">{dados.solicitacoes.length ? dados.solicitacoes.map((i) => {
        const dias = diasAte(i.prazoEm);
        return <article key={i.id} className="rounded-2xl border border-white/10 p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wider text-amber-300">{i.protocolo || "Gerando protocolo"}</p><h3 className="mt-1 font-black">{i.titulo}</h3><p className="text-zinc-400">{i.tipo} · enviada em {dataHora(i.criadoEm)}</p></div>
            <span className="rounded-full bg-amber-400/10 px-3 py-1 font-bold text-amber-200">{i.status}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-zinc-500">Encaminhada para</p><b>{i.areaDestino} · {i.responsavelPerfil}</b></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-zinc-500">Etapa atual</p><b>{i.etapaAtual}</b></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-zinc-500">Prazo</p><b>{encerrada(i.status) ? "Atendimento finalizado" : dias < 0 ? `${Math.abs(dias)} dia(s) em atraso` : dias === 0 ? "Vence hoje" : `${dias} dia(s) restante(s)`}</b></div>
          </div>
          {i.sessaoId && <div className="mt-3 rounded-xl border border-sky-300/20 bg-sky-300/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-200">Sessão vinculada</p>
            <p className="mt-1 font-semibold">{i.sessaoTitulo || i.sessaoTipo || "Sessão"} · {dataBR(i.sessaoData)}</p>
            {i.frequenciaAjustadaEm && <p className="mt-1 text-emerald-200">Frequência confirmada em {dataHora(i.frequenciaAjustadaEm)}.</p>}
          </div>}
          <p className="mt-3 text-zinc-300">{i.descricao}</p>
          {i.resposta && <p className="mt-3 rounded-xl bg-emerald-400/10 p-3 text-emerald-100"><b>Resposta:</b> {i.resposta}</p>}
          {i.arquivoFinalUrl && <a href={i.arquivoFinalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl bg-emerald-400 px-4 py-2 font-bold text-black">Baixar documento final</a>}
          <details className="mt-3 rounded-xl border border-white/10 p-3" open={!encerrada(i.status)}>
            <summary className="cursor-pointer font-bold">Ver tramitação completa ({i.tramitacoes.length})</summary>
            <ol className="mt-4 space-y-3 border-l border-amber-400/30 pl-4">{i.tramitacoes.map((t) => <li key={t.id} className="relative"><span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-amber-300" /><div className="flex flex-wrap justify-between gap-2"><b>{t.etapa || t.statusNovo}</b><span className="text-xs text-zinc-500">{dataHora(t.criadoEm)}</span></div><p className="text-zinc-300">{t.mensagem || `Situação alterada para ${t.statusNovo}.`}</p><p className="text-xs text-zinc-500">Responsável: {t.autorPerfil || "Sistema"}</p></li>)}</ol>
          </details>
        </article>;
      }) : <EmptyState title="Nenhuma solicitação enviada" description="Preencha o formulário acima para enviar seu primeiro pedido à Loja." />}</div>
    </section>
  </div>;
}
