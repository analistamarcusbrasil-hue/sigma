import { AppShell } from "@/components/AppShell";
import { ComprovanteSolicitacaoClient } from "@/components/ComprovanteSolicitacaoClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell
    secao="Portal e Comunicação"
    titulo="Comprovante da Solicitação"
    subtitulo="Decisão final, efeitos aplicados e documentos disponibilizados ao Obreiro."
  >
    <ComprovanteSolicitacaoClient id={id} />
  </AppShell>;
}
