-- SIGMA 2.0: Secretaria profissional, Balaustres, Atas, fluxo e PDF.
create table if not exists public.secretaria_documentos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  administracao_id uuid references public.administracoes(id) on delete restrict,
  sessao_id uuid references public.sessoes(id) on delete restrict,
  numero text not null,
  categoria text not null check (categoria in ('Balaústre','Ata Administrativa')),
  tipo text not null check (tipo in ('Balaústre de Sessão Ordinária','Balaústre de Sessão Magna','Ata de Reunião Administrativa','Ata de Diretoria','Documento avulso da Secretaria')),
  data date not null,
  grau text,
  horario_inicio time,
  horario_abertura_livro_lei time,
  horario_encerramento time,
  cargos jsonb not null default '{}'::jsonb check (jsonb_typeof(cargos) = 'object'),
  expediente text,
  ordem_dia text,
  quarto_hora text,
  tronco_solidariedade text,
  palavra_bem_ordem text,
  visitantes text,
  encerramento text,
  anotacoes_brutas text,
  texto_oficial text,
  status text not null default 'Rascunho' check (status in ('Rascunho','Em revisão','Aguardando aprovação','Aprovado','Arquivado','Cancelado')),
  tem_financeiro boolean not null default false,
  tem_presenca boolean not null default false,
  orador_aplicavel boolean not null default false,
  pdf_url text,
  aprovado_por uuid references auth.users(id) on delete set null,
  aprovado_em timestamptz,
  reabertura_justificativa text,
  versao integer not null default 1 check (versao > 0),
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  atualizado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (loja_id, numero, categoria),
  check ((categoria='Balaústre' and tipo in ('Balaústre de Sessão Ordinária','Balaústre de Sessão Magna')) or (categoria='Ata Administrativa' and tipo in ('Ata de Reunião Administrativa','Ata de Diretoria','Documento avulso da Secretaria')))
);

create table if not exists public.secretaria_deliberacoes (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.secretaria_documentos(id) on delete cascade,
  loja_id uuid not null references public.lojas(id) on delete restrict,
  descricao text not null check (length(trim(descricao)) > 0),
  responsavel text,
  prazo date,
  status text not null default 'Pendente' check (status in ('Pendente','Em andamento','Concluída','Cancelada')),
  criado_em timestamptz not null default now()
);

create table if not exists public.secretaria_documento_historico (
  id bigint generated always as identity primary key,
  documento_id uuid not null references public.secretaria_documentos(id) on delete cascade,
  loja_id uuid not null references public.lojas(id) on delete restrict,
  usuario_id uuid references auth.users(id) on delete set null,
  acao text not null,
  status_anterior text,
  status_novo text,
  justificativa text,
  ocorrido_em timestamptz not null default now()
);

create table if not exists public.secretaria_documento_liberacoes (
  documento_id uuid not null references public.secretaria_documentos(id) on delete cascade,
  loja_id uuid not null references public.lojas(id) on delete restrict,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  liberado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  liberado_em timestamptz not null default now(),
  primary key (documento_id, usuario_id)
);

create index if not exists secretaria_documentos_loja_status_idx on public.secretaria_documentos(loja_id, categoria, status, data desc);
create index if not exists secretaria_documentos_sessao_idx on public.secretaria_documentos(sessao_id) where sessao_id is not null;
create index if not exists secretaria_historico_documento_idx on public.secretaria_documento_historico(documento_id, ocorrido_em desc);

create or replace function public.perfil_secretaria_loja(alvo_loja uuid)
returns text language sql stable security definer set search_path=public as $$
  select coalesce(lu.perfil, p.perfil)
  from public.profiles p
  join public.loja_usuarios lu on lu.usuario_id=p.id and lu.loja_id=alvo_loja
  where p.id=auth.uid() and p.status='ativo' and lu.status='ativo'
  limit 1
$$;

create or replace function public.pode_ver_documento_secretaria(alvo_documento uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.secretaria_documentos d
    where d.id=alvo_documento and (
      public.perfil_secretaria_loja(d.loja_id) in ('Administrador','Venerável Mestre','Secretário')
      or (public.perfil_secretaria_loja(d.loja_id)='Tesoureiro' and d.tem_financeiro)
      or (public.perfil_secretaria_loja(d.loja_id)='Chanceler' and d.tem_presenca)
      or (public.perfil_secretaria_loja(d.loja_id)='Orador' and d.orador_aplicavel)
      or exists(select 1 from public.secretaria_documento_liberacoes l where l.documento_id=d.id and l.usuario_id=auth.uid())
    )
  )
$$;

create or replace function public.preparar_documento_secretaria()
returns trigger language plpgsql security definer set search_path=public as $$
declare fluxo boolean := coalesce(current_setting('sigma.secretaria_fluxo', true),'0')='1';
begin
  if new.administracao_id is not null and not exists(select 1 from public.administracoes a where a.id=new.administracao_id and a.loja_id=new.loja_id) then raise exception 'A Gestão deve pertencer à mesma Loja.'; end if;
  if new.sessao_id is not null and not exists(select 1 from public.sessoes s where s.id=new.sessao_id and s.loja_id=new.loja_id) then raise exception 'A Sessão deve pertencer à mesma Loja.'; end if;
  if tg_op='INSERT' then
    if new.status <> 'Rascunho' then raise exception 'Todo documento deve iniciar como Rascunho.'; end if;
    new.criado_por=auth.uid(); new.atualizado_por=auth.uid(); new.criado_em=now(); new.atualizado_em=now();
  else
    if new.loja_id is distinct from old.loja_id then raise exception 'Não é permitido transferir documento entre Lojas.' using errcode='42501'; end if;
    if old.status in ('Aprovado','Arquivado') and not fluxo then
      raise exception 'Documento aprovado esta bloqueado. Reabra com justificativa.' using errcode='42501';
    end if;
    if new.status is distinct from old.status and not fluxo then
      raise exception 'Use o fluxo oficial para alterar o status.' using errcode='42501';
    end if;
    if not fluxo then
      new.criado_por=old.criado_por; new.criado_em=old.criado_em; new.aprovado_por=old.aprovado_por;
      new.aprovado_em=old.aprovado_em; new.pdf_url=old.pdf_url; new.versao=old.versao;
      new.reabertura_justificativa=old.reabertura_justificativa;
    end if;
    new.atualizado_por=auth.uid(); new.atualizado_em=now();
  end if;
  return new;
end $$;

drop trigger if exists preparar_documento_secretaria on public.secretaria_documentos;
create trigger preparar_documento_secretaria before insert or update on public.secretaria_documentos for each row execute function public.preparar_documento_secretaria();

create or replace function public.movimentar_documento_secretaria(p_documento uuid, p_acao text, p_justificativa text default null)
returns public.secretaria_documentos language plpgsql security definer set search_path=public as $$
declare d public.secretaria_documentos; perfil text; novo_status text;
begin
  select * into d from public.secretaria_documentos where id=p_documento for update;
  if d.id is null then raise exception 'Documento nao encontrado.' using errcode='P0002'; end if;
  perfil:=public.perfil_secretaria_loja(d.loja_id);
  if perfil is null then raise exception 'Acesso negado.' using errcode='42501'; end if;
  if p_acao='ENVIAR_REVISAO' then
    if perfil not in ('Administrador','Secretário') or d.status<>'Rascunho' then raise exception 'Somente rascunhos podem ser enviados pelo Secretário.' using errcode='42501'; end if;
    if length(trim(coalesce(d.texto_oficial,'')))<20 then raise exception 'Gere ou escreva o texto oficial antes de enviar.'; end if;
    novo_status:='Em revisão';
  elsif p_acao='SOLICITAR_APROVACAO' then
    if perfil not in ('Administrador','Venerável Mestre') or d.status<>'Em revisão' then raise exception 'A revisão deve ser feita pelo Venerável Mestre.' using errcode='42501'; end if;
    novo_status:='Aguardando aprovação';
  elsif p_acao='APROVAR' then
    if perfil not in ('Administrador','Venerável Mestre') or d.status<>'Aguardando aprovação' then raise exception 'Documento ainda não está aguardando aprovação.' using errcode='42501'; end if;
    novo_status:='Aprovado';
  elsif p_acao='ARQUIVAR' then
    if perfil not in ('Administrador','Venerável Mestre') or d.status<>'Aprovado' then raise exception 'Somente documento aprovado pode ser arquivado.' using errcode='42501'; end if;
    novo_status:='Arquivado';
  elsif p_acao='CANCELAR' then
    if perfil<>'Administrador' or d.status in ('Aprovado','Arquivado') then raise exception 'Cancelamento nao permitido.' using errcode='42501'; end if;
    novo_status:='Cancelado';
  elsif p_acao='REABRIR' then
    if perfil not in ('Administrador','Venerável Mestre') or d.status not in ('Aprovado','Arquivado') then raise exception 'Reabertura não permitida.' using errcode='42501'; end if;
    if length(trim(coalesce(p_justificativa,'')))<10 then raise exception 'Informe justificativa com pelo menos 10 caracteres.'; end if;
    novo_status:='Rascunho';
  else raise exception 'Acao invalida.';
  end if;
  perform set_config('sigma.secretaria_fluxo','1',true);
  update public.secretaria_documentos set
    status=novo_status,
    aprovado_por=case when novo_status='Aprovado' then auth.uid() when p_acao='REABRIR' then null else aprovado_por end,
    aprovado_em=case when novo_status='Aprovado' then now() when p_acao='REABRIR' then null else aprovado_em end,
    pdf_url=case when novo_status='Aprovado' then '/api/secretaria/documentos/'||id||'/pdf' when p_acao='REABRIR' then null else pdf_url end,
    reabertura_justificativa=case when p_acao='REABRIR' then trim(p_justificativa) else reabertura_justificativa end,
    versao=case when p_acao='REABRIR' then versao+1 else versao end
  where id=p_documento returning * into d;
  -- A excecao interna deve durar apenas durante a atualizacao atomica do fluxo.
  -- Sem esta revogacao, outra escrita na mesma transacao poderia contornar o bloqueio.
  perform set_config('sigma.secretaria_fluxo','0',true);
  insert into public.secretaria_documento_historico(documento_id,loja_id,usuario_id,acao,status_anterior,status_novo,justificativa)
  values(d.id,d.loja_id,auth.uid(),p_acao,(select status_anterior from (values(case p_acao when 'ENVIAR_REVISAO' then 'Rascunho' when 'SOLICITAR_APROVACAO' then 'Em revisão' when 'APROVAR' then 'Aguardando aprovação' when 'ARQUIVAR' then 'Aprovado' when 'REABRIR' then 'Aprovado/Arquivado' else 'Anterior' end)) x(status_anterior)),novo_status,nullif(trim(coalesce(p_justificativa,'')),''));
  return d;
end $$;

alter table public.secretaria_documentos enable row level security;
alter table public.secretaria_deliberacoes enable row level security;
alter table public.secretaria_documento_historico enable row level security;
alter table public.secretaria_documento_liberacoes enable row level security;

create policy "secretaria profissional: leitura segmentada" on public.secretaria_documentos for select to authenticated using(public.pode_ver_documento_secretaria(id));
create policy "secretaria profissional: cria" on public.secretaria_documentos for insert to authenticated with check(public.perfil_secretaria_loja(loja_id) in ('Administrador','Secretário'));
create policy "secretaria profissional: edita" on public.secretaria_documentos for update to authenticated using(public.perfil_secretaria_loja(loja_id) in ('Administrador','Secretário')) with check(public.perfil_secretaria_loja(loja_id) in ('Administrador','Secretário'));
create policy "deliberacoes: leitura" on public.secretaria_deliberacoes for select to authenticated using(public.pode_ver_documento_secretaria(documento_id));
create policy "deliberacoes: cria" on public.secretaria_deliberacoes for insert to authenticated with check(public.perfil_secretaria_loja(secretaria_deliberacoes.loja_id) in ('Administrador','Secretário') and exists(select 1 from public.secretaria_documentos d where d.id=secretaria_deliberacoes.documento_id and d.loja_id=secretaria_deliberacoes.loja_id and d.status not in ('Aprovado','Arquivado')));
create policy "deliberacoes: altera" on public.secretaria_deliberacoes for update to authenticated using(public.perfil_secretaria_loja(secretaria_deliberacoes.loja_id) in ('Administrador','Secretário') and exists(select 1 from public.secretaria_documentos d where d.id=secretaria_deliberacoes.documento_id and d.loja_id=secretaria_deliberacoes.loja_id and d.status not in ('Aprovado','Arquivado')));
create policy "deliberacoes: exclui" on public.secretaria_deliberacoes for delete to authenticated using(public.perfil_secretaria_loja(secretaria_deliberacoes.loja_id) in ('Administrador','Secretário') and exists(select 1 from public.secretaria_documentos d where d.id=secretaria_deliberacoes.documento_id and d.loja_id=secretaria_deliberacoes.loja_id and d.status not in ('Aprovado','Arquivado')));
create policy "historico: leitura" on public.secretaria_documento_historico for select to authenticated using(public.pode_ver_documento_secretaria(documento_id));
create policy "liberacoes: leitura" on public.secretaria_documento_liberacoes for select to authenticated using(usuario_id=auth.uid() or public.perfil_secretaria_loja(loja_id) in ('Administrador','Venerável Mestre','Secretário'));
create policy "liberacoes: gestao" on public.secretaria_documento_liberacoes for all to authenticated using(public.perfil_secretaria_loja(loja_id) in ('Administrador','Venerável Mestre')) with check(public.perfil_secretaria_loja(loja_id) in ('Administrador','Venerável Mestre'));

drop trigger if exists auditoria_operacional on public.secretaria_documentos;
create trigger auditoria_operacional after insert or update or delete on public.secretaria_documentos for each row execute function public.registrar_auditoria_operacional();
drop trigger if exists auditoria_operacional on public.secretaria_deliberacoes;
create trigger auditoria_operacional after insert or update or delete on public.secretaria_deliberacoes for each row execute function public.registrar_auditoria_operacional();

revoke all on function public.movimentar_documento_secretaria(uuid,text,text) from public;
grant execute on function public.movimentar_documento_secretaria(uuid,text,text) to authenticated;
grant select,insert,update on public.secretaria_documentos to authenticated;
grant select,insert,update,delete on public.secretaria_deliberacoes to authenticated;
grant select on public.secretaria_documento_historico to authenticated;
grant select,insert,delete on public.secretaria_documento_liberacoes to authenticated;

-- Permissoes de rota para perfis gestores; Obreiro permanece sem /secretaria.
update public.profiles set permissoes=(coalesce(permissoes,'[]'::jsonb) || '["/secretaria"]'::jsonb) where perfil in ('Administrador','Venerável Mestre','Secretário','Tesoureiro','Chanceler','Orador') and not (coalesce(permissoes,'[]'::jsonb) ? '/secretaria');
update public.loja_usuarios set permissoes=(coalesce(permissoes,'[]'::jsonb) || '["/secretaria"]'::jsonb) where perfil in ('Administrador','Venerável Mestre','Secretário','Tesoureiro','Chanceler','Orador') and not (coalesce(permissoes,'[]'::jsonb) ? '/secretaria');
