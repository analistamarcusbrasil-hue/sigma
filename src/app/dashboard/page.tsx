import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";
import { FechamentosResumoClient } from "@/components/FechamentosResumoClient";
import { PrestacaoFinalResumoClient } from "@/components/PrestacaoFinalResumoClient";

export default function DashboardPage() {
  return (
    <AppShell
      secao="Painel da Gestão"
      titulo="Dashboard da Gestão"
      subtitulo="Visão geral da Loja com caixa, repasse, diretoria, tesouraria, chancelaria, secretaria e alertas importantes."
    >
      <DashboardClient />
      <FechamentosResumoClient />
      <PrestacaoFinalResumoClient />
    </AppShell>
  );
}
