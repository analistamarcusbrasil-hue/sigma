-- Estrutura SaaS multi-Loja aditiva, preservando vínculos e dados existentes.
alter table public.lojas add column if not exists rito text;
alter table public.lojas add column if not exists cnpj text;
alter table public.lojas add column if not exists endereco text;
alter table public.lojas add column if not exists cidade text;
alter table public.lojas add column if not exists pais text not null default 'Brasil';
alter table public.lojas add column if not exists email_institucional text;
alter table public.lojas add column if not exists telefone text;
alter table public.lojas add column if not exists site text;
alter table public.lojas add column if not exists data_fundacao date;
alter table public.lojas add column if not exists status text not null default 'Ativa' check(status in('Ativa','Inativa','Suspensa','Em implantação'));
alter table public.lojas add column if not exists logo_url text;
alter table public.lojas add column if not exists cor_primaria text not null default '#fbbf24';
alter table public.lojas add column if not exists cor_secundaria text not null default '#0f172a';
alter table public.lojas add column if not exists jurisdicao text;
alter table public.lojas add column if not exists templo text;
alter table public.lojas add column if not exists dias_sessao text;
alter table public.lojas add column if not exists horario_sessao time;
alter table public.lojas add column if not exists configuracoes jsonb not null default '{"mensalidade_padrao":0,"dia_vencimento":10,"frequencia_minima":75,"moeda":"BRL"}'::jsonb;
alter table public.lojas add column if not exists rodape_documental text;
alter table public.lojas add column if not exists onboarding_etapa integer not null default 1 check(onboarding_etapa between 1 and 10);
alter table public.lojas add column if not exists onboarding_concluido boolean not null default false;
alter table public.lojas add column if not exists observacoes text;

alter table public.loja_usuarios add column if not exists perfil text;
alter table public.loja_usuarios add column if not exists status text not null default 'ativo' check(status in('convite_enviado','ativo','suspenso','revogado'));
alter table public.loja_usuarios add column if not exists obreiro_id uuid references public.obreiros(id) on delete restrict;
alter table public.loja_usuarios add column if not exists permissoes jsonb not null default '[]'::jsonb check(jsonb_typeof(permissoes)='array');
alter table public.loja_usuarios add column if not exists atualizado_em timestamptz not null default now();
update public.loja_usuarios lu set perfil=p.perfil,status=p.status,obreiro_id=case when p.obreiro_id~*'^[0-9a-f-]{36}$' then p.obreiro_id::uuid end,permissoes=p.permissoes from public.profiles p where p.id=lu.usuario_id and lu.perfil is null;
update public.loja_usuarios set perfil='Obreiro' where perfil is null;
alter table public.loja_usuarios alter column perfil set not null;
create index if not exists loja_usuarios_contexto_idx on public.loja_usuarios(usuario_id,status,loja_id);
create index if not exists lojas_status_idx on public.lojas(status,onboarding_concluido);

create or replace function public.usuario_tem_acesso_loja(alvo_usuario uuid,alvo_loja uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.is_administrador() or exists(select 1 from public.loja_usuarios where usuario_id=alvo_usuario and loja_id=alvo_loja and status='ativo')
$$;
create or replace function public.usuario_perfil_na_loja(alvo_usuario uuid,alvo_loja uuid) returns text language sql stable security definer set search_path=public as $$
 select case when public.is_administrador() then 'Administrador' else (select perfil from public.loja_usuarios where usuario_id=alvo_usuario and loja_id=alvo_loja and status='ativo') end
$$;
create or replace function public.usuario_obreiro_na_loja(alvo_usuario uuid,alvo_loja uuid) returns uuid language sql stable security definer set search_path=public as $$
 select obreiro_id from public.loja_usuarios where usuario_id=alvo_usuario and loja_id=alvo_loja and status='ativo'
$$;
create or replace function public.usuario_pertence_loja(alvo_loja uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.usuario_tem_acesso_loja(auth.uid(),alvo_loja) $$;
grant execute on function public.usuario_tem_acesso_loja(uuid,uuid),public.usuario_perfil_na_loja(uuid,uuid),public.usuario_obreiro_na_loja(uuid,uuid) to authenticated;

create or replace function public.usuario_pode_executar(alvo_loja uuid,modulo text,acao text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.loja_usuarios lu join public.profiles p on p.id=lu.usuario_id where lu.usuario_id=auth.uid() and lu.loja_id=alvo_loja and lu.status='ativo' and p.status='ativo' and (p.perfil='Administrador' or ((lu.permissoes ? modulo or p.permissoes ? modulo) and (coalesce(p.permissoes_acoes->modulo,'[]'::jsonb)?acao or acao='visualizar' or lu.perfil in('Venerável Mestre','Secretário','Tesoureiro','Chanceler') and acao in('criar','editar','aprovar','exportar','gerar_pdf')))))
$$;

drop policy if exists "obreiros: acesso por perfil" on public.obreiros;
create policy "obreiros: acesso por loja e perfil" on public.obreiros for select to authenticated using(public.usuario_pertence_loja(loja_id) and (public.usuario_perfil_na_loja(auth.uid(),loja_id)<>'Obreiro' or id=public.usuario_obreiro_na_loja(auth.uid(),loja_id)));
drop policy if exists "mensalidades: acesso por perfil" on public.mensalidades;
create policy "mensalidades: acesso por loja e perfil" on public.mensalidades for select to authenticated using(public.usuario_pertence_loja(loja_id) and (public.usuario_perfil_na_loja(auth.uid(),loja_id)<>'Obreiro' or obreiro_id=public.usuario_obreiro_na_loja(auth.uid(),loja_id)));
drop policy if exists "recebimentos: acesso por perfil" on public.recebimentos;
create policy "recebimentos: acesso por loja e perfil" on public.recebimentos for select to authenticated using(public.usuario_pertence_loja(loja_id) and (public.usuario_perfil_na_loja(auth.uid(),loja_id)<>'Obreiro' or obreiro_id=public.usuario_obreiro_na_loja(auth.uid(),loja_id)));
drop policy if exists "presencas: acesso por perfil" on public.presencas;
create policy "presencas: acesso por loja e perfil" on public.presencas for select to authenticated using(exists(select 1 from public.sessoes s where s.id=sessao_id and public.usuario_pertence_loja(s.loja_id) and (public.usuario_perfil_na_loja(auth.uid(),s.loja_id)<>'Obreiro' or obreiro_id=public.usuario_obreiro_na_loja(auth.uid(),s.loja_id))));

drop trigger if exists auditoria_operacional on public.lojas;
create trigger auditoria_operacional after update on public.lojas for each row execute function public.registrar_auditoria_operacional();
