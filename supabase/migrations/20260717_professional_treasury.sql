-- SIGMA 2.0: fundação profissional da Tesouraria.
-- Não destrutiva: lançamentos existentes permanecem válidos.

create table if not exists public.contas_financeiras (
  id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id) on delete restrict,
  nome text not null check (length(trim(nome)) > 0), tipo text not null check (tipo in ('Caixa', 'Conta corrente', 'Poupança', 'Investimento')),
  banco text, agencia text, numero text, saldo_inicial numeric(14,2) not null default 0, ativa boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()),
  unique (loja_id, nome)
);
create table if not exists public.categorias_financeiras (
  id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id) on delete restrict,
  nome text not null check (length(trim(nome)) > 0), natureza text not null check (natureza in ('Receita', 'Despesa')),
  cor text, ativa boolean not null default true, created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()), unique (loja_id, nome, natureza)
);
create table if not exists public.centros_custo (
  id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id) on delete restrict,
  nome text not null check (length(trim(nome)) > 0), descricao text, ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()),
  unique (loja_id, nome)
);

alter table public.lancamentos_financeiros add column if not exists conta_id uuid references public.contas_financeiras(id) on delete restrict;
alter table public.lancamentos_financeiros add column if not exists categoria_id uuid references public.categorias_financeiras(id) on delete restrict;
alter table public.lancamentos_financeiros add column if not exists centro_custo_id uuid references public.centros_custo(id) on delete restrict;
alter table public.lancamentos_financeiros add column if not exists competencia date;
alter table public.lancamentos_financeiros add column if not exists vencimento date;
alter table public.lancamentos_financeiros add column if not exists data_pagamento date;
alter table public.lancamentos_financeiros add column if not exists forma_pagamento text;
alter table public.lancamentos_financeiros add column if not exists situacao text not null default 'Efetivado';
alter table public.lancamentos_financeiros add column if not exists comprovante_url text;
alter table public.lancamentos_financeiros add column if not exists conciliado_em timestamptz;
alter table public.lancamentos_financeiros drop constraint if exists lancamentos_financeiros_situacao_check;
alter table public.lancamentos_financeiros add constraint lancamentos_financeiros_situacao_check check (situacao in ('Previsto', 'Pendente', 'Parcial', 'Efetivado', 'Cancelado'));

create index if not exists contas_financeiras_loja_idx on public.contas_financeiras(loja_id, ativa);
create index if not exists categorias_financeiras_loja_idx on public.categorias_financeiras(loja_id, natureza, ativa);
create index if not exists centros_custo_loja_idx on public.centros_custo(loja_id, ativo);
create index if not exists lancamentos_conta_data_idx on public.lancamentos_financeiros(loja_id, conta_id, data desc);
create index if not exists lancamentos_categoria_idx on public.lancamentos_financeiros(loja_id, categoria_id, data desc);
create index if not exists lancamentos_vencimento_idx on public.lancamentos_financeiros(loja_id, situacao, vencimento);

do $$ declare tabela text; begin
  foreach tabela in array array['contas_financeiras','categorias_financeiras','centros_custo'] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', tabela, tabela);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', tabela, tabela);
    execute format('alter table public.%I enable row level security', tabela);
    execute format('drop policy if exists "%s: membros leem" on public.%I', tabela, tabela);
    execute format('drop policy if exists "%s: tesouraria escreve" on public.%I', tabela, tabela);
    execute format('create policy "%s: membros leem" on public.%I for select to authenticated using (public.usuario_pertence_loja(loja_id))', tabela, tabela);
    execute format('create policy "%s: tesouraria escreve" on public.%I for all to authenticated using (public.usuario_pode_escrever(loja_id, ''/tesouraria'')) with check (public.usuario_pode_escrever(loja_id, ''/tesouraria''))', tabela, tabela);
  end loop;
end $$;

insert into public.categorias_financeiras (loja_id, nome, natureza, cor)
select l.id, padrao.nome, padrao.natureza, padrao.cor from public.lojas l cross join (values
  ('Mensalidades','Receita','#34d399'), ('Doações','Receita','#38bdf8'), ('Eventos','Receita','#a78bfa'),
  ('Tronco de Solidariedade','Receita','#fbbf24'), ('Taxas e potência','Despesa','#fb7185'),
  ('Manutenção','Despesa','#f97316'), ('Serviços','Despesa','#ef4444'), ('Eventos','Despesa','#c084fc')
) as padrao(nome, natureza, cor)
on conflict (loja_id, nome, natureza) do nothing;

do $$ declare tabela text; begin
  if to_regprocedure('public.registrar_auditoria_operacional()') is not null then
    foreach tabela in array array['contas_financeiras','categorias_financeiras','centros_custo'] loop
      execute format('drop trigger if exists auditoria_operacional on public.%I', tabela);
      execute format('create trigger auditoria_operacional after insert or update or delete on public.%I for each row execute function public.registrar_auditoria_operacional()', tabela);
    end loop;
  end if;
end $$;

