import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";

export default function DashboardPage() {
  return (
    <AppShell
      secao="Dashboard"
      titulo="Visão Geral da Loja"
      subtitulo="Indicadores integrados de Obreiros, Tesouraria, Chancelaria, sessões, frequência e saldo geral."
    >
      <DashboardClient />
    </AppShell>
  );
}
