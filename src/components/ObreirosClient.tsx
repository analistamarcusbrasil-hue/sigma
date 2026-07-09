"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { obreirosBase } from "@/lib/mock-data";
import type { Obreiro } from "@/types";

const obreiroVazio: Obreiro = {
  id: "",
  nome: "",
  grau: "Aprendiz Maçom",
  cargo: "",
  telefone: "",
  email: "",
  situacao: "Ativo",
};

function gerarId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

export function ObreirosClient() {
  const [obreiros, setObreiros] = useState<Obreiro[]>(obreirosBase);
  const [formulario, setFormulario] = useState<Obreiro>(obreiroVazio);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const dadosSalvos = localStorage.getItem("sigma_obreiros");

    if (dadosSalvos) {
      setObreiros(JSON.parse(dadosSalvos));
    }

    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) {
      localStorage.setItem("sigma_obreiros", JSON.stringify(obreiros));
    }
  }, [obreiros, carregado]);

  const obreirosOrdenados = useMemo(() => {
    return [...obreiros].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [obreiros]);

  function atualizarCampo(campo: keyof Obreiro, valor: string) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function cadastrarObreiro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!formulario.nome.trim()) {
      alert("Informe o nome do obreiro.");
      return;
    }

    const novoObreiro: Obreiro = {
      ...formulario,
      id: gerarId(),
      nome: formulario.nome.trim(),
    };

    setObreiros((atuais) => [...atuais, novoObreiro]);
    setFormulario(obreiroVazio);
  }

  function removerObreiro(id: string) {
    const confirmar = confirm("Deseja remover este obreiro do cadastro?");

    if (!confirmar) {
      return;
    }

    setObreiros((atuais) => atuais.filter((obreiro) => obreiro.id !== id));
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form
        onSubmit={cadastrarObreiro}
        className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
      >
        <h3 className="text-2xl font-bold">Novo Obreiro</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Cadastre os irmãos uma vez para depois usar na tesouraria, chancelaria e secretaria.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-zinc-300">Nome completo</label>
            <input
              value={formulario.nome}
              onChange={(evento) => atualizarCampo("nome", evento.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Ex: João da Silva"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-zinc-300">Grau</label>
              <select
                value={formulario.grau}
                onChange={(evento) => atualizarCampo("grau", evento.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              >
                <option>Aprendiz Maçom</option>
                <option>Companheiro Maçom</option>
                <option>Mestre Maçom</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-300">Situação</label>
              <select
                value={formulario.situacao}
                onChange={(evento) => atualizarCampo("situacao", evento.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              >
                <option>Ativo</option>
                <option>Afastado</option>
                <option>Irregular</option>
                <option>Licenciado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-300">Cargo atual</label>
            <input
              value={formulario.cargo}
              onChange={(evento) => atualizarCampo("cargo", evento.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Ex: Secretário, Tesoureiro, Chanceler..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-zinc-300">Telefone</label>
              <input
                value={formulario.telefone}
                onChange={(evento) => atualizarCampo("telefone", evento.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                placeholder="(96) 99999-9999"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-300">E-mail</label>
              <input
                value={formulario.email}
                onChange={(evento) => atualizarCampo("email", evento.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300"
          >
            Cadastrar obreiro
          </button>
        </div>
      </form>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-bold">Cadastro Geral</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Total de obreiros cadastrados: {obreiros.length}
            </p>
          </div>

          <span className="w-fit rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-300">
            Ordem alfabética
          </span>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white/[0.06] text-zinc-300">
              <tr>
                <th className="px-5 py-4">Nome</th>
                <th className="px-5 py-4">Grau</th>
                <th className="px-5 py-4">Cargo</th>
                <th className="px-5 py-4">Situação</th>
                <th className="px-5 py-4">Ação</th>
              </tr>
            </thead>

            <tbody>
              {obreirosOrdenados.map((obreiro) => (
                <tr
                  key={obreiro.id}
                  className="border-t border-white/10 transition hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{obreiro.nome}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {obreiro.telefone || "Sem telefone"} | {obreiro.email || "Sem e-mail"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-zinc-300">{obreiro.grau}</td>
                  <td className="px-5 py-4 text-zinc-300">{obreiro.cargo || "Sem cargo"}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      {obreiro.situacao}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => removerObreiro(obreiro.id)}
                      className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
