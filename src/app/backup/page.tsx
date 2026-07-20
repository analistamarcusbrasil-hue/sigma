import { AppShell } from "@/components/AppShell";
import { BackupDadosClient } from "@/components/BackupDadosClient";

export default function BackupPage() {
  return (
    <AppShell
      secao="Segurança"
      titulo="Backup do Sistema"
      subtitulo="Crie, baixe, restaure e gerencie versões de segurança dos dados da Loja ativa."
    >
      <BackupDadosClient />
    </AppShell>
  );
}
