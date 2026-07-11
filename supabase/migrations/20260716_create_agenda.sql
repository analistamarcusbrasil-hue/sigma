-- SIGMA 2.0: agenda operacional multi-Loja e ampliação não destrutiva de sessões.

alter table public.sessoes add column if not exists horario_previsto time;
alter table public.sessoes add column if not exists horario_inicio_real time;
alter table public.sessoes add column if not exists horario_fim_real time;
alter table public.sessoes add column if not exists local text;
alter table public.sessoes add column if not exists pauta text;
alter table public.sessoes add column if not exists ordem_do_dia text;

create table if not exists public.agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  sessao_id uuid references public.sessoes(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  tipo text not null check (tipo in ('Sessão', 'Reunião', 'Cerimônia', 'Evento social', 'Prazo', 'Financeiro', 'Comissão', 'Outro')),
  descricao text,
  inicio timestamptz not null,
  fim timestamptz,
  dia_inteiro boolean not null default false,
  local text,
  responsavel_id uuid references public.obreiros(id) on delete set null,
  status text not null default 'Planejado' check (status in ('Planejado', 'Confirmado', 'Concluído', 'Cancelado')),
  recorrencia text not null default 'Nenhuma' check (recorrencia in ('Nenhuma', 'Semanal', 'Mensal', 'Anual')),
  lembrete_minutos integer check (lembrete_minutos is null or lembrete_minutos >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (fim is null or fim >= inicio)
);

create index if not exists agenda_loja_inicio_idx on public.agenda_eventos (loja_id, inicio);
create index if not exists agenda_loja_status_idx on public.agenda_eventos (loja_id, status, inicio);
create index if not exists agenda_responsavel_idx on public.agenda_eventos (responsavel_id, inicio);

drop trigger if exists agenda_eventos_updated_at on public.agenda_eventos;
create trigger agenda_eventos_updated_at before update on public.agenda_eventos
for each row execute function public.set_updated_at();

alter table public.agenda_eventos enable row level security;
drop policy if exists "agenda: membros leem" on public.agenda_eventos;
drop policy if exists "agenda: autorizados inserem" on public.agenda_eventos;
drop policy if exists "agenda: autorizados atualizam" on public.agenda_eventos;
drop policy if exists "agenda: autorizados excluem" on public.agenda_eventos;
create policy "agenda: membros leem" on public.agenda_eventos for select to authenticated
  using (public.usuario_pertence_loja(loja_id));
create policy "agenda: autorizados inserem" on public.agenda_eventos for insert to authenticated
  with check (public.usuario_pode_escrever(loja_id, '/agenda') or public.usuario_pode_escrever(loja_id, '/secretaria') or public.usuario_pode_escrever(loja_id, '/chancelaria'));
create policy "agenda: autorizados atualizam" on public.agenda_eventos for update to authenticated
  using (public.usuario_pode_escrever(loja_id, '/agenda') or public.usuario_pode_escrever(loja_id, '/secretaria') or public.usuario_pode_escrever(loja_id, '/chancelaria'))
  with check (public.usuario_pode_escrever(loja_id, '/agenda') or public.usuario_pode_escrever(loja_id, '/secretaria') or public.usuario_pode_escrever(loja_id, '/chancelaria'));
create policy "agenda: autorizados excluem" on public.agenda_eventos for delete to authenticated
  using (public.usuario_pode_escrever(loja_id, '/agenda') or public.usuario_pode_escrever(loja_id, '/secretaria') or public.usuario_pode_escrever(loja_id, '/chancelaria'));

-- Inclui a agenda na trilha se a Fase 1 já estiver instalada.
do $$ begin
  if to_regprocedure('public.registrar_auditoria_operacional()') is not null then
    drop trigger if exists auditoria_operacional on public.agenda_eventos;
    create trigger auditoria_operacional after insert or update or delete on public.agenda_eventos
    for each row execute function public.registrar_auditoria_operacional();
  end if;
end $$;
