"use client";

import { useEffect, useMemo, useState } from "react";
import { obreirosBase } from "@/lib/mock-data";
import type { Obreiro, RegistroPresenca, StatusPresenca } from "@/types";

type Sessao = {
  id: string;
  data: string;
  titulo: string;
};

const statusOpcoes: StatusPresenca[] = [
  "Não marcado",
  "Presente",
  "Falta",
  "Justificado",
];

function gerarSessoes2026(): Sessao[] {
  const sessoes: Sessao[] = [];

  for (let mes = 0; mes < 12; mes++) {
    const sabados: Date[] = [];

    for (let dia = 1; dia <= 31; dia++) {
      const data = new Date(2026, mes, dia);

      if (data.getMonth() !== mes) {
        break;
      }

      if (data.getDay() === 6) {
        sabados.push(data);
      }
    }

    const sessoesDoMes = [sabados[0], sabados[2]].filter(Boolean);

    sessoesDoMes.forEach((data, index) => {
      const dataFormatada = data.toLocaleDateString("pt-BR");
      const numeroSessao = index === 0 ? "1º sábado" : "3º sábado";

      sessoes.push({
        id: dataFormatada,
        data: dataFormatada,
        titulo: `${dataFormatada} - ${numeroSessao}`,
      });
    });
  }

  return sessoes;
}

function classeStatus(status: StatusPresenca) {
  if (status === "Presente") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "Justificado") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }

  if (status === "Falta") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  return "border-white/10 bg-black/30 text-zinc-300";
}

export function ChancelariaClient() {
  const sessoes = useMemo(() => gerarSessoes2026(), []);
  const [sessaoSelecionada, setSessaoSelecionada] = useState(sessoes[0]?.id ?? "");
  const [obreiros, setObreiros] = useState<Obreiro[]>(obreirosBase);
  const [presencas, setPresencas] = useState<RegistroPresenca[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const obreirosSalvos = localStorage.getItem("sigma_obreiros");
    const presencasSalvas = localStorage.getItem("sigma_presencas");

    if (obreirosSalvos) {
      setObreiros(JSON.parse(obreirosSalvos));
    }

    if (presencasSalvas) {
      setPresencas(JSON.parse(presencasSalvas));
    }

    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) {
      localStorage.setItem("sigma_presencas", JSON.stringify(presencas));
    }
  }, [presencas, carregado]);

  const obreirosOrdenados = useMemo(() => {
    return [...obreiros].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [obreiros]);

  function buscarStatus(obreiroId: string): StatusPresenca {
    const registro = presencas.find(
      (item) => item.sessaoId === sessaoSelecionada && item.obreiroId === obreiroId
    );

    return registro?.status ?? "Não marcado";
  }

  function atualizarPresenca(obreiroId: string, status: StatusPresenca) {
    setPresencas((atuais) => {
      const existe = atuais.some(
        (item) => item.sessaoId === sessaoSelecionada && item.obreiroId === obreiroId
      );

      if (!existe) {
        return [
          ...atuais,
          {
            sessaoId: sessaoSelecionada,
            obreiroId,
            status,
          },
        ];
      }

      return atuais.map((item) => {
        if (item.sessaoId === sessaoSelecionada && item.obreiroId === obreiroId) {
          return {
            ...item,
            status,
          };
        }

        return item;
      });
    });
  }

  function marcarTodos(status: StatusPresenca) {
    const registrosDaSessao = obreirosOrdenados.map((obreiro) => ({
      sessaoId: sessaoSelecionada,
      obreiroId: obreiro.id,
      status,
    }));

    setPresencas((atuais) => {
      const outrasSessoes = atuais.filter((item) => item.sessaoId !== sessaoSelecionada);
      return [...outrasSessoes, ...registrosDaSessao];
    });
  }

  const resumoSessao = useMemo(() => {
    const registros = obreirosOrdenados.map((obreiro) => buscarStatus(obreiro.id));

    return {
      presentes: registros.filter((status) => status === "Presente").length,
      faltas: registros.filter((status) => status === "Falta").length,
      justificados: registros.filter((status) => status === "Justificado").length,
      naoMarcados: registros.filter((status) => status === "Não marcado").length,
      total: obreirosOrdenados.length,
    };
  }, [obreirosOrdenados, presencas, sessaoSelecionada]);

  const percentualPresenca =
    resumoSessao.total > 0
      ? Math.round((resumoSessao.presentes / resumoSessao.total) * 100)
      : 0;

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Obreiros</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">{resumoSessao.total}</h3>
          <p className="mt-2 text-sm text-zinc-500">Cadastrados</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Presentes</p>
          <h3 className="mt-3 text-3xl font-bold text-emerald-300">{resumoSessao.presentes}</h3>
          <p className="mt-2 text-sm text-zinc-500">Na sessão selecionada</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Faltas</p>
          <h3 className="mt-3 text-3xl font-bold text-red-300">{resumoSessao.faltas}</h3>
          <p className="mt-2 text-sm text-zinc-500">Sem justificativa</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Justificados</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">{resumoSessao.justificados}</h3>
          <p className="mt-2 text-sm text-zinc-500">Com justificativa</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-zinc-400">Frequência</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">{percentualPresenca}%</h3>
          <p className="mt-2 text-sm text-zinc-500">Presença real da sessão</p>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-2xl font-bold">Registro de Presença</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Selecione a sessão e marque a situação de cada obreiro.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div>
              <label className="text-sm text-zinc-300">Sessão</label>
              <select
                value={sessaoSelecionada}
                onChange={(evento) => setSessaoSelecionada(evento.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400 md:w-72"
              >
                {sessoes.map((sessao) => (
                  <option key={sessao.id} value={sessao.id}>
                    {sessao.titulo}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => marcarTodos("Presente")}
              className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300"
            >
              Marcar todos presentes
            </button>

            <button
              onClick={() => marcarTodos("Não marcado")}
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
            >
              Limpar sessão
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white/[0.06] text-zinc-300">
              <tr>
                <th className="px-5 py-4">Obreiro</th>
                <th className="px-5 py-4">Grau</th>
                <th className="px-5 py-4">Cargo</th>
                <th className="px-5 py-4">Presença</th>
              </tr>
            </thead>

            <tbody>
              {obreirosOrdenados.map((obreiro) => {
                const statusAtual = buscarStatus(obreiro.id);

                return (
                  <tr
                    key={obreiro.id}
                    className="border-t border-white/10 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4 font-semibold text-white">{obreiro.nome}</td>
                    <td className="px-5 py-4 text-zinc-300">{obreiro.grau}</td>
                    <td className="px-5 py-4 text-zinc-300">{obreiro.cargo || "Sem cargo"}</td>
                    <td className="px-5 py-4">
                      <select
                        value={statusAtual}
                        onChange={(evento) =>
                          atualizarPresenca(obreiro.id, evento.target.value as StatusPresenca)
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-semibold outline-none ${classeStatus(
                          statusAtual
                        )}`}
                      >
                        {statusOpcoes.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
