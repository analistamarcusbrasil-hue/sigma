import { AppShell } from "@/components/AppShell";
import { SecretariaDocumentoEditorClient } from "@/components/SecretariaDocumentoEditorClient";
export default function NovoBalaustrePage() { return <AppShell secao="Secretaria / Balaústres" titulo="Novo Balaústre" subtitulo="Preencha a minuta, gere o texto oficial e encaminhe ao Venerável Mestre."><SecretariaDocumentoEditorClient categoria="Balaústre" /></AppShell>; }

