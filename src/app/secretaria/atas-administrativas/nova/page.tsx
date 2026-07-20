import { AppShell } from "@/components/AppShell";
import { SecretariaDocumentoEditorClient } from "@/components/SecretariaDocumentoEditorClient";
export default function NovaAtaAdministrativaPage() { return <AppShell secao="Secretaria / Atas" titulo="Nova Ata Administrativa" subtitulo="Registre decisões, responsáveis, prazos e produza o documento oficial."><SecretariaDocumentoEditorClient categoria="Ata Administrativa" /></AppShell>; }

