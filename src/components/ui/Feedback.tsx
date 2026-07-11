import type { ReactNode } from "react";

type FeedbackTone = "info" | "success" | "warning" | "error";
const tones: Record<FeedbackTone, string> = {
  info: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  warning: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  error: "border-red-400/20 bg-red-400/10 text-red-100",
};

export function Feedback({ children, tone = "info" }: { children: ReactNode; tone?: FeedbackTone }) {
  return <div className={`rounded-2xl border p-4 text-sm leading-6 ${tones[tone]}`} role={tone === "error" ? "alert" : "status"} aria-live="polite">{children}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-3xl border border-dashed border-white/15 bg-white/[.025] px-5 py-10 text-center"><h3 className="text-lg font-bold text-white">{title}</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-400">{description}</p>{action && <div className="mt-5 flex justify-center">{action}</div>}</div>;
}

export function LoadingState({ label = "Carregando dados…" }: { label?: string }) {
  return <div className="space-y-3 py-2" role="status" aria-live="polite"><span className="sr-only">{label}</span>{["w-full", "w-5/6", "w-2/3"].map((width) => <div key={width} className={`h-14 animate-pulse rounded-2xl bg-white/[.06] ${width}`} />)}</div>;
}
