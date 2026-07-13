import { AppShell } from "@/components/AppShell";
import { SolicitacoesClient } from "@/components/SolicitacoesClient";

export default function Page() {
  return <AppShell
    secao="Portal e Comunicação"
    titulo="Solicitações dos Obreiros"
    subtitulo="Fila distribuída por área responsável, com protocolo, prazos, tramitação e entrega do documento final."
  >
    <SolicitacoesClient />
  </AppShell>;
}
