import { AppShell } from "@/components/AppShell";
import { BackupDadosClient } from "@/components/BackupDadosClient";

export default function BackupPage() {
  return (
    <AppShell
      secao="Backup"
      titulo="Backup dos Dados"
      subtitulo="Baixe, restaure e proteja os dados locais do SIGMA LUMP."
    >
      <BackupDadosClient />
    </AppShell>
  );
}
