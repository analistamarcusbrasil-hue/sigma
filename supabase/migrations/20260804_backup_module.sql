-- Módulo profissional de Backup/BKP por Loja ativa.
-- Mantém arquivos privados, metadados auditáveis e isolamento multi-Loja.

create table if not exists public.backups_sistema (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  tipo_backup text not null default 'backup_loja'
    check (tipo_backup in ('backup_loja','backup_pre_restauracao')),
  escopo text not null default 'Loja ativa'
    check (escopo in ('Loja ativa')),
  versao_backup text not null default '1.0',
  nome_arquivo text not null,
  caminho_storage text,
  tamanho_bytes bigint not null default 0 check (tamanho_bytes >= 0),
  hash_arquivo text,
  status text not null default 'Em andamento'
    check (status in ('Criado','Em andamento','Concluído','Falhou','Restaurado','Excluído')),
  criado_por uuid references public.profiles(id) on delete set null,
  criado_em timestamptz not null default now(),
  restaurado_por uuid references public.profiles(id) on delete set null,
  restaurado_em timestamptz,
  excluido_por uuid references public.profiles(id) on delete set null,
  excluido_em timestamptz,
  observacao text,
  erro text,
  metadados jsonb not null default '{}'::jsonb check (jsonb_typeof(metadados)='object'),
  conteudo jsonb,
  backup_origem_id uuid references public.backups_sistema(id) on delete set null,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.backups_eventos (
  id bigint generated always as identity primary key,
  backup_id uuid references public.backups_sistema(id) on delete set null,
  loja_id uuid not null references public.lojas(id) on delete restrict,
  usuario_id uuid references public.profiles(id) on delete set null,
  acao text not null check (acao in (
    'backup_iniciado','backup_concluido','backup_falhou','backup_baixado',
    'restauracao_iniciada','restauracao_previsualizada','restauracao_concluida',
    'restauracao_falhou','backup_excluido','acesso_negado'
  )),
  resultado text not null check (resultado in ('Sucesso','Falha','Bloqueado','Simulado')),
  justificativa text,
  ip text,
  user_agent text,
  erro text,
  metadados jsonb not null default '{}'::jsonb check (jsonb_typeof(metadados)='object'),
  criado_em timestamptz not null default now()
);

create index if not exists backups_sistema_loja_data_idx
  on public.backups_sistema(loja_id, criado_em desc);
create index if not exists backups_sistema_status_idx
  on public.backups_sistema(loja_id, status, criado_em desc);
create index if not exists backups_eventos_backup_data_idx
  on public.backups_eventos(backup_id, criado_em desc);

create or replace function public.pode_gerenciar_backup(alvo_loja uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_administrador()
    or exists (
      select 1
      from public.loja_usuarios lu
      join public.profiles p on p.id=lu.usuario_id
      where lu.usuario_id=auth.uid()
        and lu.loja_id=alvo_loja
        and lu.status='ativo'
        and p.status='ativo'
        and coalesce(lu.perfil,p.perfil)='Venerável Mestre'
    )
$$;

grant execute on function public.pode_gerenciar_backup(uuid) to authenticated;

alter table public.backups_sistema enable row level security;
alter table public.backups_eventos enable row level security;

drop policy if exists "backups: gestores visualizam por loja" on public.backups_sistema;
create policy "backups: gestores visualizam por loja"
on public.backups_sistema for select to authenticated
using (public.pode_gerenciar_backup(loja_id));

drop policy if exists "backups: gestores criam por loja" on public.backups_sistema;
create policy "backups: gestores criam por loja"
on public.backups_sistema for insert to authenticated
with check (
  public.pode_gerenciar_backup(loja_id)
  and criado_por=auth.uid()
);

drop policy if exists "backups: gestores atualizam por loja" on public.backups_sistema;
create policy "backups: gestores atualizam por loja"
on public.backups_sistema for update to authenticated
using (public.pode_gerenciar_backup(loja_id))
with check (public.pode_gerenciar_backup(loja_id));

drop policy if exists "backup eventos: gestores visualizam por loja" on public.backups_eventos;
create policy "backup eventos: gestores visualizam por loja"
on public.backups_eventos for select to authenticated
using (public.pode_gerenciar_backup(loja_id));

drop policy if exists "backup eventos: usuário registra própria ação" on public.backups_eventos;
create policy "backup eventos: usuário registra própria ação"
on public.backups_eventos for insert to authenticated
with check (
  public.pode_gerenciar_backup(loja_id)
  and usuario_id=auth.uid()
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('backups-sigma','backups-sigma',false,52428800,array['application/json'])
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "backups storage: gestores leem loja" on storage.objects;
create policy "backups storage: gestores leem loja"
on storage.objects for select to authenticated
using (
  bucket_id='backups-sigma'
  and split_part(name,'/',1)~*'^[0-9a-f-]{36}$'
  and public.pode_gerenciar_backup(split_part(name,'/',1)::uuid)
);

-- Venerável Mestre recebe o módulo por Loja; os demais perfis continuam sem acesso.
update public.profiles
set permissoes = case
  when coalesce(permissoes,'[]'::jsonb) ? '/backup' then permissoes
  else coalesce(permissoes,'[]'::jsonb) || '["/backup"]'::jsonb
end
where perfil='Venerável Mestre';

update public.loja_usuarios
set permissoes = case
  when coalesce(permissoes,'[]'::jsonb) ? '/backup' then permissoes
  else coalesce(permissoes,'[]'::jsonb) || '["/backup"]'::jsonb
end,
atualizado_em=now()
where perfil='Venerável Mestre' and status='ativo';

drop trigger if exists auditoria_operacional on public.backups_sistema;
create trigger auditoria_operacional
after insert or update on public.backups_sistema
for each row execute function public.registrar_auditoria_operacional();

insert into supabase_migrations.schema_migrations(version,name)
values('20260804','backup_module')
on conflict(version) do update set name=excluded.name;
