"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  chaveUsuarioLogado,
  chaveUsuarios,
  type UsuarioSigma,
  usuarioSemSenha,
  usuariosPadrao,
} from "@/lib/auth";

function lerUsuarios(): UsuarioSigma[] {
  if (typeof window === "undefined") return usuariosPadrao;

  try {
    const salvos = localStorage.getItem(chaveUsuarios);

    if (!salvos) {
      localStorage.setItem(chaveUsuarios, JSON.stringify(usuariosPadrao));
      return usuariosPadrao;
    }

    const usuarios = JSON.parse(salvos) as UsuarioSigma[];

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      localStorage.setItem(chaveUsuarios, JSON.stringify(usuariosPadrao));
      return usuariosPadrao;
    }

    return usuarios;
  } catch {
    localStorage.setItem(chaveUsuarios, JSON.stringify(usuariosPadrao));
    return usuariosPadrao;
  }
}

export function LoginClient() {
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<UsuarioSigma[]>(usuariosPadrao);
  const [login, setLogin] = useState("admin");
  const [senha, setSenha] = useState("admin123");
  const [erro, setErro] = useState("");

  useEffect(() => {
    setUsuarios(lerUsuarios());

    const usuarioLogado = localStorage.getItem(chaveUsuarioLogado);

    if (usuarioLogado) {
      router.replace("/dashboard");
    }
  }, [router]);

  function entrar() {
    setErro("");

    const usuario = usuarios.find((item) => {
      return (
        item.login.trim().toLowerCase() === login.trim().toLowerCase() &&
        item.senha === senha &&
        item.ativo
      );
    });

    if (!usuario) {
      setErro("Login ou senha inválidos, ou usuário inativo.");
      return;
    }

    localStorage.setItem(chaveUsuarioLogado, JSON.stringify(usuarioSemSenha(usuario)));
    router.replace("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-amber-400/15 to-white/[0.03] p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">
              SIGMA LUMP
            </p>

            <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
              Sistema Integrado de Gestão Maçônica
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
              Acesso restrito para gestão da Loja, com módulos de Dashboard,
              Obreiros, Tesouraria, Chancelaria, Secretaria, Prestação de Contas,
              Configurações e Backup.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                ["Gestão", "Diretoria vigente, repasse e período da administração."],
                ["Tesouraria", "Mensalidades, custos, saldo e prestação de contas."],
                ["Chancelaria", "Presenças, cargos em sessão e frequência."],
                ["Secretaria", "Atas, balaústres, decisões e processos."],
              ].map(([titulo, texto]) => (
                <div key={titulo} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-bold text-white">{titulo}</p>
                  <p className="mt-2 text-sm text-zinc-400">{texto}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
            <h2 className="text-3xl font-bold">Entrar no sistema</h2>

            <p className="mt-2 text-sm text-zinc-400">
              Login local provisório para estruturar permissões antes do banco de dados.
            </p>

            {erro && (
              <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
                {erro}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-zinc-300">Login</span>
                <input
                  value={login}
                  onChange={(evento) => setLogin(evento.target.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === "Enter") entrar();
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-zinc-300">Senha</span>
                <input
                  type="password"
                  value={senha}
                  onChange={(evento) => setSenha(evento.target.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === "Enter") entrar();
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </label>

              <button
                type="button"
                onClick={entrar}
                className="w-full rounded-full bg-amber-400 px-6 py-3 font-bold text-black transition hover:bg-amber-300"
              >
                Acessar SIGMA
              </button>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-bold text-white">Usuários de teste</p>

              <div className="mt-3 space-y-2 text-xs text-zinc-400">
                <p><strong className="text-amber-300">Administrador:</strong> admin / admin123</p>
                <p><strong className="text-amber-300">Venerável:</strong> veneravel / vm123</p>
                <p><strong className="text-amber-300">Secretário:</strong> secretario / sec123</p>
                <p><strong className="text-amber-300">Tesoureiro:</strong> tesoureiro / tes123</p>
                <p><strong className="text-amber-300">Chanceler:</strong> chanceler / chan123</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
