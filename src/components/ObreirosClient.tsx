"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { excluirObreiro, listarObreiros, salvarObreiro } from "@/lib/supabase/operacional";
import type { Obreiro } from "@/types";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/Feedback";
import { StatusBadge } from "@/components/ui/StatusBadge";

const hojeISO = () => new Date().toISOString().slice(0, 10);

function formularioVazio(): Obreiro {
  return {
    id: "",
    nome: "",
    grau: "Aprendiz Maçom",
    cargo: "",
    email: "",
    telefone: "",
    situacao: "Ativo",
    dataCadastro: hojeISO(),
    observacoes: "",
    tipo: "Obreiro da Loja",
    lojaOrigem: "",
  };
}

function formatarData(data: string) {
  if (!data) return "Não informada";
  const [ano, mes, dia] = data.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

const campo =
  "mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10";

export function ObreirosClient() {
  const [obreiros, setObreiros] = useState<Obreiro[]>([]);
  const [formulario, setFormulario] = useState<Obreiro>(formularioVazio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [erroNome, setErroNome] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState<"Todos" | "Ativo" | "Inativo">("Todos");

  useEffect(() => {
    listarObreiros()
      .then(setObreiros)
      .catch((erro: unknown) => setMensagemErro(erro instanceof Error ? erro.message : "Não foi possível carregar os obreiros."))
      .finally(() => setCarregando(false));
  }, []);

  const obreirosOrdenados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return [...obreiros]
      .filter((item) => filtroSituacao === "Todos" || item.situacao === filtroSituacao)
      .filter((item) => {
        if (!termo) return true;
        return [item.nome, item.cargo, item.grau, item.email, item.telefone]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(termo);
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [obreiros, busca, filtroSituacao]);

  const totais = useMemo(
    () => ({
      ativos: obreiros.filter((item) => item.situacao === "Ativo").length,
      inativos: obreiros.filter((item) => item.situacao === "Inativo").length,
    }),
    [obreiros],
  );

  function atualizarCampo(campoNome: keyof Obreiro, valor: string) {
    setFormulario((atual) => ({ ...atual, [campoNome]: valor }));
    if (campoNome === "nome" && valor.trim()) setErroNome("");
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nome = formulario.nome.trim();
    if (!nome) {
      setErroNome("Informe o nome completo do obreiro.");
      return;
    }

    setMensagemErro("");
    setSalvando(true);
    try {
      const salvo = await salvarObreiro({ ...formulario, id: editandoId ?? "", nome });
      setObreiros((atuais) => editandoId ? atuais.map((item) => item.id === editandoId ? salvo : item) : [...atuais, salvo]);
      cancelarEdicao();
    } catch (erro) {
      setMensagemErro(erro instanceof Error ? erro.message : "Não foi possível salvar o obreiro.");
    } finally {
      setSalvando(false);
    }
  }

  function editar(obreiro: Obreiro) {
    setFormulario({ ...obreiro });
    setEditandoId(obreiro.id);
    setErroNome("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicao() {
    setFormulario(formularioVazio());
    setEditandoId(null);
    setErroNome("");
  }

  async function alternarSituacao(id: string) {
    const atual = obreiros.find((item) => item.id === id);
    if (!atual) return;
    try {
      const salvo = await salvarObreiro({ ...atual, situacao: atual.situacao === "Ativo" ? "Inativo" : "Ativo" });
      setObreiros((itens) => itens.map((item) => item.id === id ? salvo : item));
    } catch (erro) {
      setMensagemErro(erro instanceof Error ? erro.message : "Não foi possível alterar a situação.");
    }
  }

  async function excluir(obreiro: Obreiro) {
    if (!confirm(`Excluir definitivamente o cadastro de ${obreiro.nome}?`)) return;
    try {
      await excluirObreiro(obreiro.id);
      setObreiros((atuais) => atuais.filter((item) => item.id !== obreiro.id));
      if (editandoId === obreiro.id) cancelarEdicao();
    } catch (erro) {
      setMensagemErro(erro instanceof Error ? `${erro.message} Inative o cadastro se houver histórico vinculado.` : "Não foi possível excluir o obreiro.");
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {mensagemErro && <Feedback tone="error">{mensagemErro}</Feedback>}
      {carregando && <LoadingState label="Carregando obreiros…" />}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total cadastrado", obreiros.length, "text-white"],
          ["Obreiros ativos", totais.ativos, "text-emerald-300"],
          ["Obreiros inativos", totais.inativos, "text-zinc-300"],
        ].map(([rotulo, valor, cor]) => (
          <div key={String(rotulo)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-zinc-400">{rotulo}</p>
            <p className={`mt-2 text-3xl font-bold ${cor}`}>{valor}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={salvar} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 xl:sticky xl:top-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Cadastro único</p>
              <h3 className="mt-2 text-2xl font-bold">{editandoId ? "Editar obreiro" : "Novo obreiro"}</h3>
            </div>
            {editandoId && <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300">Editando</span>}
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="nome" className="text-sm text-zinc-300">Nome completo <span className="text-amber-300">*</span></label>
              <input id="nome" value={formulario.nome} onChange={(e) => atualizarCampo("nome", e.target.value)} className={`${campo} ${erroNome ? "border-red-400" : ""}`} placeholder="Ex.: João da Silva" aria-invalid={Boolean(erroNome)} />
              {erroNome && <p className="mt-2 text-xs text-red-300">{erroNome}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="grau" className="text-sm text-zinc-300">Grau</label>
                <select id="grau" value={formulario.grau} onChange={(e) => atualizarCampo("grau", e.target.value)} className={campo}>
                  <option>Aprendiz Maçom</option><option>Companheiro Maçom</option><option>Mestre Maçom</option>
                </select>
              </div>
              <div>
                <label htmlFor="situacao" className="text-sm text-zinc-300">Situação</label>
                <select id="situacao" value={formulario.situacao} onChange={(e) => atualizarCampo("situacao", e.target.value)} className={campo}>
                  <option value="Ativo">Ativo</option><option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div><label htmlFor="cargo" className="text-sm text-zinc-300">Cargo atual</label><input id="cargo" value={formulario.cargo} onChange={(e) => atualizarCampo("cargo", e.target.value)} className={campo} placeholder="Ex.: Secretário, Tesoureiro..." /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="telefone" className="text-sm text-zinc-300">Telefone</label><input id="telefone" type="tel" value={formulario.telefone} onChange={(e) => atualizarCampo("telefone", e.target.value)} className={campo} placeholder="(96) 99999-9999" /></div>
              <div><label htmlFor="email" className="text-sm text-zinc-300">E-mail</label><input id="email" type="email" value={formulario.email} onChange={(e) => atualizarCampo("email", e.target.value)} className={campo} placeholder="email@exemplo.com" /></div>
            </div>
            <div><label htmlFor="dataCadastro" className="text-sm text-zinc-300">Data do cadastro</label><input id="dataCadastro" type="date" value={formulario.dataCadastro} onChange={(e) => atualizarCampo("dataCadastro", e.target.value)} className={campo} /></div>
            <div><label htmlFor="observacoes" className="text-sm text-zinc-300">Observações</label><textarea id="observacoes" rows={3} value={formulario.observacoes} onChange={(e) => atualizarCampo("observacoes", e.target.value)} className={`${campo} resize-none`} placeholder="Informações complementares..." /></div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={salvando} className="flex-1 rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300 disabled:cursor-wait">{salvando ? "Salvando…" : editandoId ? "Salvar alterações" : "Cadastrar obreiro"}</button>
              {editandoId && <button type="button" onClick={cancelarEdicao} className="rounded-full border border-white/15 px-6 py-3 font-semibold text-zinc-200 transition hover:bg-white/[0.06]">Cancelar</button>}
            </div>
          </div>
        </form>

        <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-2xl font-bold">Cadastro geral</h3><p className="mt-2 text-sm text-zinc-400">Base compartilhada com Chancelaria e Tesouraria.</p></div>
            <span className="w-fit rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-300">Ordem alfabética</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_10rem]">
            <label className="relative">
              <span className="sr-only">Buscar obreiro</span>
              <input
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400"
                placeholder="Buscar por nome, cargo, grau..."
              />
            </label>
            <label>
              <span className="sr-only">Filtrar por situação</span>
              <select
                value={filtroSituacao}
                onChange={(evento) => setFiltroSituacao(evento.target.value as "Todos" | "Ativo" | "Inativo")}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400"
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativos</option>
                <option value="Inativo">Inativos</option>
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Exibindo {obreirosOrdenados.length} de {obreiros.length} cadastro(s)
          </p>

          <div className="mt-6 space-y-3">
            {!carregando && obreirosOrdenados.length === 0 && <EmptyState title={busca || filtroSituacao !== "Todos" ? "Nenhum resultado encontrado" : "Nenhum obreiro cadastrado"} description={busca || filtroSituacao !== "Todos" ? "Revise a pesquisa ou remova os filtros para visualizar outros cadastros." : "Cadastre o primeiro obreiro para começar a utilizar Chancelaria, Tesouraria e Secretaria."} />}
            {obreirosOrdenados.map((obreiro) => (
              <article key={obreiro.id} className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-white/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-lg font-bold text-white">{obreiro.nome}</h4>
                      <StatusBadge status={obreiro.situacao} />
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">{obreiro.grau} · {obreiro.cargo || "Sem cargo informado"}</p>
                    <p className="mt-2 break-words text-xs text-zinc-500">{obreiro.telefone || "Sem telefone"} · {obreiro.email || "Sem e-mail"} · Cadastro em {formatarData(obreiro.dataCadastro)}</p>
                    {obreiro.observacoes && <p className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-zinc-400">{obreiro.observacoes}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" onClick={() => editar(obreiro)} className="rounded-full border border-sky-400/30 px-3 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-400/10">Editar</button>
                    <button type="button" onClick={() => alternarSituacao(obreiro.id)} className="rounded-full border border-amber-400/30 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/10">{obreiro.situacao === "Ativo" ? "Inativar" : "Reativar"}</button>
                    <button type="button" onClick={() => excluir(obreiro)} className="rounded-full border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/10">Excluir</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
