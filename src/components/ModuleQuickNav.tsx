type ItemNavegacaoModulo = {
  href: string;
  titulo: string;
  descricao: string;
  destaque?: "amber" | "emerald" | "sky";
};

type ModuleQuickNavProps = {
  titulo: string;
  descricao: string;
  itens: ItemNavegacaoModulo[];
};

const estilos = {
  amber: "border-amber-400/30 bg-amber-400/[0.08] hover:bg-amber-400/[0.14]",
  emerald: "border-emerald-400/30 bg-emerald-400/[0.08] hover:bg-emerald-400/[0.14]",
  sky: "border-sky-400/30 bg-sky-400/[0.08] hover:bg-sky-400/[0.14]",
};

export function ModuleQuickNav({ titulo, descricao, itens }: ModuleQuickNavProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Atalhos do módulo</p>
          <h3 className="mt-1 text-lg font-bold text-white">{titulo}</h3>
        </div>
        <p className="text-sm text-zinc-400">{descricao}</p>
      </div>

      <nav className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label={titulo}>
        {itens.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`rounded-2xl border p-4 transition focus:outline-none focus:ring-2 focus:ring-amber-400/40 ${estilos[item.destaque ?? "amber"]}`}
          >
            <p className="font-semibold text-white">{item.titulo}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">{item.descricao}</p>
          </a>
        ))}
      </nav>
    </section>
  );
}
