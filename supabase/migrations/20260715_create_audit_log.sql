-- SIGMA 2.0: trilha de auditoria operacional multi-Loja.
-- Migration não destrutiva. Não altera nem remove registros existentes.

create table if not exists public.auditoria_eventos (
  id bigint generated always as identity primary key,
  loja_id uuid not null references public.lojas(id) on delete restrict,
  usuario_id uuid references auth.users(id) on delete set null,
  tabela text not null,
  operacao text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id text,
  dados_anteriores jsonb,
  dados_posteriores jsonb,
  alteracoes jsonb,
  origem text not null default 'database_trigger',
  ocorrido_em timestamptz not null default timezone('utc', now())
);

create index if not exists auditoria_loja_data_idx
  on public.auditoria_eventos (loja_id, ocorrido_em desc);
create index if not exists auditoria_loja_tabela_idx
  on public.auditoria_eventos (loja_id, tabela, ocorrido_em desc);
create index if not exists auditoria_usuario_idx
  on public.auditoria_eventos (usuario_id, ocorrido_em desc);
create index if not exists auditoria_registro_idx
  on public.auditoria_eventos (tabela, registro_id);

alter table public.auditoria_eventos enable row level security;

drop policy if exists "auditoria: gestores consultam" on public.auditoria_eventos;
create policy "auditoria: gestores consultam"
  on public.auditoria_eventos
  for select to authenticated
  using (
    public.usuario_pode_escrever(loja_id, '/auditoria')
    or public.usuario_pode_escrever(loja_id, '/configuracoes')
  );

-- Não existem políticas de INSERT/UPDATE/DELETE para usuários.
-- Somente os triggers abaixo escrevem na trilha, que permanece imutável pela aplicação.

create or replace function public.calcular_alteracoes_jsonb(anterior jsonb, posterior jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(jsonb_object_agg(chave, jsonb_build_object('antes', anterior -> chave, 'depois', posterior -> chave)), '{}'::jsonb)
  from (
    select distinct chave
    from (
      select jsonb_object_keys(coalesce(anterior, '{}'::jsonb)) as chave
      union all
      select jsonb_object_keys(coalesce(posterior, '{}'::jsonb)) as chave
    ) chaves
    where anterior -> chave is distinct from posterior -> chave
      and chave not in ('updated_at')
  ) alteradas;
$$;

create or replace function public.registrar_auditoria_operacional()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  anterior jsonb;
  posterior jsonb;
  alvo_loja uuid;
  alvo_registro text;
begin
  anterior := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  posterior := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  alvo_loja := case
    when tg_table_name = 'lojas' then coalesce((posterior ->> 'id')::uuid, (anterior ->> 'id')::uuid)
    else coalesce((posterior ->> 'loja_id')::uuid, (anterior ->> 'loja_id')::uuid)
  end;
  alvo_registro := coalesce(posterior ->> 'id', anterior ->> 'id');

  if alvo_loja is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'UPDATE' and public.calcular_alteracoes_jsonb(anterior, posterior) = '{}'::jsonb then
    return new;
  end if;

  insert into public.auditoria_eventos (
    loja_id, usuario_id, tabela, operacao, registro_id,
    dados_anteriores, dados_posteriores, alteracoes
  ) values (
    alvo_loja, auth.uid(), tg_table_name, tg_op, alvo_registro,
    anterior, posterior, public.calcular_alteracoes_jsonb(anterior, posterior)
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

do $$
declare
  tabela text;
  tabelas text[] := array[
    'lojas', 'obreiros', 'sessoes', 'administracoes', 'mensalidades',
    'recebimentos', 'tronco_solidariedade', 'documentos_secretaria',
    'acoes_secretaria', 'processos_secretaria', 'regras_mensalidade',
    'lancamentos_financeiros', 'custos_loja', 'pecas_arquitetura',
    'decisoes_loja'
  ];
begin
  foreach tabela in array tabelas loop
    if to_regclass('public.' || tabela) is not null then
      execute format('drop trigger if exists auditoria_operacional on public.%I', tabela);
      execute format(
        'create trigger auditoria_operacional after insert or update or delete on public.%I for each row execute function public.registrar_auditoria_operacional()',
        tabela
      );
    end if;
  end loop;
end $$;

revoke all on public.auditoria_eventos from anon, authenticated;
grant select on public.auditoria_eventos to authenticated;
revoke all on function public.registrar_auditoria_operacional() from public;
revoke all on function public.calcular_alteracoes_jsonb(jsonb, jsonb) from public;
grant execute on function public.calcular_alteracoes_jsonb(jsonb, jsonb) to authenticated;
