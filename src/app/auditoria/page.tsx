import { AppShell } from "@/components/AppShell";
import { AuditoriaClient } from "@/components/AuditoriaClient";

export default function AuditoriaPage() {
  return <AppShell secao="Governança" titulo="Auditoria e Histórico" subtitulo="Consulte alterações realizadas no SIGMA 2.0, com data, responsável, módulo e campos modificados."><AuditoriaClient /></AppShell>;
}
