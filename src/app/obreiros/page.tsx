import { AppShell } from "@/components/AppShell";
import { ObreirosClient } from "@/components/ObreirosClient";

export default function ObreirosPage() {
  return (
    <AppShell
      secao="Obreiros"
      titulo="Cadastro Geral de Obreiros"
      subtitulo="Base única de irmãos da Loja para alimentar secretaria, chancelaria, tesouraria e administração."
    >
      <ObreirosClient />
    </AppShell>
  );
}
