"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ativarGestaoBanco, excluirGestaoBanco, listarGestoes, salvarGestaoBanco, type GestaoOperacional } from "@/lib/supabase/operacional";

type CargosGestao = {
  veneravelMestre: string;
  primeiroVigilante: string;
  segundoVigilante: string;
  orador: string;
  secretario: string;
  tesoureiro: string;
  chanceler: string;
  mestreCerimonias: string;
};

type GestaoLoja = Omit<GestaoOperacional, "cargos"> & { cargos: CargosGestao };

const cargosVazios: CargosGestao = {
  veneravelMestre: "",
  primeiroVigilante: "",
  segundoVigilante: "",
  orador: "",
  secretario: "",
  tesoureiro: "",
  chanceler: "",
  mestreCerimonias: "",
};

const gestaoVazia: GestaoLoja = {
  id: "",
  nomeGestao: "",
  gestaoAnteriorRepasse: "",
  dataInicioGestao: "",
  dataFimGestao: "",
  anoTrabalho: new Date().getFullYear(),
  financeiroPositivoRecebido: 0,
  financeiroNegativoRecebido: 0,
  observacaoRepasse: "",
  cargos: cargosVazios,
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataBR(dataISO: string) {
  if (!dataISO) return "Não informado";
  const partes = dataISO.split("-");
  if (partes.length !== 3) return dataISO;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function saldoLiquido(gestao: GestaoLoja) {
  return gestao.financeiroPositivoRecebido - gestao.financeiroNegativoRecebido;
}

export function ConfiguracoesGestaoClient() {
  const [gestoes, setGestoes] = useState<GestaoLoja[]>([]);
  const [gestaoAtualId, setGestaoAtualId] = useState("");
  const [formulario, setFormulario] = useState<GestaoLoja>(gestaoVazia);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    listarGestoes()
      .then((itens) => {
        const normalizadas = itens.map((item) => ({ ...item, cargos: { ...cargosVazios, ...item.cargos } })) as GestaoLoja[];
        setGestoes(normalizadas);
        setGestaoAtualId(normalizadas.find((item) => item.ativa)?.id ?? "");
      })
      .catch((falha: unknown) => setErro(falha instanceof Error ? falha.message : "Não foi possível carregar as gestões."))
      .finally(() => setCarregado(true));
  }, []);

  const gestaoAtual = useMemo(() => {
    return gestoes.find((gestao) => gestao.id === gestaoAtualId);
  }, [gestoes, gestaoAtualId]);

  async function aplicarGestaoAtual(gestao: GestaoLoja) {
    setErro("");
    try {
      await ativarGestaoBanco(gestao.id);
      setGestaoAtualId(gestao.id);
      setGestoes((atuais) => atuais.map((item) => ({ ...item, ativa: item.id === gestao.id })));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível ativar a gestão.");
    }
  }

  async function salvarGestao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!formulario.nomeGestao.trim()) {
      alert("Informe o nome da gestão.");
      return;
    }

    if (!formulario.gestaoAnteriorRepasse.trim()) {
      alert("Informe qual gestão fez o repasse.");
      return;
    }

    if (!formulario.dataInicioGestao) {
      alert("Informe a data de início da gestão.");
      return;
    }

    if (!formulario.anoTrabalho || formulario.anoTrabalho < 2000) {
      alert("Informe um ano de trabalho válido.");
      return;
    }

    const gestaoParaSalvar: GestaoLoja = {
      ...formulario,
      id: formulario.id,
      nomeGestao: formulario.nomeGestao.trim(),
      gestaoAnteriorRepasse: formulario.gestaoAnteriorRepasse.trim(),
      observacaoRepasse: formulario.observacaoRepasse.trim(),
      cargos: {
        ...formulario.cargos,
      },
    };

    let salva: GestaoLoja;
    try {
      salva = await salvarGestaoBanco({ ...gestaoParaSalvar, ativa: true }) as GestaoLoja;
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar a gestão.");
      return;
    }

    setGestoes((atuais) => {
      const jaExiste = atuais.some((gestao) => gestao.id === salva.id);

      if (jaExiste) {
        return atuais.map((gestao) =>
          gestao.id === salva.id ? salva : { ...gestao, ativa: false }
        );
      }

      return [salva, ...atuais.map((gestao) => ({ ...gestao, ativa: false }))];
    });

    setGestaoAtualId(salva.id);
    setFormulario(gestaoVazia);

    alert("Gestão salva e definida como gestão atual.");
  }

  function editarGestao(gestao: GestaoLoja) {
    setFormulario({
      ...gestao,
      cargos: {
        ...cargosVazios,
        ...gestao.cargos,
      },
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removerGestao(id: string) {
    const confirmar = confirm("Deseja remover esta gestão?");
    if (!confirmar) return;

    try {
      await excluirGestaoBanco(id);
      setGestoes((atuais) => atuais.filter((gestao) => gestao.id !== id));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível remover a gestão.");
      return;
    }

    if (gestaoAtualId === id) {
      setGestaoAtualId("");
    }
  }

  function atualizarCargo(cargo: keyof CargosGestao, valor: string) {
    setFormulario((atual) => ({
      ...atual,
      cargos: {
        ...atual.cargos,
        [cargo]: valor,
      },
    }));
  }

  if (!carregado) {
    return (
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
        Carregando cadastro de gestão...
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {erro && <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{erro}</div>}
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Cadastro de Gestão</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Cadastre a gestão atual, sua diretoria, o período de trabalho e o repasse financeiro recebido da gestão anterior.
        </p>

        <form onSubmit={salvarGestao} className="mt-6 space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={formulario.nomeGestao}
              onChange={(evento) =>
                setFormulario((atual) => ({ ...atual, nomeGestao: evento.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Nome da gestão atual"
            />

            <input
              value={formulario.gestaoAnteriorRepasse}
              onChange={(evento) =>
                setFormulario((atual) => ({
                  ...atual,
                  gestaoAnteriorRepasse: evento.target.value,
                }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Gestão anterior que fez o repasse"
            />

            <input
              type="date"
              value={formulario.dataInicioGestao}
              onChange={(evento) =>
                setFormulario((atual) => ({
                  ...atual,
                  dataInicioGestao: evento.target.value,
                }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            />

            <input
              type="date"
              value={formulario.dataFimGestao}
              onChange={(evento) =>
                setFormulario((atual) => ({
                  ...atual,
                  dataFimGestao: evento.target.value,
                }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="number"
              value={formulario.anoTrabalho}
              onChange={(evento) =>
                setFormulario((atual) => ({
                  ...atual,
                  anoTrabalho: Number(evento.target.value),
                }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Ano de trabalho"
            />

            <input
              type="number"
              value={formulario.financeiroPositivoRecebido}
              onChange={(evento) =>
                setFormulario((atual) => ({
                  ...atual,
                  financeiroPositivoRecebido: Number(evento.target.value),
                }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Financeiro positivo recebido"
            />

            <input
              type="number"
              value={formulario.financeiroNegativoRecebido}
              onChange={(evento) =>
                setFormulario((atual) => ({
                  ...atual,
                  financeiroNegativoRecebido: Number(evento.target.value),
                }))
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="Financeiro negativo / dívidas"
            />

            <div
              className={`rounded-2xl border p-4 ${
                saldoLiquido(formulario) >= 0
                  ? "border-emerald-400/20 bg-emerald-400/10"
                  : "border-red-400/20 bg-red-400/10"
              }`}
            >
              <p className="text-sm text-zinc-300">Saldo líquido inicial</p>
              <h4
                className={`mt-1 text-xl font-bold ${
                  saldoLiquido(formulario) >= 0 ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {formatarMoeda(saldoLiquido(formulario))}
              </h4>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h4 className="text-lg font-bold text-white">Cargos da Gestão</h4>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={formulario.cargos.veneravelMestre}
                onChange={(evento) => atualizarCargo("veneravelMestre", evento.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                placeholder="Venerável Mestre"
              />

              <input
                value={formulario.cargos.primeiroVigilante}
                onChange={(evento) => atualizarCargo("primeiroVigilante", evento.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                placeholder="1º Vigilante"
              />

              <input
                value={formulario.cargos.segundoVigilante}
                onChange={(evento) => atualizarCargo("segundoVigilante", evento.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                placeholder="2º Vigilante"
              />

              <input
                value={formulario.cargos.orador}
                onChange={(evento) => atualizarCargo("orador", evento.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                placeholder="Orador"
              />

              <input
                value={formulario.cargos.secretario}
                onChange={(evento) => atualizarCargo("secretario", evento.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                placeholder="Secretário"
              />

              <input
                value={formulario.cargos.tesoureiro}
                onChange={(evento) => atualizarCargo("tesoureiro", evento.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                placeholder="Tesoureiro"
              />

              <input
                value={formulario.cargos.chanceler}
                onChange={(evento) => atualizarCargo("chanceler", evento.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                placeholder="Chanceler"
              />

              <input
                value={formulario.cargos.mestreCerimonias}
                onChange={(evento) => atualizarCargo("mestreCerimonias", evento.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                placeholder="Mestre de Cerimônias"
              />
            </div>
          </div>

          <textarea
            value={formulario.observacaoRepasse}
            onChange={(evento) =>
              setFormulario((atual) => ({
                ...atual,
                observacaoRepasse: evento.target.value,
              }))
            }
            className="min-h-24 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
            placeholder="Observação sobre o repasse financeiro, dívidas herdadas ou situação inicial da gestão"
          />

          <button
            type="submit"
            className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300"
          >
            {formulario.id ? "Salvar alterações da gestão" : "Cadastrar gestão"}
          </button>
        </form>
      </section>

      {gestaoAtual && (
        <section className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Gestão atual</p>
          <h3 className="mt-3 text-2xl font-bold text-white">{gestaoAtual.nomeGestao}</h3>
          <p className="mt-2 text-sm text-zinc-300">
            Repasse recebido de: {gestaoAtual.gestaoAnteriorRepasse}
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-zinc-400">Período</p>
              <p className="mt-1 font-semibold text-white">
                {formatarDataBR(gestaoAtual.dataInicioGestao)} até{" "}
                {formatarDataBR(gestaoAtual.dataFimGestao)}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-400">Ano de trabalho</p>
              <p className="mt-1 font-semibold text-white">{gestaoAtual.anoTrabalho}</p>
            </div>

            <div>
              <p className="text-xs text-zinc-400">Positivo recebido</p>
              <p className="mt-1 font-semibold text-emerald-300">
                {formatarMoeda(gestaoAtual.financeiroPositivoRecebido)}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-400">Negativo recebido</p>
              <p className="mt-1 font-semibold text-red-300">
                {formatarMoeda(gestaoAtual.financeiroNegativoRecebido)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-zinc-400">Saldo líquido inicial</p>
            <h4
              className={`mt-1 text-3xl font-bold ${
                saldoLiquido(gestaoAtual) >= 0 ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {formatarMoeda(saldoLiquido(gestaoAtual))}
            </h4>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Gestões cadastradas</h3>

        <div className="mt-6 space-y-4">
          {gestoes.map((gestao) => (
            <div key={gestao.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xl font-bold text-white">{gestao.nomeGestao}</h4>

                    {gestao.id === gestaoAtualId && (
                      <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-black">
                        Atual
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-zinc-400">
                    Repasse de: {gestao.gestaoAnteriorRepasse}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {formatarDataBR(gestao.dataInicioGestao)} até{" "}
                    {formatarDataBR(gestao.dataFimGestao)} | Ano: {gestao.anoTrabalho}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => aplicarGestaoAtual(gestao)}
                    className="rounded-full bg-amber-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-amber-300"
                  >
                    Usar como atual
                  </button>

                  <button
                    type="button"
                    onClick={() => editarGestao(gestao)}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => removerGestao(gestao.id)}
                    className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
                  >
                    Remover
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-xs text-emerald-200">Financeiro positivo</p>
                  <p className="mt-1 font-bold text-emerald-300">
                    {formatarMoeda(gestao.financeiroPositivoRecebido)}
                  </p>
                </div>

                <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4">
                  <p className="text-xs text-red-200">Financeiro negativo</p>
                  <p className="mt-1 font-bold text-red-300">
                    {formatarMoeda(gestao.financeiroNegativoRecebido)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs text-zinc-400">Saldo líquido</p>
                  <p
                    className={`mt-1 font-bold ${
                      saldoLiquido(gestao) >= 0 ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {formatarMoeda(saldoLiquido(gestao))}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Venerável Mestre", gestao.cargos.veneravelMestre],
                  ["1º Vigilante", gestao.cargos.primeiroVigilante],
                  ["2º Vigilante", gestao.cargos.segundoVigilante],
                  ["Orador", gestao.cargos.orador],
                  ["Secretário", gestao.cargos.secretario],
                  ["Tesoureiro", gestao.cargos.tesoureiro],
                  ["Chanceler", gestao.cargos.chanceler],
                  ["Mestre de Cerimônias", gestao.cargos.mestreCerimonias],
                ].map(([cargo, nome]) => (
                  <div key={cargo} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-amber-400">{cargo}</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {nome || "Não informado"}
                    </p>
                  </div>
                ))}
              </div>

              {gestao.observacaoRepasse && (
                <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                  {gestao.observacaoRepasse}
                </p>
              )}
            </div>
          ))}

          {gestoes.length === 0 && (
            <p className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-zinc-500">
              Nenhuma gestão cadastrada ainda.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
