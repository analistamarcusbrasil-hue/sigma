-- Portal do Obreiro, solicitações e comunicação interna. Migration aditiva e sem remoção de dados.
create or replace function public.perfil_atual() returns text language sql stable security definer set search_path=public as $$
  select perfil from public.profiles where id=auth.uid() and status='ativo'
$$;
create or replace function public.obreiro_atual() returns uuid language sql stable security definer set search_path=public as $$
  select case when obreiro_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then obreiro_id::uuid end
  from public.profiles where id=auth.uid() and status='ativo'
$$;
grant execute on function public.perfil_atual() to authenticated;
grant execute on function public.obreiro_atual() to authenticated;

create or replace function public.usuario_pode_executar(alvo_loja uuid,modulo text,acao text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles p join public.loja_usuarios lu on lu.usuario_id=p.id where p.id=auth.uid() and p.status='ativo' and lu.loja_id=alvo_loja and (p.perfil='Administrador' or ((p.permissoes ? modulo) and (
  coalesce(p.permissoes_acoes->modulo,'[]'::jsonb) ? acao or
  (p.perfil in('Consulta','Orador','Obreiro') and acao in('visualizar','exportar','gerar_pdf')) or
  (p.perfil='Obreiro' and modulo='/portal-obreiro' and acao='criar') or
  (p.perfil='Venerável Mestre' and (acao in('visualizar','exportar','gerar_pdf','aprovar','reabrir') or (modulo in('/configuracoes','/prestacao-contas','/comunicados','/solicitacoes') and acao in('criar','editar')))) or
  (p.perfil='Tesoureiro' and modulo in('/tesouraria','/prestacao-contas','/documentos','/comunicados','/solicitacoes') and acao in('visualizar','criar','editar','cancelar','aprovar','exportar','gerar_pdf')) or
  (p.perfil='Secretário' and modulo in('/secretaria','/documentos','/agenda','/chancelaria','/comunicados','/solicitacoes') and acao in('visualizar','criar','editar','cancelar','exportar','gerar_pdf')) or
  (p.perfil='Chanceler' and modulo in('/chancelaria','/agenda','/comunicados','/solicitacoes') and acao in('visualizar','criar','editar','exportar','gerar_pdf'))
 ))))
$$;

alter table public.agenda_eventos add column if not exists visibilidade text not null default 'Público da Loja' check(visibilidade in('Público da Loja','Diretoria','Administração','Restrito'));
alter table public.documentos_gestao add column if not exists visibilidade text not null default 'Restrito' check(visibilidade in('Restrito','Diretoria','Administração','Todos os obreiros','Individual'));
alter table public.documentos_gestao add column if not exists obreiro_id uuid references public.obreiros(id) on delete restrict;
create index if not exists documentos_obreiro_visibilidade_idx on public.documentos_gestao(loja_id,obreiro_id,visibilidade,status);

create table if not exists public.comunicados_internos(
 id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id), administracao_id uuid references public.administracoes(id),
 titulo text not null check(length(trim(titulo))>0), mensagem text not null check(length(trim(mensagem))>0),
 tipo text not null default 'Aviso', prioridade text not null default 'Normal' check(prioridade in('Baixa','Normal','Alta','Urgente')),
 publico_alvo text not null default 'Todos os obreiros', publicado_em timestamptz, expira_em timestamptz,
 status text not null default 'Rascunho' check(status in('Rascunho','Publicado','Arquivado','Expirado')),
 criado_por uuid not null default auth.uid() references auth.users(id), criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table if not exists public.comunicados_leituras(
 comunicado_id uuid not null references public.comunicados_internos(id) on delete cascade, usuario_id uuid not null default auth.uid() references auth.users(id), lido_em timestamptz not null default now(), primary key(comunicado_id,usuario_id)
);
create table if not exists public.solicitacoes_obreiro(
 id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id), administracao_id uuid references public.administracoes(id),
 obreiro_id uuid not null references public.obreiros(id), usuario_id uuid not null default auth.uid() references auth.users(id),
 tipo text not null, titulo text not null check(length(trim(titulo))>0), descricao text not null check(length(trim(descricao))>0), dados_json jsonb not null default '{}'::jsonb,
 status text not null default 'Pendente' check(status in('Pendente','Em análise','Aprovada','Recusada','Concluída','Cancelada')),
 responsavel_id uuid references public.obreiros(id), resposta text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), respondido_em timestamptz
);
create index if not exists comunicados_loja_status_idx on public.comunicados_internos(loja_id,status,publicado_em desc);
create index if not exists solicitacoes_loja_status_idx on public.solicitacoes_obreiro(loja_id,status,criado_em desc);
create index if not exists solicitacoes_obreiro_idx on public.solicitacoes_obreiro(obreiro_id,criado_em desc);

alter table public.comunicados_internos enable row level security; alter table public.comunicados_leituras enable row level security; alter table public.solicitacoes_obreiro enable row level security;
create policy "comunicados: destinatarios leem" on public.comunicados_internos for select to authenticated using(
 public.usuario_pertence_loja(loja_id) and (public.perfil_atual()<>'Obreiro' or (status='Publicado' and (expira_em is null or expira_em>now()) and (publico_alvo='Todos os obreiros' or publico_alvo=public.perfil_atual())))
);
create policy "comunicados: gestores criam" on public.comunicados_internos for insert to authenticated with check(public.usuario_pode_executar(loja_id,'/comunicados','criar'));
create policy "comunicados: gestores editam" on public.comunicados_internos for update to authenticated using(public.usuario_pode_executar(loja_id,'/comunicados','editar')) with check(public.usuario_pode_executar(loja_id,'/comunicados','editar'));
create policy "leituras: proprio usuario" on public.comunicados_leituras for all to authenticated using(usuario_id=auth.uid()) with check(usuario_id=auth.uid());
create policy "solicitacoes: proprio obreiro le" on public.solicitacoes_obreiro for select to authenticated using(usuario_id=auth.uid() or public.usuario_pode_executar(loja_id,'/solicitacoes','visualizar'));
create policy "solicitacoes: proprio obreiro cria" on public.solicitacoes_obreiro for insert to authenticated with check(usuario_id=auth.uid() and obreiro_id=public.obreiro_atual() and public.usuario_pertence_loja(loja_id));
create policy "solicitacoes: proprio obreiro cancela" on public.solicitacoes_obreiro for update to authenticated using(usuario_id=auth.uid() and status='Pendente') with check(usuario_id=auth.uid() and status='Cancelada');
create policy "solicitacoes: gestores respondem" on public.solicitacoes_obreiro for update to authenticated using(public.usuario_pode_executar(loja_id,'/solicitacoes','editar')) with check(public.usuario_pode_executar(loja_id,'/solicitacoes','editar'));

drop policy if exists "obreiros: membros leem" on public.obreiros;
create policy "obreiros: acesso por perfil" on public.obreiros for select to authenticated using(public.usuario_pertence_loja(loja_id) and (public.perfil_atual()<>'Obreiro' or id=public.obreiro_atual()));
drop policy if exists "presencas: membros leem" on public.presencas;
create policy "presencas: acesso por perfil" on public.presencas for select to authenticated using((public.perfil_atual()<>'Obreiro' or obreiro_id=public.obreiro_atual()) and exists(select 1 from public.sessoes s where s.id=sessao_id and public.usuario_pertence_loja(s.loja_id)));
drop policy if exists "mensalidades: membros leem" on public.mensalidades;
create policy "mensalidades: acesso por perfil" on public.mensalidades for select to authenticated using(public.usuario_pertence_loja(loja_id) and (public.perfil_atual()<>'Obreiro' or obreiro_id=public.obreiro_atual()));
drop policy if exists "recebimentos: membros leem" on public.recebimentos;
create policy "recebimentos: acesso por perfil" on public.recebimentos for select to authenticated using(public.usuario_pertence_loja(loja_id) and (public.perfil_atual()<>'Obreiro' or obreiro_id=public.obreiro_atual()));
drop policy if exists "agenda: membros leem" on public.agenda_eventos;
create policy "agenda: acesso por visibilidade" on public.agenda_eventos for select to authenticated using(public.usuario_pertence_loja(loja_id) and (public.perfil_atual()<>'Obreiro' or visibilidade='Público da Loja'));
drop policy if exists "documentos leem" on public.documentos_gestao;
create policy "documentos: acesso por visibilidade" on public.documentos_gestao for select to authenticated using(public.usuario_pertence_loja(loja_id) and (public.perfil_atual()<>'Obreiro' or visibilidade='Todos os obreiros' or (visibilidade='Individual' and obreiro_id=public.obreiro_atual())));

update public.profiles set permissoes=permissoes||'["/portal-obreiro"]'::jsonb where perfil='Obreiro' and not(permissoes?'/portal-obreiro');
update public.profiles set permissoes=permissoes||'["/comunicados","/solicitacoes"]'::jsonb where perfil in('Administrador','Venerável Mestre','Secretário','Tesoureiro','Chanceler') and not(permissoes?'/comunicados');

create trigger auditoria_operacional after insert or update or delete on public.comunicados_internos for each row execute function public.registrar_auditoria_operacional();
create trigger auditoria_operacional after insert or update or delete on public.solicitacoes_obreiro for each row execute function public.registrar_auditoria_operacional();
