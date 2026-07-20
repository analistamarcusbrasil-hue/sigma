import { AppShell } from "@/components/AppShell";
import { SecretariaDocumentoEditorClient } from "@/components/SecretariaDocumentoEditorClient";
export default async function AtaAdministrativaPage({ params }: PageProps<"/secretaria/atas-administrativas/[id]">) { const { id } = await params; return <AppShell secao="Secretaria / Atas" titulo="Ata Administrativa" subtitulo="Deliberações, tramitação, aprovação e PDF institucional."><SecretariaDocumentoEditorClient categoria="Ata Administrativa" documentoId={id} /></AppShell>; }

