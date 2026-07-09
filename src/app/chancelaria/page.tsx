import { AppShell } from "@/components/AppShell";

export default function ChancelariaPage() {
  return (
    <AppShell
      secao="Chancelaria"
      titulo="Controle de Frequência"
      subtitulo="Registro de presença por sessão, faltas, justificativas e percentual de frequência dos obreiros."
    >
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-2xl font-bold">Presenças por Sessão</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Este será o próximo módulo funcional depois do cadastro de obreiros.
        </p>

        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-amber-200">
          Próxima construção: selecionar sessão, marcar Presente/Falta/Justificado e calcular frequência automática.
        </div>
      </section>
    </AppShell>
  );
}
