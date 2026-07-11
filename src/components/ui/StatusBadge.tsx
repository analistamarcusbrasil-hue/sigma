type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";
const tones: Record<StatusTone, string> = {
  neutral: "border-zinc-400/20 bg-zinc-400/10 text-zinc-200",
  success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  danger: "border-red-400/20 bg-red-400/10 text-red-200",
  info: "border-sky-400/20 bg-sky-400/10 text-sky-200",
};
const success = ["ativo", "pago", "presente", "concluído", "aprovado", "recebida", "apresentada"];
const warning = ["pendente", "justificado", "em andamento", "em revisão", "rascunho"];
const danger = ["inativo", "vencido", "falta", "cancelado", "revogado", "suspenso"];

export function toneForStatus(status: string): StatusTone {
  const normalized = status.toLocaleLowerCase("pt-BR");
  if (success.includes(normalized)) return "success";
  if (warning.includes(normalized)) return "warning";
  if (danger.includes(normalized)) return "danger";
  return "neutral";
}

export function StatusBadge({ status, tone = toneForStatus(status) }: { status: string; tone?: StatusTone }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{status}</span>;
}
