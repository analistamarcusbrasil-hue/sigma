"use client";

import { useEffect, useState } from "react";
import { Feedback, LoadingState } from "@/components/ui/Feedback";
import { FormField } from "@/components/ui/FormField";
import { repasseDivergente, saldoRepasse } from "@/lib/financeiro";
import { listarGestoes, listarObreiros, listarPrestacoesFinais, listarRepasses, salvarRepasse, type GestaoOperacional, type PrestacaoFinal, type RepasseGestao } from "@/lib/supabase/operacional";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const campo = "w-full rounded-xl border border-white/10 bg-black/25 p-3";

export function RepasseGestaoClient() {
  const [gestao, setGestao] = useState<GestaoOperacional>();
  const [prestacao, setPrestacao] = useState<PrestacaoFinal>();
  const [repasse, setRepasse] = useState<RepasseGestao>();
  const [obreiros, setObreiros] = useState<{ id: string; nome: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    Promise.all([listarGestoes(), listarPrestacoesFinais(), listarRepasses(), listarObreiros()])
      .then(([gestoes, prestacoes, repasses, listaObreiros]) => {
        const atual = gestoes.find((item) => item.status === "Atual" || item.ativa);
        const final = prestacoes.find((item) => item.gestaoId === atual?.id);
        setGestao(atual);
        setPrestacao(final);
        setRepasse(repasses.find((item) => item.gestaoOrigemId === atual?.id) ?? {
          id: "", gestaoOrigemId: atual?.id ?? "", prestacaoFinalId: final?.id ?? "", status: "Em elaboração", dataRepasse: "",
          caixa: final?.caixaFisicoFinal ?? 0, banco: final?.contaBancariaFinal ?? 0, creditos: final?.creditosReceber ?? 0,
          obrigacoes: final?.obrigacoesPagar ?? 0, saldoLiquido: final?.saldoLiquidoRepasse ?? 0, pendenciasFinanceiras: "",
          pendenciasAdministrativas: final?.pendenciasAdministrativas ?? "", documentosPendentes: final?.observacoesComprovantes ?? "",
          observacoes: "", justificativa: "", responsavelRepasseId: "", responsavelRecebimentoId: "", finalizadoEm: "",
        });
        setObreiros(listaObreiros);
      })
      .catch((causa: unknown) => setErro(causa instanceof Error ? causa.message : "Não foi possível carregar o repasse."))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <LoadingState />;
  if (!gestao || !repasse) return <Feedback tone="warning">Não há gestão ativa para repasse.</Feedback>;

  const saldo = saldoRepasse(repasse.caixa, repasse.banco, repasse.creditos, repasse.obrigacoes);
  const divergente = repasseDivergente(saldo, prestacao?.saldoLiquidoRepasse ?? saldo);
  const protegido = repasse.status === "Finalizado";
  const responsavel = obreiros.find((item) => item.id === repasse.responsavelRepasseId)?.nome ?? "Não informado";

  async function salvar(status: string) {
    if (!repasse) return;
    setErro(""); setSucesso("");
    if (status === "Finalizado" && (!repasse.dataRepasse || !repasse.responsavelRepasseId)) return setErro("Informe data e responsável pelo repasse.");
    if (divergente && !repasse.justificativa.trim()) return setErro("Justifique a divergência de valores.");
    setSalvando(true);
    try {
      setRepasse(await salvarRepasse({ ...repasse, status, saldoLiquido: saldo }));
      setSucesso(status === "Finalizado" ? "Repasse finalizado e gestão encerrada com sucesso." : "Repasse salvo com sucesso.");
    } catch (causa: unknown) { setErro(causa instanceof Error ? causa.message : "Erro ao salvar o repasse."); }
    finally { setSalvando(false); }
  }

  async function gerarTermo() {
    if (!gestao || !repasse) return;
    const { jsPDF } = await import("jspdf");
    const documento = new jsPDF();
    const linhas = [
      "SIGMA 2.0 - Termo de Repasse de Gestão", `Gestão de origem: ${gestao.nomeGestao}`,
      `Período: ${gestao.dataInicioGestao} a ${gestao.dataFimGestao}`, `Status: ${repasse.status}`,
      `Data do repasse: ${repasse.dataRepasse || "Não informada"}`, `Responsável pelo repasse: ${responsavel}`,
      `Caixa físico: ${moeda(repasse.caixa)}`, `Conta bancária: ${moeda(repasse.banco)}`, `Créditos: ${moeda(repasse.creditos)}`,
      `Obrigações: ${moeda(repasse.obrigacoes)}`, `Saldo líquido: ${moeda(saldo)}`,
      `Pendências financeiras: ${repasse.pendenciasFinanceiras || "Nenhuma informada"}`,
      `Pendências administrativas: ${repasse.pendenciasAdministrativas || "Nenhuma informada"}`,
      `Documentos pendentes: ${repasse.documentosPendentes || "Nenhum informado"}`,
    ];
    documento.setFontSize(16); documento.text(linhas[0], 14, 18); documento.setFontSize(10);
    linhas.slice(1).forEach((linha, indice) => documento.text(linha.slice(0, 110), 14, 32 + indice * 9));
    documento.setFontSize(8); documento.text("Sistema desenvolvido por Marcus Brasil | Contato: analista.marcusbrasil@gmail.com", 14, 290);
    documento.save(`termo-repasse-${gestao.nomeGestao.replaceAll(" ", "-")}.pdf`);
  }

  return <div className="mt-8 space-y-6">
    {erro && <Feedback tone="error">{erro}</Feedback>}{sucesso && <Feedback tone="success">{sucesso}</Feedback>}
    {prestacao?.status !== "Aprovada" && <Feedback tone="warning">A Prestação Final ainda não foi aprovada.</Feedback>}
    <section className="sigma-surface rounded-3xl p-6"><h2 className="text-2xl font-black">{gestao.nomeGestao}</h2><p className="text-zinc-400">{gestao.dataInicioGestao} a {gestao.dataFimGestao} · {repasse.status}</p><div className="mt-5 grid gap-4 sm:grid-cols-3">{[["Caixa", repasse.caixa], ["Banco", repasse.banco], ["Saldo líquido", saldo]].map(([titulo, valor]) => <div key={String(titulo)} className="rounded-2xl border border-white/10 p-4"><p>{titulo}</p><b className="text-xl text-amber-200">{moeda(Number(valor))}</b></div>)}</div></section>
    <section className="sigma-surface grid gap-4 rounded-3xl p-6 sm:grid-cols-2">
      {([['caixa', 'Caixa físico'], ['banco', 'Conta bancária'], ['creditos', 'Créditos'], ['obrigacoes', 'Obrigações']] as const).map(([chave, label]) => <FormField key={chave} id={`repasse-${chave}`} label={label}><input id={`repasse-${chave}`} disabled={protegido} type="number" min="0" value={repasse[chave]} onChange={(evento) => setRepasse({ ...repasse, [chave]: Number(evento.target.value) })} className={campo} /></FormField>)}
      <FormField id="repasse-data" label="Data do repasse" required><input id="repasse-data" disabled={protegido} type="date" value={repasse.dataRepasse} onChange={(evento) => setRepasse({ ...repasse, dataRepasse: evento.target.value })} className={campo} /></FormField>
      <FormField id="repasse-responsavel" label="Responsável pelo repasse" required><select id="repasse-responsavel" disabled={protegido} value={repasse.responsavelRepasseId} onChange={(evento) => setRepasse({ ...repasse, responsavelRepasseId: evento.target.value })} className={campo}><option value="">Selecione</option>{obreiros.map((obreiro) => <option key={obreiro.id} value={obreiro.id}>{obreiro.nome}</option>)}</select></FormField>
      <FormField id="repasse-pend-fin" label="Pendências financeiras"><textarea id="repasse-pend-fin" disabled={protegido} value={repasse.pendenciasFinanceiras} onChange={(evento) => setRepasse({ ...repasse, pendenciasFinanceiras: evento.target.value })} className={campo} /></FormField>
      <FormField id="repasse-pend-adm" label="Pendências administrativas"><textarea id="repasse-pend-adm" disabled={protegido} value={repasse.pendenciasAdministrativas} onChange={(evento) => setRepasse({ ...repasse, pendenciasAdministrativas: evento.target.value })} className={campo} /></FormField>
      {divergente && <FormField id="repasse-justificativa" label="Justificativa da divergência" required><textarea id="repasse-justificativa" disabled={protegido} value={repasse.justificativa} onChange={(evento) => setRepasse({ ...repasse, justificativa: evento.target.value })} className={campo} /></FormField>}
      <div className="flex flex-wrap justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => void gerarTermo()} className="rounded-xl border border-amber-300/30 p-3 font-bold text-amber-200">Gerar Termo de Repasse</button><button type="button" disabled={protegido || salvando} onClick={() => void salvar("Em elaboração")} className="rounded-xl border p-3">{salvando ? "Salvando…" : "Salvar"}</button><button type="button" disabled={protegido || salvando || prestacao?.status !== "Aprovada"} onClick={() => void salvar("Finalizado")} className="rounded-xl bg-amber-400 p-3 font-bold text-black disabled:opacity-50">Finalizar repasse</button></div>
    </section>
  </div>;
}
