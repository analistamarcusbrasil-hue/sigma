-- SIGMA 2.0: prestação de contas final de mandato, aditiva e auditável.
create table if not exists public.prestacoes_finais (
 id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id) on delete restrict,
 administracao_id uuid not null references public.administracoes(id) on delete restrict,
 status text not null default 'Em elaboração' check(status in ('Em elaboração','Em conferência','Pronta para aprovação','Aprovada','Bloqueada')),
 saldo_inicial numeric(14,2) not null default 0, total_receitas numeric(14,2) not null default 0,
 total_despesas numeric(14,2) not null default 0, saldo_final numeric(14,2) not null default 0,
 mensalidades_recebidas numeric(14,2) not null default 0, mensalidades_pendentes numeric(14,2) not null default 0,
 total_tronco numeric(14,2) not null default 0, despesas_pendentes numeric(14,2) not null default 0,
 lancamentos_sem_comprovante integer not null default 0 check(lancamentos_sem_comprovante>=0),
 caixa_fisico_final numeric(14,2) not null default 0, conta_bancaria_final numeric(14,2) not null default 0,
 creditos_a_receber numeric(14,2) not null default 0, obrigacoes_a_pagar numeric(14,2) not null default 0,
 saldo_liquido_repasse numeric(14,2) not null default 0,
 observacoes_tesoureiro text, observacoes_veneravel text, pendencias_administrativas text,
 justificativa_fechamentos text, observacoes_comprovantes text, observacoes_gerais text,
 aprovado_por uuid references auth.users(id) on delete set null, aprovado_em timestamptz,
 criado_em timestamptz not null default timezone('utc',now()), atualizado_em timestamptz not null default timezone('utc',now()),
 unique(administracao_id)
);
create index if not exists prestacoes_finais_loja_idx on public.prestacoes_finais(loja_id,status);
alter table public.prestacoes_finais enable row level security;
drop policy if exists "prestacoes finais: membros leem" on public.prestacoes_finais;
create policy "prestacoes finais: membros leem" on public.prestacoes_finais for select to authenticated using(public.usuario_pertence_loja(loja_id));
drop policy if exists "prestacoes finais: tesouraria escreve" on public.prestacoes_finais;
create policy "prestacoes finais: tesouraria escreve" on public.prestacoes_finais for all to authenticated using(public.usuario_pode_escrever(loja_id,'/prestacao-contas')) with check(public.usuario_pode_escrever(loja_id,'/prestacao-contas'));
create or replace function public.preparar_prestacao_final() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and old.status in ('Aprovada','Bloqueada') then raise exception 'A prestação final aprovada está protegida.'; end if;
 if new.status='Aprovada' then
  if tg_op='INSERT' or old.status<>'Pronta para aprovação' then raise exception 'A prestação precisa estar pronta para aprovação.'; end if;
  new.aprovado_por:=auth.uid(); new.aprovado_em:=timezone('utc',now());
 end if;
 new.atualizado_em:=timezone('utc',now()); return new;
end; $$;
drop trigger if exists preparar_prestacao_final on public.prestacoes_finais;
create trigger preparar_prestacao_final before insert or update on public.prestacoes_finais for each row execute function public.preparar_prestacao_final();
do $$ begin if to_regprocedure('public.registrar_auditoria_operacional()') is not null then
 drop trigger if exists auditoria_operacional on public.prestacoes_finais;
 create trigger auditoria_operacional after insert or update or delete on public.prestacoes_finais for each row execute function public.registrar_auditoria_operacional();
end if; end $$;
