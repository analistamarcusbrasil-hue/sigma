import { AppShell } from "@/components/AppShell";
import { ConfiguracoesGestaoClient } from "@/components/ConfiguracoesGestaoClient";
import Link from "next/link";

export default function ConfiguracoesPage() {
  return (
    <AppShell
      secao="Cadastro de Gestão"
      titulo="Cadastro de Gestão"
      subtitulo="Cadastre a gestão atual, diretoria, período de trabalho e o repasse financeiro positivo ou negativo recebido da gestão anterior."
      acao={<Link href="/repasse-gestao" className="inline-flex rounded-xl border border-amber-400/30 px-4 py-3 font-semibold text-amber-200 transition hover:bg-amber-400/10">Abrir Repasse de Gestão</Link>}
    >
      <ConfiguracoesGestaoClient />
    </AppShell>
  );
}
