import { AppShell } from "@/components/AppShell";
import { SolicitacoesClient } from "@/components/SolicitacoesClient";
import Link from "next/link";

export default function Page() {
  return <AppShell
    secao="Portal e Comunicação"
    titulo="Solicitações dos Obreiros"
    subtitulo="Fila distribuída por área responsável, com protocolo, prazos, tramitação e entrega do documento final."
    acao={<Link href="/relatorios" className="rounded-xl bg-amber-400 px-4 py-2 font-bold text-black">Relatório PDF</Link>}
  >
    <SolicitacoesClient />
  </AppShell>;
}
