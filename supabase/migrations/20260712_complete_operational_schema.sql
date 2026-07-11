-- Complementos necessários para substituir os últimos estados locais.
alter table public.administracoes add column if not exists gestao_anterior_repasse text;
alter table public.administracoes add column if not exists cargos jsonb not null default '{}'::jsonb check (jsonb_typeof(cargos) = 'object');

create table if not exists public.regras_mensalidade (
  id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id) on delete restrict,
  data_inicio date not null, valor numeric(14,2) not null check (valor >= 0), descricao text,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.lancamentos_financeiros (
  id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id) on delete restrict,
  sessao_id uuid references public.sessoes(id) on delete restrict, data date not null,
  tipo text not null check (tipo in ('Tronco de Solidariedade','Receita Extra','Despesa')),
  descricao text not null, valor numeric(14,2) not null check (valor >= 0),
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.custos_loja (
  id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id) on delete restrict,
  fornecedor_nome text not null, cnpj text, tipo_divida text not null, descricao text,
  valor_total numeric(14,2) not null check (valor_total >= 0), parcelas_qtd integer not null check (parcelas_qtd > 0),
  data_inicio date not null, data_fim date, parcelas jsonb not null default '[]'::jsonb check (jsonb_typeof(parcelas) = 'array'),
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.pecas_arquitetura (
  id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id) on delete restrict,
  obreiro_id uuid references public.obreiros(id) on delete restrict, titulo text not null, grau text,
  data_prevista date, status text not null check (status in ('Prevista','Apresentada','Adiada')), observacao text,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.decisoes_loja (
  id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id) on delete restrict,
  documento_id uuid references public.documentos_secretaria(id) on delete restrict,
  sessao_id uuid references public.sessoes(id) on delete restrict, data date not null, texto text not null,
  status text not null check (status in ('Vigente','Revogada')), origem text,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

do $$ declare tabela text; begin
  foreach tabela in array array['regras_mensalidade','lancamentos_financeiros','custos_loja','pecas_arquitetura','decisoes_loja'] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', tabela, tabela);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', tabela, tabela);
    execute format('alter table public.%I enable row level security', tabela);
  end loop;
end $$;

create policy "regras: membros leem" on public.regras_mensalidade for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "regras: tesouraria escreve" on public.regras_mensalidade for all to authenticated using (public.usuario_pode_escrever(loja_id, '/tesouraria')) with check (public.usuario_pode_escrever(loja_id, '/tesouraria'));
create policy "lancamentos: membros leem" on public.lancamentos_financeiros for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "lancamentos: tesouraria escreve" on public.lancamentos_financeiros for all to authenticated using (public.usuario_pode_escrever(loja_id, '/tesouraria')) with check (public.usuario_pode_escrever(loja_id, '/tesouraria'));
create policy "custos: membros leem" on public.custos_loja for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "custos: tesouraria escreve" on public.custos_loja for all to authenticated using (public.usuario_pode_escrever(loja_id, '/tesouraria')) with check (public.usuario_pode_escrever(loja_id, '/tesouraria'));
create policy "pecas: membros leem" on public.pecas_arquitetura for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "pecas: secretaria escreve" on public.pecas_arquitetura for all to authenticated using (public.usuario_pode_escrever(loja_id, '/secretaria')) with check (public.usuario_pode_escrever(loja_id, '/secretaria'));
create policy "decisoes: membros leem" on public.decisoes_loja for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "decisoes: secretaria escreve" on public.decisoes_loja for all to authenticated using (public.usuario_pode_escrever(loja_id, '/secretaria')) with check (public.usuario_pode_escrever(loja_id, '/secretaria'));
