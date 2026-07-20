"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { carregarPortal } from "@/lib/supabase/portal";
import {
  enviarSolicitacaoPortal,
  registrarAnexoPortal,
  responderSolicitacaoPortal,
} from "@/app/portal-obreiro/actions";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/Feedback";
import { FormField } from "@/components/ui/FormField";
import { dataBR } from "@/lib/formatacao";

type Dados = Awaited<ReturnType<typeof carregarPortal>>;
const campo = "w-full rounded-xl border border-white/10 bg-black/25 p-3";
const tipos = [
  "Atualização cadastral",
  "Justificativa de falta",
  "Frequência e presença",
  "Envio de comprovante de pagamento",
  "Assunto financeiro",
  "Isenção de mensalidades",
  "Kit Placet e documentos",
  "Documento ou certidão",
  "Solicitação à Secretaria",
  "Solicitação à Tesouraria",
  "Solicitação à Chancelaria",
  "Outra",
];
const encerrada = (status: string) => ["Aprovada", "Recusada", "Concluída", "Cancelada"].includes(status);
const dataHora = (valor: string) => valor ? new Date(valor).toLocaleString("pt-BR") : "—";
const diasAte = (valor: string) => valor ? Math.ceil((new Date(valor).getTime() - Date.now()) / 86400000) : 0;
const formatosAceitos = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";
const maximoArquivo = 10 * 1024 * 1024;

export function PortalSolicitacoesClient() {
  const supabase = useMemo(() => createClient(), []);
  const [dados, setDados] = useState<Dados>();
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [tipo, setTipo] = useState("Atualização cadastral");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modoSessao, setModoSessao] = useState<"unica" | "periodo">("unica");
  const [dataSessao, setDataSessao] = useState("");
  const [periodoSessaoInicio, setPeriodoSessaoInicio] = useState("");
  const [periodoSessaoFim, setPeriodoSessaoFim] = useState("");
  const [sessoesSelecionadas, setSessoesSelecionadas] = useState<string[]>([]);
  const [isencaoInicio, setIsencaoInicio] = useState("");
  const [isencaoFim, setIsencaoFim] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [chaveArquivos, setChaveArquivos] = useState(0);
  const [mensagens, setMensagens] = useState<Record<string, string>>({});
  const [arquivosResposta, setArquivosResposta] = useState<Record<string, File[]>>({});
  const [enviando, setEnviando] = useState(false);
  const [processando, setProcessando] = useState("");

  async function carregar() {
    setDados(await carregarPortal());
  }

  useEffect(() => {
    carregar().catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar as solicitações."));
  }, []);

  const exigeSessoes = tipo === "Justificativa de falta" || tipo === "Frequência e presença";
  const exigeIsencao = tipo === "Isenção de mensalidades";
  const hoje = new Date().toISOString().slice(0, 10);
  const sessoesDaData = (dados?.sessoesDisponiveis ?? []).filter((sessao) => sessao.data === dataSessao);
  const sessoesDoPeriodo = (dados?.sessoesDisponiveis ?? []).filter((sessao) =>
    periodoSessaoInicio && periodoSessaoFim
      && sessao.data >= periodoSessaoInicio
      && sessao.data <= periodoSessaoFim
  );

  function limparFormulario() {
    setTitulo("");
    setDescricao("");
    setDataSessao("");
    setPeriodoSessaoInicio("");
    setPeriodoSessaoFim("");
    setSessoesSelecionadas([]);
    setIsencaoInicio("");
    setIsencaoFim("");
    setArquivos([]);
    setChaveArquivos((valor) => valor + 1);
  }

  function selecionarPeriodo(inicio: string, fim: string) {
    if (!dados || !inicio || !fim || inicio > fim) {
      setSessoesSelecionadas([]);
      return;
    }
    setSessoesSelecionadas(dados.sessoesDisponiveis
      .filter((sessao) => sessao.data >= inicio && sessao.data <= fim)
      .map((sessao) => sessao.id));
  }

  function validarArquivos(lista: File[]) {
    for (const arquivo of lista) {
      if (arquivo.size <= 0 || arquivo.size > maximoArquivo) throw new Error(`${arquivo.name}: o arquivo deve ter no máximo 10 MB.`);
      if (![
        "application/pdf", "image/jpeg", "image/png", "image/webp",
        "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(arquivo.type)) throw new Error(`${arquivo.name}: formato não permitido.`);
    }
  }

  async function enviarArquivos(solicitacaoId: string, lista: File[]) {
    if (!dados || lista.length === 0) return;
    validarArquivos(lista);
    for (const arquivo of lista) {
      const nomeSeguro = arquivo.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
      const caminho = `${dados.lojaId}/${dados.user.id}/${solicitacaoId}/${crypto.randomUUID()}-${nomeSeguro}`;
      const { error: uploadError } = await supabase.storage
        .from("solicitacoes-anexos")
        .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
      if (uploadError) throw new Error(`Não foi possível enviar ${arquivo.name}: ${uploadError.message}`);
      try {
        await registrarAnexoPortal({
          id: solicitacaoId,
          storagePath: caminho,
          nome: arquivo.name,
          tipo: arquivo.type,
          tamanho: arquivo.size,
        });
      } catch (e) {
        await supabase.storage.from("solicitacoes-anexos").remove([caminho]);
        throw e;
      }
    }
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!dados) return;
    setEnviando(true);
    setErro("");
    setSucesso("");
    try {
      validarArquivos(arquivos);
      const sessaoIds = exigeSessoes ? sessoesSelecionadas : [];
      const nova = await enviarSolicitacaoPortal({
        lojaId: dados.lojaId,
        tipo,
        titulo,
        descricao,
        sessaoIds,
        periodoInicio: exigeIsencao && isencaoInicio ? `${isencaoInicio}-01` : undefined,
        periodoFim: exigeIsencao && isencaoFim ? `${isencaoFim}-01` : undefined,
      });
      let avisoAnexo = "";
      try {
        await enviarArquivos(nova.id, arquivos);
      } catch (e) {
        avisoAnexo = ` A solicitação foi criada, mas um anexo precisa ser reenviado: ${e instanceof Error ? e.message : "falha no arquivo"}`;
      }
      setSucesso(`Solicitação ${nova.protocolo} enviada para ${nova.areaDestino}. A área emitirá parecer e o Venerável dará a decisão final.${avisoAnexo}`);
      limparFormulario();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar a solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  async function responder(id: string) {
    const mensagem = (mensagens[id] ?? "").trim();
    const lista = arquivosResposta[id] ?? [];
    if (!mensagem && lista.length === 0) {
      setErro("Escreva uma mensagem ou selecione ao menos um arquivo.");
      return;
    }
    setProcessando(id);
    setErro("");
    setSucesso("");
    try {
      if (lista.length) await enviarArquivos(id, lista);
      if (mensagem) await responderSolicitacaoPortal({ id, mensagem });
      setMensagens({ ...mensagens, [id]: "" });
      setArquivosResposta({ ...arquivosResposta, [id]: [] });
      setSucesso("Complementação enviada. A área responsável e o Venerável serão notificados conforme a etapa.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar a complementação.");
    } finally {
      setProcessando("");
    }
  }

  if (!dados && !erro) return <LoadingState />;
  if (erro && !dados) return <Feedback tone="error">{erro}</Feedback>;
  if (!dados) return null;

  return <div className="space-y-6">
    {erro && <Feedback tone="error">{erro}</Feedback>}
    {sucesso && <Feedback tone="success">{sucesso}</Feedback>}

    <section className="sigma-surface rounded-3xl p-6">
      <h2 className="text-xl font-black">Nova solicitação</h2>
      <p className="mt-2 text-sm text-zinc-400">Você pode anexar fotos, PDF ou documentos. A área responsável analisa e somente o Venerável profere a decisão final.</p>

      <form data-permission-action="criar" onSubmit={(e) => void enviar(e)} className="mt-5 grid gap-4" aria-busy={enviando}>
        <FormField id="portal-tipo" label="Tipo" description="O sistema distribui automaticamente para Tesouraria, Chancelaria ou Secretaria.">
          <select id="portal-tipo" value={tipo} onChange={(e) => {
            setTipo(e.target.value);
            setSessoesSelecionadas([]);
            setDataSessao("");
          }} disabled={enviando} className={campo}>
            {tipos.map((item) => <option key={item}>{item}</option>)}
          </select>
        </FormField>

        {exigeSessoes && <div className="grid gap-4 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4">
          <div>
            <p className="font-black text-amber-100">Sessões que deseja justificar</p>
            <p className="text-xs leading-5 text-zinc-400">Você pode escolher uma sessão ou todo um período. Sessões sem presença lançada também poderão receber a situação Justificado.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={modoSessao === "unica"} onChange={() => { setModoSessao("unica"); setSessoesSelecionadas([]); }} /> Uma sessão</label>
            <label className="flex items-center gap-2"><input type="radio" checked={modoSessao === "periodo"} onChange={() => { setModoSessao("periodo"); setSessoesSelecionadas([]); }} /> Período com várias sessões</label>
          </div>

          {modoSessao === "unica" ? <>
            <FormField id="data-sessao" label="Data da sessão" required description="Clique para abrir o calendário.">
              <input id="data-sessao" type="date" required max={hoje} value={dataSessao} onChange={(e) => {
                const data = e.target.value;
                setDataSessao(data);
                const encontradas = (dados.sessoesDisponiveis ?? []).filter((sessao) => sessao.data === data);
                setSessoesSelecionadas(encontradas.length === 1 ? [encontradas[0].id] : []);
              }} className={campo} />
            </FormField>
            <FormField id="sessao-unica" label="Confirmar sessão" required description={dataSessao && sessoesDaData.length === 0 ? "Nenhuma sessão cadastrada nesta data." : "Confira o título antes de continuar."}>
              <select id="sessao-unica" required disabled={!dataSessao || sessoesDaData.length === 0} value={sessoesSelecionadas[0] ?? ""} onChange={(e) => setSessoesSelecionadas(e.target.value ? [e.target.value] : [])} className={campo}>
                <option value="">Selecione</option>
                {sessoesDaData.map((sessao) => <option key={sessao.id} value={sessao.id}>{sessao.titulo || sessao.tipo}</option>)}
              </select>
            </FormField>
          </> : <>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="periodo-sessao-inicio" label="Início" required>
                <input id="periodo-sessao-inicio" type="date" required max={hoje} value={periodoSessaoInicio} onChange={(e) => {
                  setPeriodoSessaoInicio(e.target.value);
                  selecionarPeriodo(e.target.value, periodoSessaoFim);
                }} className={campo} />
              </FormField>
              <FormField id="periodo-sessao-fim" label="Fim" required>
                <input id="periodo-sessao-fim" type="date" required max={hoje} min={periodoSessaoInicio || undefined} value={periodoSessaoFim} onChange={(e) => {
                  setPeriodoSessaoFim(e.target.value);
                  selecionarPeriodo(periodoSessaoInicio, e.target.value);
                }} className={campo} />
              </FormField>
            </div>
            <div className="max-h-64 space-y-2 overflow-auto rounded-xl border border-white/10 p-3">
              {sessoesDoPeriodo.length ? sessoesDoPeriodo.map((sessao) => <label key={sessao.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-white/5">
                <input type="checkbox" checked={sessoesSelecionadas.includes(sessao.id)} onChange={(e) => setSessoesSelecionadas(e.target.checked
                  ? Array.from(new Set([...sessoesSelecionadas, sessao.id]))
                  : sessoesSelecionadas.filter((id) => id !== sessao.id))} />
                <span><b>{dataBR(sessao.data)}</b> · {sessao.titulo || sessao.tipo}</span>
              </label>) : <p className="text-sm text-zinc-500">Escolha o período. As sessões cadastradas aparecerão aqui.</p>}
            </div>
            <p className="text-sm font-bold text-amber-100">{sessoesSelecionadas.length} sessão(ões) selecionada(s)</p>
          </>}
        </div>}

        {exigeIsencao && <div className="grid gap-4 rounded-2xl border border-emerald-300/25 bg-emerald-300/5 p-4">
          <div><p className="font-black text-emerald-100">Período solicitado para isenção</p><p className="text-xs text-zinc-400">Informe o primeiro e o último mês. O Tesoureiro emitirá parecer e o Venerável decidirá.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="isencao-inicio" label="Primeiro mês" required>
              <input id="isencao-inicio" type="month" required value={isencaoInicio} onChange={(e) => setIsencaoInicio(e.target.value)} className={campo} />
            </FormField>
            <FormField id="isencao-fim" label="Último mês" required>
              <input id="isencao-fim" type="month" required min={isencaoInicio || undefined} value={isencaoFim} onChange={(e) => setIsencaoFim(e.target.value)} className={campo} />
            </FormField>
          </div>
        </div>}

        <FormField id="portal-titulo" label="Assunto" required description="Resuma o pedido em até 120 caracteres.">
          <input id="portal-titulo" required minLength={3} maxLength={120} disabled={enviando} value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} />
        </FormField>
        <FormField id="portal-descricao" label="Justificativa e detalhes" required description="Explique o motivo, a providência ou o documento solicitado.">
          <textarea id="portal-descricao" required minLength={10} maxLength={2000} rows={6} disabled={enviando} value={descricao} onChange={(e) => setDescricao(e.target.value)} className={campo} />
        </FormField>
        <FormField id="portal-anexos" label="Fotos e documentos (opcional)" description="PDF, JPG, PNG, WEBP, DOC ou DOCX. Até 10 MB por arquivo.">
          <input key={chaveArquivos} id="portal-anexos" type="file" multiple accept={formatosAceitos} disabled={enviando} onChange={(e) => setArquivos(Array.from(e.target.files ?? []))} className={campo} />
        </FormField>
        {arquivos.length > 0 && <p className="text-sm text-zinc-300">{arquivos.length} arquivo(s): {arquivos.map((arquivo) => arquivo.name).join(", ")}</p>}
        <button type="submit" disabled={enviando || (exigeSessoes && sessoesSelecionadas.length === 0)} className="rounded-xl bg-amber-400 p-3 font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
          {enviando ? "Enviando com segurança…" : "Enviar para análise técnica"}
        </button>
      </form>
    </section>

    <section className="sigma-surface rounded-3xl p-6">
      <h2 className="text-xl font-black">Minhas solicitações, mensagens e comprovantes</h2>
      <div className="mt-4 space-y-5">
        {dados.solicitacoes.length ? dados.solicitacoes.map((item) => {
          const dias = diasAte(item.prazoEm);
          return <article key={item.id} className="rounded-2xl border border-white/10 p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">{item.protocolo}</p>
                <h3 className="mt-1 text-lg font-black">{item.titulo}</h3>
                <p className="text-zinc-400">{item.tipo} · {dataHora(item.criadoEm)}</p>
              </div>
              <span className="rounded-full bg-amber-400/10 px-3 py-1 font-bold text-amber-200">{item.status}</span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-zinc-500">Análise técnica</p><b>{item.areaDestino} · {item.responsavelTecnicoPerfil}</b></div>
              <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-zinc-500">Etapa atual</p><b>{item.etapaAtual}</b></div>
              <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-zinc-500">Prazo</p><b>{encerrada(item.status) ? "Finalizado" : dias < 0 ? `${Math.abs(dias)} dia(s) em atraso` : dias === 0 ? "Vence hoje" : `${dias} dia(s) restante(s)`}</b></div>
            </div>

            {item.aguardandoDe === "Obreiro" && <Feedback tone="warning">A Loja solicitou uma correção ou documento. Responda no campo de interação abaixo.</Feedback>}

            {item.sessoes.length > 0 && <div className="mt-3 rounded-xl border border-sky-300/20 bg-sky-300/5 p-3">
              <p className="font-bold text-sky-100">{item.sessoes.length} sessão(ões) vinculada(s)</p>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">{item.sessoes.map((sessao) => <span key={sessao.id}>{dataBR(sessao.data)} · {sessao.titulo || sessao.tipo}</span>)}</div>
              {item.frequenciaAjustadaEm && <p className="mt-2 text-emerald-200">Frequência justificada após decisão final em {dataHora(item.frequenciaAjustadaEm)}.</p>}
            </div>}

            {item.periodoInicio && <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3">
              <b>Período solicitado:</b> {dataBR(item.periodoInicio)} até {dataBR(item.periodoFim)}
            </div>}

            <p className="mt-3 rounded-xl bg-black/20 p-3 text-zinc-200">{item.descricao}</p>
            {item.parecerTecnico && <p className="mt-3 rounded-xl bg-sky-400/10 p-3 text-sky-100"><b>Parecer técnico:</b> {item.parecerTecnico}</p>}
            {item.decisaoFinal && <p className={`mt-3 rounded-xl p-3 ${item.decisaoFinal === "Aprovada" ? "bg-emerald-400/10 text-emerald-100" : "bg-red-400/10 text-red-100"}`}><b>Decisão final do Venerável:</b> {item.decisaoFinal} · {item.resposta}</p>}

            {item.anexos.length > 0 && <div className="mt-3 rounded-xl border border-white/10 p-3">
              <p className="font-bold">Anexos e documentos</p>
              <div className="mt-2 flex flex-wrap gap-2">{item.anexos.map((anexo) => anexo.url
                ? <a key={anexo.id} href={anexo.url} target="_blank" rel="noreferrer" className="rounded-lg bg-white/5 px-3 py-2 text-amber-200 underline">{anexo.nome} · {anexo.categoria}</a>
                : <span key={anexo.id} className="rounded-lg bg-white/5 px-3 py-2 text-zinc-500">{anexo.nome}</span>)}</div>
            </div>}

            {(item.codigoComprovante || item.arquivoFinalUrl) && <div className="mt-3 flex flex-wrap gap-2">
              {item.codigoComprovante && <a href={`/portal-obreiro/solicitacoes/${item.id}/comprovante`} className="rounded-xl bg-emerald-400 px-4 py-2 font-bold text-black">Abrir e imprimir comprovante</a>}
              {item.arquivoFinalUrl && <a href={item.arquivoFinalUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-300/30 px-4 py-2 font-bold text-emerald-200">Baixar documento final</a>}
            </div>}

            <details className="mt-3 rounded-xl border border-white/10 p-3" open={!encerrada(item.status)}>
              <summary className="cursor-pointer font-bold">Ver tramitação e conversa ({item.tramitacoes.length})</summary>
              <ol className="mt-4 space-y-3 border-l border-amber-400/30 pl-4">{item.tramitacoes.map((movimento) => <li key={movimento.id} className="relative">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-amber-300" />
                <div className="flex flex-wrap justify-between gap-2"><b>{movimento.etapa || movimento.statusNovo}</b><span className="text-xs text-zinc-500">{dataHora(movimento.criadoEm)}</span></div>
                <p className="text-zinc-300">{movimento.mensagem}</p>
                <p className="text-xs text-zinc-500">Por: {movimento.autorPerfil || "Sistema"}{movimento.destinatarioPerfil ? ` · para ${movimento.destinatarioPerfil}` : ""}</p>
              </li>)}</ol>
            </details>

            {!["Concluída", "Cancelada"].includes(item.status) && <div className="mt-4 grid gap-3 rounded-xl border border-white/10 p-3">
              <label className="text-zinc-400">Responder, explicar ou complementar
                <textarea rows={3} maxLength={2000} value={mensagens[item.id] ?? ""} onChange={(e) => setMensagens({ ...mensagens, [item.id]: e.target.value })} placeholder="Escreva sua resposta para a Loja…" className={`mt-1 ${campo}`} />
              </label>
              <input type="file" multiple accept={formatosAceitos} onChange={(e) => setArquivosResposta({ ...arquivosResposta, [item.id]: Array.from(e.target.files ?? []) })} className={campo} />
              <button disabled={processando === item.id} onClick={() => void responder(item.id)} className="rounded-xl border border-amber-300/30 px-4 py-2 font-bold text-amber-100 disabled:opacity-50">{processando === item.id ? "Enviando…" : "Enviar mensagem e anexos"}</button>
            </div>}
          </article>;
        }) : <EmptyState title="Nenhuma solicitação enviada" description="Use o formulário acima para iniciar um pedido." />}
      </div>
    </section>
  </div>;
}
