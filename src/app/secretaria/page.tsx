import { AppShell } from "@/components/AppShell";
import { SecretariaClient } from "@/components/SecretariaClient";

export default function SecretariaPage() {
  return (
    <AppShell
      secao="Secretaria"
      titulo="Controle da Secretaria"
      subtitulo="Atas, balaústres, ordem do dia, ações pendentes, processos, cerimônias e peças de arquitetura."
    >
      <SecretariaClient />
    </AppShell>
  );
}
