import { AppShell } from "@/components/AppShell";
import { ChancelariaClient } from "@/components/ChancelariaClient";

export default function ChancelariaPage() {
  return (
    <AppShell
      secao="Chancelaria"
      titulo="Controle de Frequência"
      subtitulo="Registro de presença por sessão, faltas, justificativas e percentual de frequência dos obreiros."
    >
      <ChancelariaClient />
    </AppShell>
  );
}
