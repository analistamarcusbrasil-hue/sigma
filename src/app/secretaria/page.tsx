import { AppShell } from "@/components/AppShell";
import { SecretariaClient } from "@/components/SecretariaClient";
import { ModuleQuickNav } from "@/components/ModuleQuickNav";

export default function SecretariaPage() {
  return (
    <AppShell
      secao="Secretaria"
      titulo="Controle da Secretaria"
      subtitulo="Atas, balaústres, ordem do dia, ações pendentes, processos, cerimônias e peças de arquitetura."
    >
      <div className="space-y-6">
        <ModuleQuickNav titulo="Documentos oficiais" descricao="Fluxos profissionais da Secretaria" itens={[
          { href: "/secretaria/balaustres", titulo: "Balaústres", descricao: "Sessões Ordinárias e Magnas, revisão e PDF.", destaque: "amber" },
          { href: "/secretaria/atas-administrativas", titulo: "Atas Administrativas", descricao: "Reuniões, Diretoria, deliberações e prazos.", destaque: "sky" },
          { href: "/secretaria/balaustres/novo", titulo: "Novo Balaústre", descricao: "Iniciar documento vinculado à Sessão.", destaque: "emerald" },
          { href: "/secretaria/atas-administrativas/nova", titulo: "Nova Ata", descricao: "Registrar reunião administrativa.", destaque: "emerald" },
        ]} />
        <SecretariaClient />
      </div>
    </AppShell>
  );
}
