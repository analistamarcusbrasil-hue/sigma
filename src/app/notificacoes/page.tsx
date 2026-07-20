import { AppShell } from "@/components/AppShell";
import { NotificacoesEmailClient } from "@/components/NotificacoesEmailClient";

export default function NotificacoesPage() {
  return (
    <AppShell
      secao="Configurações"
      titulo="Notificações por e-mail"
      subtitulo="Acompanhe a fila do Resend, teste a configuração e reenvie avisos com falha da Loja ativa."
    >
      <NotificacoesEmailClient />
    </AppShell>
  );
}
