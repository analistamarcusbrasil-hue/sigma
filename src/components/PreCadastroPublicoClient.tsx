"use client";

import { useState } from "react";
import { grausPreCadastro, situacoesPreCadastro } from "@/lib/pre-cadastro-validacao";
import type { LojaPublicaPreCadastro } from "@/lib/pre-cadastro-server";

const campo = "mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-amber-300";
const vazio = { lojaId: "", nomeCompleto: "", nomePreferido: "", email: "", telefone: "", cpf: "", dataNascimento: "", cim: "", grau: "", situacao: "", lojaOrigem: "", oriente: "", potencia: "", cargoFuncao: "", observacoes: "", veracidade: false, consentimento: false, website: "" };
type Confirmacao = { protocolo: string; nome: string; loja: string; criadoEm: string };

function Bloco({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return <fieldset className="rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-6"><legend className="px-2 font-black text-amber-200"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-sm text-black">{numero}</span>{titulo}</legend><div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div></fieldset>;
}
function Campo({ label, obrigatorio, children }: { label: string; obrigatorio?: boolean; children: React.ReactNode }) { return <label className="text-sm text-zinc-300"><span className="font-semibold">{label}{obrigatorio && <span className="text-amber-300"> *</span>}</span>{children}</label>; }

export function PreCadastroPublicoClient({ lojas, erroInicial }: { lojas: LojaPublicaPreCadastro[]; erroInicial: string }) {
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState(erroInicial);
  const [enviando, setEnviando] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const alterar = (campo: keyof typeof form, valor: string | boolean) => setForm((atual) => ({ ...atual, [campo]: valor }));

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setErro("");
    if (!form.veracidade || !form.consentimento) return setErro("Confirme a veracidade e o consentimento para enviar.");
    setEnviando(true);
    try {
      const resposta = await fetch("/api/pre-cadastros", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, consentimento: form.veracidade && form.consentimento }) });
      const resultado = await resposta.json() as { ok: boolean; erro?: string } & Confirmacao;
      if (!resposta.ok || !resultado.ok) throw new Error(resultado.erro || "Não foi possível enviar o pré-cadastro.");
      setConfirmacao(resultado);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível enviar o pré-cadastro."); }
    finally { setEnviando(false); }
  }

  if (confirmacao) return <section className="mt-6 rounded-3xl border border-emerald-300/30 bg-emerald-300/[.07] p-6 sm:p-8" role="status">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400 text-2xl font-black text-black">✓</span>
    <h2 className="mt-4 text-2xl font-black">Pré-cadastro enviado com sucesso.</h2>
    <p className="mt-3 leading-7 text-zinc-300">Seus dados foram enviados para avaliação da Administração da Loja selecionada. O envio não garante acesso automático ao SIGMA. Aguarde contato da Administração.</p>
    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl border border-white/10 p-3"><dt className="text-zinc-500">Nome</dt><dd className="mt-1 font-bold">{confirmacao.nome}</dd></div><div className="rounded-xl border border-white/10 p-3"><dt className="text-zinc-500">Loja</dt><dd className="mt-1 font-bold">{confirmacao.loja}</dd></div><div className="rounded-xl border border-white/10 p-3"><dt className="text-zinc-500">Enviado em</dt><dd className="mt-1 font-bold">{new Date(confirmacao.criadoEm).toLocaleString("pt-BR")}</dd></div><div className="rounded-xl border border-white/10 p-3"><dt className="text-zinc-500">Protocolo</dt><dd className="mt-1 font-mono font-bold text-amber-200">{confirmacao.protocolo}</dd></div></dl>
    <button type="button" onClick={() => { setForm(vazio); setConfirmacao(null); }} className="mt-6 min-h-12 rounded-xl border border-white/15 px-5 py-3 font-bold">Enviar outro pré-cadastro</button>
  </section>;

  return <form onSubmit={(e) => void enviar(e)} className="mt-6 space-y-5" aria-busy={enviando}>
    {erro && <div role="alert" className="rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-red-100">{erro}</div>}
    <Bloco numero={1} titulo="Escolha sua Loja"><Campo label="Loja desejada" obrigatorio><select required value={form.lojaId} onChange={(e) => alterar("lojaId", e.target.value)} className={campo} disabled={!lojas.length || enviando}><option value="">Selecione uma Loja</option>{lojas.map((loja) => <option key={loja.id} value={loja.id}>{loja.numero ? `${loja.nome} nº ${loja.numero}` : loja.nome}</option>)}</select></Campo><p className="self-end rounded-xl bg-sky-400/10 p-3 text-sm text-sky-100">Somente o nome e o número de Lojas ativas são exibidos.</p></Bloco>
    <Bloco numero={2} titulo="Dados pessoais básicos"><Campo label="Nome completo" obrigatorio><input required minLength={3} maxLength={160} autoComplete="name" value={form.nomeCompleto} onChange={(e) => alterar("nomeCompleto", e.target.value)} className={campo} /></Campo><Campo label="Nome preferido"><input maxLength={80} value={form.nomePreferido} onChange={(e) => alterar("nomePreferido", e.target.value)} className={campo} /></Campo><Campo label="CPF"><input inputMode="numeric" maxLength={14} value={form.cpf} onChange={(e) => alterar("cpf", e.target.value)} className={campo} placeholder="Somente para conferência, se desejar" /></Campo><Campo label="Data de nascimento"><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.dataNascimento} onChange={(e) => alterar("dataNascimento", e.target.value)} className={campo} /></Campo></Bloco>
    <Bloco numero={3} titulo="Dados maçônicos"><Campo label="CIM maçônico" obrigatorio><input required minLength={2} maxLength={40} value={form.cim} onChange={(e) => alterar("cim", e.target.value)} className={campo} /></Campo><Campo label="Grau maçônico" obrigatorio><select required value={form.grau} onChange={(e) => alterar("grau", e.target.value)} className={campo}><option value="">Selecione</option>{grausPreCadastro.map((item) => <option key={item}>{item}</option>)}</select></Campo><Campo label="Situação atual" obrigatorio><select required value={form.situacao} onChange={(e) => alterar("situacao", e.target.value)} className={campo}><option value="">Selecione</option>{situacoesPreCadastro.map((item) => <option key={item}>{item}</option>)}</select></Campo><Campo label="Loja de origem"><input maxLength={160} value={form.lojaOrigem} onChange={(e) => alterar("lojaOrigem", e.target.value)} className={campo} /></Campo><Campo label="Oriente"><input maxLength={120} value={form.oriente} onChange={(e) => alterar("oriente", e.target.value)} className={campo} /></Campo><Campo label="Potência"><input maxLength={120} value={form.potencia} onChange={(e) => alterar("potencia", e.target.value)} className={campo} /></Campo><Campo label="Cargo ou função"><input maxLength={120} value={form.cargoFuncao} onChange={(e) => alterar("cargoFuncao", e.target.value)} className={campo} /></Campo></Bloco>
    <Bloco numero={4} titulo="Contato e observações"><Campo label="E-mail" obrigatorio><input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(e) => alterar("email", e.target.value)} className={campo} /></Campo><Campo label="Telefone/WhatsApp com DDD" obrigatorio><input required type="tel" minLength={10} maxLength={30} autoComplete="tel" value={form.telefone} onChange={(e) => alterar("telefone", e.target.value)} className={campo} /></Campo><label className="text-sm text-zinc-300 sm:col-span-2"><span className="font-semibold">Observações</span><textarea rows={4} maxLength={1500} value={form.observacoes} onChange={(e) => alterar("observacoes", e.target.value)} className={campo} /></label></Bloco>
    <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => alterar("website", e.target.value)} /></label></div>
    <Bloco numero={5} titulo="Declaração e envio"><label className="flex items-start gap-3 rounded-xl border border-white/10 p-4 text-sm sm:col-span-2"><input required type="checkbox" checked={form.veracidade} onChange={(e) => alterar("veracidade", e.target.checked)} className="mt-1 h-5 w-5 accent-amber-400" /><span>Declaro que as informações prestadas são verdadeiras.</span></label><label className="flex items-start gap-3 rounded-xl border border-white/10 p-4 text-sm sm:col-span-2"><input required type="checkbox" checked={form.consentimento} onChange={(e) => alterar("consentimento", e.target.checked)} className="mt-1 h-5 w-5 accent-amber-400" /><span>Autorizo a Administração da Loja selecionada a avaliar meus dados para fins de cadastro no SIGMA.</span></label><p className="rounded-xl bg-amber-400/10 p-4 text-sm leading-6 text-amber-100 sm:col-span-2">Este formulário é apenas uma solicitação de pré-cadastro. O acesso ao sistema somente será liberado após análise e aprovação da Administração.</p><button type="submit" disabled={enviando || !lojas.length} className="min-h-12 rounded-xl bg-amber-400 px-6 py-3 font-black text-black disabled:opacity-50 sm:col-span-2 sm:w-fit">{enviando ? "Enviando com segurança…" : "Enviar pré-cadastro"}</button></Bloco>
  </form>;
}
