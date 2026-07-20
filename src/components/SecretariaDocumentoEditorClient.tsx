"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { carregarFormularioSecretariaAction, movimentarDocumentoSecretariaAction, salvarDocumentoSecretariaAction } from "@/app/secretaria/documentos/actions";
import { Feedback } from "@/components/ui/Feedback";
import { documentoVazio, gerarTextoOficial, tiposPorCategoria, type CategoriaSecretaria, type DocumentoSecretariaProfissional } from "@/lib/secretaria-documentos";
import { lojaAtivaId } from "@/lib/loja-ativa";

type Opcao = Record<string, unknown>;
type Historico = { acao: string; status_anterior: string; status_novo: string; justificativa: string | null; ocorrido_em: string };
const campo = "w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60";

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><h2 className="text-lg font-bold text-white">{titulo}</h2>{descricao && <p className="mt-1 text-sm text-slate-400">{descricao}</p>}<div className="mt-5">{children}</div></section>;
}

export function SecretariaDocumentoEditorClient({ categoria, documentoId }: { categoria: CategoriaSecretaria; documentoId?: string }) {
  const router = useRouter();
  const [documento, setDocumento] = useState(() => documentoVazio(categoria));
  const [perfil, setPerfil] = useState("");
  const [loja, setLoja] = useState<Opcao | null>(null);
  const [gestoes, setGestoes] = useState<Opcao[]>([]);
  const [sessoes, setSessoes] = useState<Opcao[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [ocupado, setOcupado] = useState(true);
  const [justificativa, setJustificativa] = useState("");
  const base = categoria === "Balaústre" ? "/secretaria/balaustres" : "/secretaria/atas-administrativas";

  const carregar = useCallback(async () => {
    const lojaId = lojaAtivaId();
    if (!lojaId) { setErro("Selecione uma Loja ativa."); setOcupado(false); return; }
    const resposta = await carregarFormularioSecretariaAction({ lojaId, id: documentoId });
    if (!resposta.ok) setErro(resposta.erro);
    else {
      setPerfil(resposta.perfil); setLoja(resposta.loja as Opcao); setGestoes(resposta.gestoes as Opcao[]); setSessoes(resposta.sessoes as Opcao[]); setHistorico(resposta.historico as Historico[]);
      if (resposta.documento) setDocumento(resposta.documento); else setDocumento((atual) => ({ ...atual, lojaId, administracaoId: String((resposta.gestoes as Opcao[]).find((g) => g.status === "Atual")?.id || "") }));
    }
    setOcupado(false);
  }, [documentoId]);
  useEffect(() => { void carregar(); }, [carregar]);

  const podeEditar = documento.status === "Rascunho" && ["Administrador", "Secretário"].includes(perfil);
  const podeAprovar = ["Administrador", "Venerável Mestre"].includes(perfil);
  const gestaoNome = String(gestoes.find((item) => item.id === documento.administracaoId)?.nome || "Gestão vigente");

  function alterar<K extends keyof DocumentoSecretariaProfissional>(chave: K, valor: DocumentoSecretariaProfissional[K]) { setDocumento((atual) => ({ ...atual, [chave]: valor })); }
  function selecionarSessao(id: string) {
    const sessao = sessoes.find((item) => item.id === id);
    setDocumento((atual) => ({ ...atual, sessaoId: id, data: String(sessao?.data || atual.data), grau: String(sessao?.grau || atual.grau), administracaoId: String(sessao?.administracao_id || atual.administracaoId) }));
  }
  function mensagem(texto: string, tipo: "erro" | "sucesso") { setErro(tipo === "erro" ? texto : ""); setSucesso(tipo === "sucesso" ? texto : ""); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function salvar() {
    setOcupado(true); const resposta = await salvarDocumentoSecretariaAction(documento); setOcupado(false);
    if (!resposta.ok) { mensagem(resposta.erro, "erro"); return null; }
    setDocumento((atual) => ({ ...atual, id: resposta.id })); mensagem("Rascunho salvo com segurança.", "sucesso");
    if (!documento.id) router.replace(`${base}/${resposta.id}`);
    return resposta.id;
  }

  async function movimentar(acao: "ENVIAR_REVISAO" | "SOLICITAR_APROVACAO" | "APROVAR" | "ARQUIVAR" | "CANCELAR" | "REABRIR") {
    let id = documento.id;
    if (acao === "ENVIAR_REVISAO") id = await salvar() || undefined;
    if (!id) return;
    setOcupado(true); const resposta = await movimentarDocumentoSecretariaAction({ lojaId: documento.lojaId, id, acao, justificativa }); setOcupado(false);
    if (!resposta.ok) mensagem(resposta.erro, "erro"); else { mensagem("Fluxo atualizado com sucesso.", "sucesso"); setJustificativa(""); await carregar(); }
  }

  if (ocupado && !loja) return <div className="rounded-2xl border border-white/10 p-8 text-slate-400">Carregando documento…</div>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={base} className="text-sm font-semibold text-amber-300">← Voltar à lista</Link><div className="rounded-full border border-white/10 bg-white/[.05] px-4 py-2 text-sm">Status: <strong className="text-amber-300">{documento.status}</strong> · versão {documento.versao}</div></div>
    {erro && <Feedback tone="error">{erro}</Feedback>}{sucesso && <Feedback tone="success">{sucesso}</Feedback>}
    {!podeEditar && documento.id && <Feedback tone="info">Este documento está em modo de leitura. Documentos aprovados somente voltam a ser editáveis após reabertura justificada.</Feedback>}
    <fieldset disabled={!podeEditar || ocupado} className="space-y-5">
      <Secao titulo="Identificação" descricao="Vínculo obrigatório com Loja e Gestão; a Sessão é opcional para Atas administrativas."><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm text-slate-300">Loja<input value={String(loja?.nome || "")} disabled className={campo} /></label>
        <label className="text-sm text-slate-300">Gestão<select value={documento.administracaoId} onChange={(e) => alterar("administracaoId", e.target.value)} className={campo}><option value="">Selecione</option>{gestoes.map((g) => <option key={String(g.id)} value={String(g.id)}>{String(g.nome)}</option>)}</select></label>
        <label className="text-sm text-slate-300">Número<input value={documento.numero} onChange={(e) => alterar("numero", e.target.value)} placeholder="Ex.: 012/2026" className={campo} /></label>
        <label className="text-sm text-slate-300">Data<input type="date" value={documento.data} onChange={(e) => alterar("data", e.target.value)} className={campo} /></label>
        <label className="text-sm text-slate-300 md:col-span-2">Tipo<select value={documento.tipo} onChange={(e) => alterar("tipo", e.target.value)} className={campo}>{tiposPorCategoria[categoria].map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label>
        <label className="text-sm text-slate-300">Grau<input value={documento.grau} onChange={(e) => alterar("grau", e.target.value)} className={campo} /></label>
        <label className="text-sm text-slate-300">Sessão vinculada<select value={documento.sessaoId} onChange={(e) => selecionarSessao(e.target.value)} className={campo}><option value="">Sem sessão vinculada</option>{sessoes.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.data).split("-").reverse().join("/")} · {String(s.titulo)}</option>)}</select></label>
      </div></Secao>
      <Secao titulo="Horários e cargos"><div className="grid gap-4 sm:grid-cols-3"><label className="text-sm text-slate-300">Início<input type="time" value={documento.horarioInicio} onChange={(e) => alterar("horarioInicio", e.target.value)} className={campo} /></label><label className="text-sm text-slate-300">Abertura no Livro da Lei<input type="time" value={documento.horarioAberturaLivroLei} onChange={(e) => alterar("horarioAberturaLivroLei", e.target.value)} className={campo} /></label><label className="text-sm text-slate-300">Encerramento<input type="time" value={documento.horarioEncerramento} onChange={(e) => alterar("horarioEncerramento", e.target.value)} className={campo} /></label></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([['veneravelMestre','Venerável Mestre'],['primeiroVigilante','1º Vigilante'],['segundoVigilante','2º Vigilante'],['secretario','Secretário'],['orador','Orador'],['tesoureiro','Tesoureiro'],['chanceler','Chanceler']] as const).map(([chave, rotulo]) => <label key={chave} className="text-sm text-slate-300">{rotulo}<input value={documento.cargos[chave]} onChange={(e) => alterar("cargos", { ...documento.cargos, [chave]: e.target.value })} className={campo} /></label>)}</div></Secao>
      <Secao titulo="Conteúdo estruturado" descricao="Esses campos alimentam a geração inicial do texto oficial."><div className="grid gap-4 lg:grid-cols-2">{([['expediente','Expediente'],['ordemDia','Ordem do Dia'],['quartoHora','Quarto de Hora'],['troncoSolidariedade','Tronco de Solidariedade'],['palavraBemOrdem','Palavra ao Bem da Ordem'],['visitantes','Visitantes'],['encerramento','Encerramento'],['anotacoesBrutas','Anotações brutas']] as const).map(([chave, rotulo]) => <label key={chave} className="text-sm text-slate-300">{rotulo}<textarea value={documento[chave]} onChange={(e) => alterar(chave, e.target.value)} className={`${campo} min-h-28`} /></label>)}</div></Secao>
      <Secao titulo="Deliberações" descricao="Registre decisões com responsável e prazo para integração com o Dashboard."><div className="space-y-3">{documento.deliberacoes.map((item, indice) => <div key={indice} className="grid gap-3 rounded-xl border border-white/10 p-3 md:grid-cols-[2fr_1fr_160px_160px_auto]"><input value={item.descricao} onChange={(e) => alterar("deliberacoes", documento.deliberacoes.map((d, i) => i === indice ? { ...d, descricao: e.target.value } : d))} placeholder="Deliberação" className={campo} /><input value={item.responsavel} onChange={(e) => alterar("deliberacoes", documento.deliberacoes.map((d, i) => i === indice ? { ...d, responsavel: e.target.value } : d))} placeholder="Responsável" className={campo} /><input type="date" value={item.prazo} onChange={(e) => alterar("deliberacoes", documento.deliberacoes.map((d, i) => i === indice ? { ...d, prazo: e.target.value } : d))} className={campo} /><select value={item.status} onChange={(e) => alterar("deliberacoes", documento.deliberacoes.map((d, i) => i === indice ? { ...d, status: e.target.value as typeof d.status } : d))} className={campo}><option>Pendente</option><option>Em andamento</option><option>Concluída</option><option>Cancelada</option></select><button type="button" onClick={() => alterar("deliberacoes", documento.deliberacoes.filter((_, i) => i !== indice))} className="rounded-lg border border-red-400/30 px-3 text-red-300">×</button></div>)}<button type="button" onClick={() => alterar("deliberacoes", [...documento.deliberacoes, { descricao: "", responsavel: "", prazo: "", status: "Pendente" }])} className="rounded-xl border border-amber-400/30 px-4 py-3 font-semibold text-amber-300">+ Adicionar deliberação</button></div></Secao>
      <Secao titulo="Integrações e assinaturas"><div className="grid gap-3 sm:grid-cols-3">{([['temFinanceiro','Há prestação de contas / Tesoureiro assina'],['temPresenca','Há presença / Chanceler assina'],['oradorAplicavel','Orador aplicável']] as const).map(([chave, rotulo]) => <label key={chave} className="flex items-center gap-3 rounded-xl border border-white/10 p-4 text-sm text-slate-300"><input type="checkbox" checked={documento[chave]} onChange={(e) => alterar(chave, e.target.checked)} className="h-5 w-5 accent-amber-400" />{rotulo}</label>)}</div></Secao>
      <Secao titulo="Texto oficial" descricao="Gere uma minuta a partir dos campos e depois revise livremente antes de enviar."><button type="button" onClick={() => alterar("textoOficial", gerarTextoOficial(documento, String(loja?.nome || ""), gestaoNome))} className="mb-3 rounded-xl border border-sky-400/30 px-4 py-2 font-semibold text-sky-300">Gerar texto oficial</button><textarea value={documento.textoOficial} onChange={(e) => alterar("textoOficial", e.target.value)} className={`${campo} min-h-96 font-serif leading-7`} /></Secao>
    </fieldset>
    <section className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      {podeEditar && <button type="button" disabled={ocupado} onClick={() => void salvar()} className="rounded-xl bg-slate-700 px-5 py-3 font-bold text-white">Salvar rascunho</button>}
      {podeEditar && <button type="button" disabled={ocupado} onClick={() => void movimentar("ENVIAR_REVISAO")} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-black">Enviar para revisão</button>}
      {documento.status === "Em revisão" && podeAprovar && <button type="button" onClick={() => void movimentar("SOLICITAR_APROVACAO")} className="rounded-xl bg-sky-400 px-5 py-3 font-bold text-black">Revisado · solicitar aprovação</button>}
      {documento.status === "Aguardando aprovação" && podeAprovar && <button type="button" onClick={() => void movimentar("APROVAR")} className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-black">Aprovar e bloquear</button>}
      {documento.status === "Aprovado" && <a href={documento.pdfUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-black">Gerar / baixar PDF</a>}
      {documento.status === "Aprovado" && podeAprovar && <button type="button" onClick={() => void movimentar("ARQUIVAR")} className="rounded-xl border border-violet-400/40 px-5 py-3 font-bold text-violet-300">Arquivar</button>}
    </section>
    {["Aprovado", "Arquivado"].includes(documento.status) && podeAprovar && <Secao titulo="Reabertura controlada" descricao="A justificativa fica registrada na trilha de auditoria e cria uma nova versão editável."><div className="flex flex-col gap-3 sm:flex-row"><textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Justificativa obrigatória (mínimo 10 caracteres)" className={`${campo} min-h-24 flex-1`} /><button type="button" onClick={() => void movimentar("REABRIR")} className="rounded-xl border border-red-400/40 px-5 py-3 font-bold text-red-300">Reabrir documento</button></div></Secao>}
    {historico.length > 0 && <Secao titulo="Tramitação"><ol className="space-y-3">{historico.map((item, indice) => <li key={`${item.ocorrido_em}-${indice}`} className="rounded-xl border border-white/10 p-3 text-sm"><strong className="text-white">{item.status_anterior} → {item.status_novo}</strong><span className="ml-2 text-slate-500">{new Date(item.ocorrido_em).toLocaleString("pt-BR")}</span>{item.justificativa && <p className="mt-1 text-slate-300">{item.justificativa}</p>}</li>)}</ol></Secao>}
  </div>;
}
