import { AppShell } from "@/components/AppShell";
import { TesourariaClient } from "@/components/TesourariaClient";

export default function TesourariaPage() {
  return (
    <AppShell
      secao="Tesouraria"
      titulo="Controle Financeiro"
      subtitulo="Mensalidades por vigência, tronco de solidariedade, receitas, despesas, inadimplência e saldo geral da Loja."
    >
      <TesourariaClient />
    </AppShell>
  );
}
