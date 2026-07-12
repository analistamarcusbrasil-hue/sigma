-- SIGMA 2.0: fechamento mensal financeiro e administrativo.
create table if not exists public.fechamentos_mensais (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  administracao_id uuid not null references public.administracoes(id) on delete restrict,
  competencia date not null,
  status text not null default 'Aberto' check (status in ('Aberto','Em conferência','Fechado','Aprovado','Reaberto')),
  saldo_inicial numeric(14,2) not null default 0,
  total_entradas numeric(14,2) not null default 0,
  total_saidas numeric(14,2) not null default 0,
  saldo_final numeric(14,2) not null default 0,
  total_mensalidades_recebidas numeric(14,2) not null default 0,
  total_mensalidades_abertas numeric(14,2) not null default 0,
  total_tronco numeric(14,2) not null default 0,
  total_despesas_pagas numeric(14,2) not null default 0,
  total_despesas_pendentes numeric(14,2) not null default 0,
  lancamentos_sem_comprovante integer not null default 0 check (lancamentos_sem_comprovante >= 0),
  observacoes_tesoureiro text,
  observacoes_aprovacao text,
  motivo_reabertura text,
  responsavel_fechamento_id uuid references auth.users(id) on delete set null,
  responsavel_aprovacao_id uuid references auth.users(id) on delete set null,
  fechado_em timestamptz,
  aprovado_em timestamptz,
  criado_em timestamptz not null default timezone('utc',now()),
  atualizado_em timestamptz not null default timezone('utc',now()),
  unique(administracao_id, competencia),
  check (competencia = date_trunc('month',competencia)::date)
);

create index if not exists fechamentos_loja_competencia_idx on public.fechamentos_mensais(loja_id, competencia desc);
alter table public.fechamentos_mensais enable row level security;
drop policy if exists "fechamentos: membros leem" on public.fechamentos_mensais;
create policy "fechamentos: membros leem" on public.fechamentos_mensais for select to authenticated using (public.usuario_pertence_loja(loja_id));
drop policy if exists "fechamentos: tesouraria escreve" on public.fechamentos_mensais;
create policy "fechamentos: tesouraria escreve" on public.fechamentos_mensais for all to authenticated using (public.usuario_pode_escrever(loja_id,'/tesouraria')) with check (public.usuario_pode_escrever(loja_id,'/tesouraria'));

create or replace function public.preparar_fechamento_mensal() returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.competencia := date_trunc('month',new.competencia)::date;
  new.atualizado_em := timezone('utc',now());
  if new.status='Fechado' and (old.status is distinct from 'Fechado') then new.fechado_em:=timezone('utc',now()); new.responsavel_fechamento_id:=auth.uid(); end if;
  if new.status='Aprovado' and (old.status is distinct from 'Aprovado') then
    if old.status <> 'Fechado' then raise exception 'O fechamento precisa estar Fechado antes da aprovação.'; end if;
    new.aprovado_em:=timezone('utc',now()); new.responsavel_aprovacao_id:=auth.uid();
  end if;
  if new.status='Reaberto' and coalesce(trim(new.motivo_reabertura),'')='' then raise exception 'Informe o motivo da reabertura.'; end if;
  return new;
end; $$;
drop trigger if exists preparar_fechamento_mensal on public.fechamentos_mensais;
create trigger preparar_fechamento_mensal before insert or update on public.fechamentos_mensais for each row execute function public.preparar_fechamento_mensal();

-- Impede alteração comum no Livro Caixa enquanto o período estiver protegido.
create or replace function public.proteger_periodo_financeiro() returns trigger language plpgsql security definer set search_path=public as $$
declare status_fechamento text; competencia_alvo date;
begin
  competencia_alvo:=date_trunc('month',coalesce(new.data,old.data))::date;
  select f.status into status_fechamento from public.fechamentos_mensais f where f.loja_id=coalesce(new.loja_id,old.loja_id) and f.administracao_id=coalesce(new.administracao_id,old.administracao_id) and f.competencia=competencia_alvo limit 1;
  if status_fechamento in ('Fechado','Aprovado') then raise exception 'Este período possui fechamento mensal protegido. Reabra-o com justificativa antes de alterar.'; end if;
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;
drop trigger if exists proteger_periodo_financeiro on public.lancamentos_financeiros;
create trigger proteger_periodo_financeiro before insert or update or delete on public.lancamentos_financeiros for each row execute function public.proteger_periodo_financeiro();

do $$ begin
  if to_regprocedure('public.registrar_auditoria_operacional()') is not null then
    drop trigger if exists auditoria_operacional on public.fechamentos_mensais;
    create trigger auditoria_operacional after insert or update or delete on public.fechamentos_mensais for each row execute function public.registrar_auditoria_operacional();
  end if;
end $$;
