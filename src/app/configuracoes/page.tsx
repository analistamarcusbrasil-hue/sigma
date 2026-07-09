import { AppShell } from "@/components/AppShell";
import { ConfiguracoesGestaoClient } from "@/components/ConfiguracoesGestaoClient";

export default function ConfiguracoesPage() {
  return (
    <AppShell
      secao="Cadastro de Gestão"
      titulo="Cadastro de Gestão"
      subtitulo="Cadastre a gestão atual, diretoria, período de trabalho e o repasse financeiro positivo ou negativo recebido da gestão anterior."
    >
      <ConfiguracoesGestaoClient />
    </AppShell>
  );
}
