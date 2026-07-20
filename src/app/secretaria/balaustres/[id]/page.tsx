import { AppShell } from "@/components/AppShell";
import { SecretariaDocumentoEditorClient } from "@/components/SecretariaDocumentoEditorClient";
export default async function BalaustrePage({ params }: PageProps<"/secretaria/balaustres/[id]">) { const { id } = await params; return <AppShell secao="Secretaria / Balaústres" titulo="Balaústre" subtitulo="Edição controlada, tramitação, aprovação e PDF institucional."><SecretariaDocumentoEditorClient categoria="Balaústre" documentoId={id} /></AppShell>; }

