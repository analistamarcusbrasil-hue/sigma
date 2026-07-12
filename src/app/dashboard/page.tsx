import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";
import { FechamentosResumoClient } from "@/components/FechamentosResumoClient";

export default function DashboardPage() {
  return (
    <AppShell
      secao="Painel da Gestão"
      titulo="Dashboard da Gestão"
      subtitulo="Visão geral da Loja com caixa, repasse, diretoria, tesouraria, chancelaria, secretaria e alertas importantes."
    >
      <DashboardClient />
      <FechamentosResumoClient />
    </AppShell>
  );
}
