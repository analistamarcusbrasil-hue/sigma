import { AppShell } from "@/components/AppShell";
import { ChancelariaClient } from "@/components/ChancelariaClient";
import Link from "next/link";

export default function ChancelariaPage() {
  return (
    <AppShell
      secao="Chancelaria"
      titulo="Controle de Frequência"
      subtitulo="Registro de presença por sessão, faltas, justificativas e percentual de frequência dos obreiros."
      acao={<Link href="/relatorios" className="rounded-xl bg-amber-400 px-4 py-2 font-bold text-black">Gerar PDF</Link>}
    >
      <ChancelariaClient />
    </AppShell>
  );
}
