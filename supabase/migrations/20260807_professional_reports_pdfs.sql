-- SIGMA 2.0: auditoria imutável de relatórios e PDFs institucionais.
create table if not exists public.relatorios_geracoes (
  id bigint generated always as identity primary key,
  loja_id uuid not null references public.lojas(id) on delete restrict,
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  tipo text not null check (tipo in ('frequencia-sessao','frequencia-mensal','livro-caixa','fechamento-mensal','prestacao-contas','repasse-gestao','tronco-solidariedade','custos-fixos','solicitacoes','balaustre-ata')),
  periodo_inicio date,
  periodo_fim date,
  parametros jsonb not null default '{}'::jsonb check (jsonb_typeof(parametros)='object'),
  disposicao text not null default 'inline' check (disposicao in ('inline','attachment')),
  criado_em timestamptz not null default now(),
  check (periodo_inicio is null or periodo_fim is null or periodo_inicio<=periodo_fim)
);
create index if not exists relatorios_geracoes_loja_data_idx on public.relatorios_geracoes(loja_id, criado_em desc);
alter table public.relatorios_geracoes enable row level security;
drop policy if exists "relatorios: gestores consultam" on public.relatorios_geracoes;
create policy "relatorios: gestores consultam" on public.relatorios_geracoes for select to authenticated
using (public.usuario_pertence_loja(loja_id) and (usuario_id=auth.uid() or public.usuario_pode_escrever(loja_id,'/auditoria')));
drop policy if exists "relatorios: usuario registra" on public.relatorios_geracoes;
create policy "relatorios: usuario registra" on public.relatorios_geracoes for insert to authenticated
with check (usuario_id=auth.uid() and public.usuario_pertence_loja(loja_id));
grant select,insert on public.relatorios_geracoes to authenticated;
grant usage,select on sequence public.relatorios_geracoes_id_seq to authenticated;
drop trigger if exists auditoria_operacional on public.relatorios_geracoes;
create trigger auditoria_operacional after insert on public.relatorios_geracoes for each row execute function public.registrar_auditoria_operacional();

update public.profiles set permissoes=(coalesce(permissoes,'[]'::jsonb)||'["/relatorios"]'::jsonb)
where perfil in ('Administrador','Venerável Mestre','Secretário','Tesoureiro','Chanceler') and not (coalesce(permissoes,'[]'::jsonb)?'/relatorios');
update public.loja_usuarios set permissoes=(coalesce(permissoes,'[]'::jsonb)||'["/relatorios"]'::jsonb)
where perfil in ('Administrador','Venerável Mestre','Secretário','Tesoureiro','Chanceler') and not (coalesce(permissoes,'[]'::jsonb)?'/relatorios');
