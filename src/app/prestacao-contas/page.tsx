import { AppShell } from "@/components/AppShell";
import { PrestacaoContasClient } from "@/components/PrestacaoContasClient";

export default function PrestacaoContasPage() {
  return (
    <AppShell
      secao="Prestação de Contas"
      titulo="Prestação de Contas"
      subtitulo="Relatório mensal e anual com receitas, despesas, custos fixos, saldo, inadimplência e decisões financeiras da Loja."
    >
      <PrestacaoContasClient />
    </AppShell>
  );
}
