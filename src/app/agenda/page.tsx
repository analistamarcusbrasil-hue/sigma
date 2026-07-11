import { AppShell } from "@/components/AppShell";
import { AgendaClient } from "@/components/AgendaClient";

export default function AgendaPage() {
  return <AppShell secao="Organização" titulo="Agenda da Loja" subtitulo="Centralize sessões, cerimônias, reuniões, prazos, eventos e compromissos administrativos."><AgendaClient /></AppShell>;
}
