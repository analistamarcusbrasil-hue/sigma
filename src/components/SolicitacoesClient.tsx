"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listarSolicitacoesAdministrativas, type SolicitacaoPortal } from "@/lib/supabase/portal";
import {
  movimentarSolicitacao,
  registrarAnexoGestao,
  responderSolicitacaoGestao,
} from "@/app/solicitacoes/actions";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/Feedback";

const statuses = [
  "Pendente",
  "Em análise",
  "Aguardando complementação",
  "Aguardando aprovação do Venerável",
  "Aprovada",
  "Recusada",
  "Concluída",
] as const;
const finalizada = (status: string) => ["Aprovada", "Recusada", "Concluída", "Cancelada"].includes(status);
const dataHora = (valor: string) => valor ? new Date(valor).toLocaleString("pt-BR") : "—";
const dataCurta = (valor: string) => valor ? valor.slice(0, 10).split("-").reverse().join("/") : "—";
const diasAte = (valor: string) => valor ? Math.ceil((new Date(valor).getTime() - Date.now()) / 86400000) : 0;
const formatosAceitos = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";
const campo = "mt-1 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-white";

function Prazo({ item }: { item: SolicitacaoPortal }) {
  if (!item.prazoEm) return <span className="text-zinc-400">Sem prazo</span>;
  const dias = diasAte(item.prazoEm);
  if (finalizada(item.status)) return <span className="text-emerald-200">Decisão final registrada</span>;
  if (dias < 0) return <span className="font-bold text-red-300">{Math.abs(dias)} dia(s) em atraso</span>;
  if (dias <= 1) return <span className="font-bold text-amber-200">Vence {dias === 0 ? "hoje" : "amanhã"}</span>;
  return <span className="text-zinc-300">{dias} dias restantes</span>;
}

export function SolicitacoesClient() {
  const supabase = useMemo(() => createClient(), []);
  const [itens, setItens] = useState<SolicitacaoPortal[]>([]);
  const [status, setStatus] = useState("");
  const [area, setArea] = useState("");
  const [prazo, setPrazo] = useState("");
  const [mensagens, setMensagens] = useState<Record<string, string>>({});
  const [pareceres, setPareceres] = useState<Record<string, string>>({});
  const [arquivos, setArquivos] = useState<Record<string, File[]>>({});
  const [categorias, setCategorias] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [processando, setProcessando] = useState("");
  const [load, setLoad] = useState(true);
  const [msg, setMsg] = useState("");
  const [tom, setTom] = useState<"success" | "error">("success");

  async function carregar() {
    setItens(await listarSolicitacoesAdministrativas());
  }

  useEffect(() => {
    carregar().catch((e) => {
      setTom("error");
      setMsg(e instanceof Error ? e.message : "Não foi possível carregar a fila.");
    }).finally(() => setLoad(false));
  }, []);

  const areas = useMemo(() => Array.from(new Set(itens.map((item) => item.areaDestino))).sort(), [itens]);
  const resumo = useMemo(() => ({
    pendentes: itens.filter((item) => item.status === "Pendente").length,
    analise: itens.filter((item) => item.status === "Em análise").length,
    veneravel: itens.filter((item) => item.status === "Aguardando aprovação do Venerável").length,
    complemento: itens.filter((item) => item.status === "Aguardando complementação").length,
    atrasadas: itens.filter((item) => !finalizada(item.status) && item.prazoEm && diasAte(item.prazoEm) < 0).length,
  }), [itens]);

  const lista = itens.filter((item) => {
    const dias = diasAte(item.prazoEm);
    return (!status || item.status === status)
      && (!area || item.areaDestino === area)
      && (!prazo || (prazo === "atrasadas" ? !finalizada(item.status) && dias < 0 : true));
  });

  function validarArquivos(listaArquivos: File[]) {
    for (const arquivo of listaArquivos) {
      if (arquivo.size <= 0 || arquivo.size > 10 * 1024 * 1024) throw new Error(`${arquivo.name}: tamanho máximo de 10 MB.`);
      if (![
        "application/pdf", "image/jpeg", "image/png", "image/webp",
        "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(arquivo.type)) throw new Error(`${arquivo.name}: formato não permitido.`);
    }
  }

  async function enviarArquivos(item: SolicitacaoPortal) {
    const listaArquivos = arquivos[item.id] ?? [];
    if (!listaArquivos.length) return;
    validarArquivos(listaArquivos);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

    for (const arquivo of listaArquivos) {
      const nomeSeguro = arquivo.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
      const caminho = `${item.lojaId}/${user.id}/${item.id}/${crypto.randomUUID()}-${nomeSeguro}`;
      const { error } = await supabase.storage.from("solicitacoes-anexos")
        .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
      if (error) throw new Error(`Falha ao enviar ${arquivo.name}: ${error.message}`);
      try {
        await registrarAnexoGestao({
          id: item.id,
          storagePath: caminho,
          nome: arquivo.name,
          tipo: arquivo.type,
          tamanho: arquivo.size,
          categoria: categorias[item.id] || (item.status === "Aprovada" ? "Documento final" : "Documento complementar"),
        });
      } catch (e) {
        await supabase.storage.from("solicitacoes-anexos").remove([caminho]);
        throw e;
      }
    }
    setArquivos({ ...arquivos, [item.id]: [] });
  }

  async function executar(item: SolicitacaoPortal, acao: string) {
    setProcessando(item.id);
    setMsg("");
    try {
      await enviarArquivos(item);
      const resultado = await movimentarSolicitacao({
        id: item.id,
        acao,
        mensagem: mensagens[item.id] ?? "",
        parecer: pareceres[item.id],
        arquivoFinalUrl: links[item.id] ?? item.arquivoFinalUrl,
      });
      if (!resultado.ok) throw new Error(resultado.erro);
      setMensagens({ ...mensagens, [item.id]: "" });
      await carregar();
      setTom("success");
      const texto = acao === "ENCAMINHAR_VENERAVEL"
        ? "Parecer técnico encaminhado. Somente o Venerável poderá aprovar ou recusar."
        : acao === "APROVAR_FINAL"
          ? "Decisão final aprovada pelo Venerável e efeitos aplicados automaticamente."
          : acao === "RECUSAR_FINAL"
            ? "Decisão final de recusa registrada pelo Venerável."
            : acao === "SOLICITAR_COMPLEMENTO"
              ? "Pedido de complementação enviado ao Obreiro."
              : acao === "CONCLUIR_ENTREGA"
                ? "Entrega concluída e disponibilizada ao Obreiro."
                : "Solicitação assumida para análise técnica.";
      setMsg(texto);
    } catch (e) {
      setTom("error");
      setMsg(e instanceof Error ? e.message : "Não foi possível movimentar a solicitação.");
    } finally {
      setProcessando("");
    }
  }

  async function enviarMensagem(item: SolicitacaoPortal) {
    setProcessando(item.id);
    setMsg("");
    try {
      await enviarArquivos(item);
      const mensagem = (mensagens[item.id] ?? "").trim();
      if (mensagem) await responderSolicitacaoGestao({ id: item.id, mensagem });
      if (!mensagem && !(arquivos[item.id] ?? []).length) throw new Error("Escreva uma mensagem ou selecione um arquivo.");
      setMensagens({ ...mensagens, [item.id]: "" });
      await carregar();
      setTom("success");
      setMsg("Mensagem e documentos registrados. O Obreiro será notificado.");
    } catch (e) {
      setTom("error");
      setMsg(e instanceof Error ? e.message : "Não foi possível enviar a interação.");
    } finally {
      setProcessando("");
    }
  }

  if (load) return <LoadingState />;

  return <div className="mt-5 space-y-4 sm:mt-8 sm:space-y-6">
    <Feedback tone="info">Tesoureiro, Chanceler e Secretário emitem parecer e podem solicitar complementação. A aprovação ou recusa é exclusiva do Venerável Mestre.</Feedback>
    {msg && <Feedback tone={tom}>{msg}</Feedback>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["Pendentes", resumo.pendentes, "text-amber-200"],
        ["Em análise", resumo.analise, "text-sky-200"],
        ["Decisão do Venerável", resumo.veneravel, "text-violet-200"],
        ["Aguardando Obreiro", resumo.complemento, "text-orange-200"],
        ["Em atraso", resumo.atrasadas, "text-red-300"],
      ].map(([titulo, valor, cor]) => <article key={String(titulo)} className="sigma-surface rounded-2xl p-3 sm:p-4">
        <p className="text-xs text-zinc-400 sm:text-sm">{titulo}</p>
        <p className={`mt-1 text-2xl font-black sm:text-3xl ${cor}`}>{valor}</p>
      </article>)}
    </section>

    <section className="sigma-surface grid gap-3 rounded-2xl p-4 md:grid-cols-3">
      <label className="text-sm text-zinc-400">Status
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={campo}>
          <option value="">Todos os status</option>
          {statuses.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="text-sm text-zinc-400">Área responsável
        <select value={area} onChange={(e) => setArea(e.target.value)} className={campo}>
          <option value="">Todas as áreas</option>
          {areas.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="text-sm text-zinc-400">Prazo
        <select value={prazo} onChange={(e) => setPrazo(e.target.value)} className={campo}>
          <option value="">Todos os prazos</option>
          <option value="atrasadas">Somente em atraso</option>
        </select>
      </label>
    </section>

    <section className="space-y-4">
      {lista.length ? lista.map((item) => {
        const perfil = item.perfilVisualizador;
        const veneravel = perfil === "Venerável Mestre";
        const administrador = perfil === "Administrador";
        const tecnico = perfil === item.responsavelTecnicoPerfil;
        const podeAnalisar = tecnico || administrador;
        const encerrado = ["Recusada", "Concluída", "Cancelada"].includes(item.status);
        return <details key={item.id} className="group sigma-surface rounded-2xl p-4 sm:rounded-3xl sm:p-5">
          <summary className="flex cursor-pointer list-none flex-col gap-3 pb-1 marker:content-none sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">{item.protocolo}</p>
              <h2 className="mt-1 text-lg font-black">{item.titulo}</h2>
              <p className="text-sm text-zinc-400">{item.obreiroNome || "Obreiro"} · {item.tipo} · {dataHora(item.criadoEm)}</p>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm sm:block sm:text-right">
              <span className="rounded-full bg-amber-400/10 px-3 py-1 font-bold text-amber-200">{item.status}</span>
              <span className="rounded-xl border border-white/10 px-3 py-2 font-bold group-open:hidden">Ver detalhes</span><span className="hidden rounded-xl border border-white/10 px-3 py-2 font-bold group-open:inline">Recolher</span>
              <p className="hidden sm:mt-2 sm:block"><Prazo item={item} /></p>
            </div>
          </summary>

          <div className="mt-4 border-t border-white/10 pt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Área técnica", item.areaDestino],
              ["Parecer por", item.responsavelTecnicoPerfil],
              ["Etapa atual", item.etapaAtual],
              ["Prazo", dataHora(item.prazoEm)],
            ].map(([rotulo, valor]) => <div key={rotulo} className="rounded-xl border border-white/10 p-3">
              <p className="text-xs text-zinc-500">{rotulo}</p><p className="mt-1 font-semibold">{valor}</p>
            </div>)}
          </div>

          {item.sessoes.length > 0 && <div className="mt-4 rounded-2xl border border-sky-300/25 bg-sky-300/5 p-4 text-sm">
            <p className="font-black text-sky-100">{item.sessoes.length} sessão(ões) para justificar</p>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">{item.sessoes.map((sessao) => <span key={sessao.id}>{dataCurta(sessao.data)} · {sessao.titulo || sessao.tipo}</span>)}</div>
            <p className="mt-2 text-zinc-400">A aprovação final justificará cada sessão, inclusive sem presença prévia. Presenças confirmadas serão preservadas.</p>
          </div>}

          {item.periodoInicio && <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-300/5 p-4 text-sm">
            <p className="font-black text-emerald-100">Período: {dataCurta(item.periodoInicio)} até {dataCurta(item.periodoFim)}</p>
            <p className="mt-1 text-zinc-400">Quando aprovado pelo Venerável, mensalidades pendentes do período serão marcadas como Isento e novas mensalidades também respeitarão a isenção.</p>
          </div>}

          <p className="mt-4 rounded-xl bg-black/20 p-3 text-sm text-zinc-200">{item.descricao}</p>
          {item.parecerTecnico && <p className="mt-3 rounded-xl bg-sky-400/10 p-3 text-sky-100"><b>Parecer técnico:</b> {item.parecerTecnico}</p>}
          {item.decisaoFinal && <p className={`mt-3 rounded-xl p-3 ${item.decisaoFinal === "Aprovada" ? "bg-emerald-400/10 text-emerald-100" : "bg-red-400/10 text-red-100"}`}><b>Decisão final do Venerável:</b> {item.decisaoFinal} · {dataHora(item.decisaoFinalEm)}</p>}

          {item.anexos.length > 0 && <div className="mt-4 rounded-xl border border-white/10 p-3">
            <p className="font-bold">Anexos</p>
            <div className="mt-2 flex flex-wrap gap-2">{item.anexos.map((anexo) => anexo.url
              ? <a key={anexo.id} href={anexo.url} target="_blank" rel="noreferrer" className="rounded-lg bg-white/5 px-3 py-2 text-amber-200 underline">{anexo.nome} · {anexo.categoria}</a>
              : <span key={anexo.id} className="rounded-lg bg-white/5 px-3 py-2 text-zinc-500">{anexo.nome}</span>)}</div>
          </div>}

          <details className="mt-4 rounded-xl border border-white/10 p-4">
            <summary className="cursor-pointer font-bold">Tramitação e conversa ({item.tramitacoes.length})</summary>
            <ol className="mt-4 space-y-3 border-l border-amber-400/30 pl-4">
              {item.tramitacoes.map((movimento) => <li key={movimento.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-amber-300" />
                <div className="flex flex-wrap justify-between gap-2"><b>{movimento.etapa || movimento.statusNovo}</b><span className="text-xs text-zinc-500">{dataHora(movimento.criadoEm)}</span></div>
                <p className="text-zinc-300">{movimento.mensagem}</p>
                <p className="text-xs text-zinc-500">Por: {movimento.autorPerfil || "Sistema"}{movimento.destinatarioPerfil ? ` · para ${movimento.destinatarioPerfil}` : ""}</p>
              </li>)}
            </ol>
          </details>

          {!encerrado && <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label className="text-sm text-zinc-400">Mensagem, análise ou fundamentação
              <textarea rows={5} maxLength={2000} value={mensagens[item.id] ?? ""} onChange={(e) => setMensagens({ ...mensagens, [item.id]: e.target.value })} placeholder="Escreva de forma clara; esta mensagem ficará no histórico e será enviada por e-mail." className={campo} />
            </label>
            <div className="grid gap-3">
              <label className="text-sm text-zinc-400">Parecer técnico
                <select value={pareceres[item.id] ?? ""} onChange={(e) => setPareceres({ ...pareceres, [item.id]: e.target.value })} className={campo}>
                  <option value="">Selecione ao encaminhar</option>
                  <option>Favorável</option>
                  <option>Desfavorável</option>
                </select>
              </label>
              <label className="text-sm text-zinc-400">Categoria do arquivo
                <select value={categorias[item.id] ?? ""} onChange={(e) => setCategorias({ ...categorias, [item.id]: e.target.value })} className={campo}>
                  <option value="">Documento complementar</option>
                  <option>Documento final</option>
                  <option>Parecer técnico</option>
                  <option>Comprovante</option>
                </select>
              </label>
              <input type="file" multiple accept={formatosAceitos} onChange={(e) => setArquivos({ ...arquivos, [item.id]: Array.from(e.target.files ?? []) })} className={campo} />
              <label className="text-sm text-zinc-400">Link HTTPS do documento final (opcional)
                <input type="url" value={links[item.id] ?? item.arquivoFinalUrl} onChange={(e) => setLinks({ ...links, [item.id]: e.target.value })} placeholder="https://..." className={campo} />
              </label>
            </div>
          </div>}

          {!encerrado && <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button disabled={processando === item.id} onClick={() => void enviarMensagem(item)} className="min-h-11 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">Enviar mensagem/anexos</button>

            {podeAnalisar && item.status !== "Aprovada" && <button disabled={processando === item.id || item.status === "Em análise"} onClick={() => void executar(item, "ASSUMIR")} className="rounded-xl border border-sky-300/30 px-4 py-2 text-sm font-bold text-sky-100 disabled:opacity-40">Assumir análise</button>}

            {(podeAnalisar || veneravel) && !["Aprovada", "Recusada"].includes(item.status) && <button disabled={processando === item.id} onClick={() => void executar(item, "SOLICITAR_COMPLEMENTO")} className="rounded-xl border border-orange-300/30 px-4 py-2 text-sm font-bold text-orange-100 disabled:opacity-40">Pedir complementação</button>}

            {podeAnalisar && !item.encaminhadaVeneravelEm && <button disabled={processando === item.id} onClick={() => void executar(item, "ENCAMINHAR_VENERAVEL")} className="rounded-xl bg-violet-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">Emitir parecer e encaminhar ao Venerável</button>}

            {veneravel && item.status === "Aguardando aprovação do Venerável" && <>
              <button disabled={processando === item.id} onClick={() => void executar(item, "RECUSAR_FINAL")} className="rounded-xl border border-red-300/40 px-4 py-2 text-sm font-bold text-red-100 disabled:opacity-40">Recusar — decisão final</button>
              <button disabled={processando === item.id} onClick={() => void executar(item, "APROVAR_FINAL")} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-black disabled:opacity-40">Aprovar — decisão final do Venerável</button>
            </>}

            {podeAnalisar && item.status === "Aprovada" && <button disabled={processando === item.id} onClick={() => void executar(item, "CONCLUIR_ENTREGA")} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black disabled:opacity-40">Concluir entrega ao Obreiro</button>}
          </div>}

          {processando === item.id && <p className="mt-3 text-right text-sm text-amber-200">Processando com segurança…</p>}
        </details>;
      }) : <EmptyState title="Nenhuma solicitação nesta fila" description="Altere os filtros ou aguarde um novo pedido." />}
    </section>
  </div>;
}
