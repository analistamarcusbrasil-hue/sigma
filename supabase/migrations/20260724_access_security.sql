-- Consolida perfis, permissões por ação e eventos de segurança.
alter table public.profiles drop constraint if exists profiles_perfil_check;
alter table public.profiles add constraint profiles_perfil_check check(perfil in('Administrador','Venerável Mestre','Secretário','Tesoureiro','Chanceler','Orador','Consulta','Obreiro'));
alter table public.profiles add column if not exists permissoes_acoes jsonb not null default '{}'::jsonb check(jsonb_typeof(permissoes_acoes)='object');
alter table public.profiles add column if not exists observacoes_administrativas text;
create table if not exists public.eventos_seguranca(id bigint generated always as identity primary key,usuario_id uuid references auth.users(id),loja_id uuid references public.lojas(id),modulo text not null,acao text not null,resultado text not null check(resultado in('permitido','bloqueado')),descricao text,motivo text,ocorrido_em timestamptz not null default now());
alter table public.eventos_seguranca enable row level security;
create policy "seguranca: auditoria le" on public.eventos_seguranca for select to authenticated using(public.is_administrador() or (loja_id is not null and public.usuario_pode_escrever(loja_id,'/auditoria')));
create or replace function public.usuario_pode_executar(alvo_loja uuid,modulo text,acao text) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles p join public.loja_usuarios lu on lu.usuario_id=p.id where p.id=auth.uid() and p.status='ativo' and lu.loja_id=alvo_loja and (p.perfil='Administrador' or ((p.permissoes ? modulo) and (coalesce(p.permissoes_acoes->modulo,'[]'::jsonb) ? acao or p.permissoes_acoes='{}'::jsonb)))) $$;
grant execute on function public.usuario_pode_executar(uuid,text,text) to authenticated;
create or replace function public.registrar_evento_seguranca(alvo_loja uuid,modulo text,acao text,resultado text,descricao text,motivo text default null) returns void language sql security definer set search_path=public as $$ insert into public.eventos_seguranca(usuario_id,loja_id,modulo,acao,resultado,descricao,motivo) values(auth.uid(),alvo_loja,modulo,acao,resultado,descricao,motivo) $$;
grant execute on function public.registrar_evento_seguranca(uuid,text,text,text,text,text) to authenticated;
