import { AppShell } from "@/components/AppShell";
import { BackupDadosClient } from "@/components/BackupDadosClient";

export default function BackupPage() {
  return (
    <AppShell
      secao="Backup"
      titulo="Backup dos Dados"
      subtitulo="Consulte a proteção e a disponibilidade dos dados do SIGMA 2.0."
    >
      <BackupDadosClient />
    </AppShell>
  );
}
