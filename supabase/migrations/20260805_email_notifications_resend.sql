-- Notificações transacionais por e-mail com Resend, isolamento por Loja e auditoria.
-- Nenhum corpo funcional, senha ou dado sensível é persistido na fila.

alter table public.notificacoes_email
  alter column solicitacao_id drop not null,
  alter column tramitacao_id drop not null,
  add column if not exists loja_id uuid references public.lojas(id) on delete cascade,
  add column if not exists comunicado_id uuid references public.comunicados_internos(id) on delete set null,
  add column if not exists evento_tipo text not null default 'Atualização no SIGMA',
  add column if not exists rota_destino text not null default '/',
  add column if not exists dedupe_key text,
  add column if not exists provider_id text,
  add column if not exists processado_em timestamptz,
  add column if not exists reenviado_de uuid references public.notificacoes_email(id) on delete set null,
  add column if not exists ultima_acao_por uuid references public.profiles(id) on delete set null;

update public.notificacoes_email n
set loja_id=s.loja_id,
    evento_tipo=case
      when s.tipo in('Justificativa de falta','Frequência e presença') then 'Justificativa atualizada'
      when s.tipo='Envio de comprovante de pagamento' then 'Comprovante atualizado'
      else 'Solicitação atualizada'
    end,
    rota_destino='/portal-obreiro',
    mensagem='Há uma nova atualização disponível no SIGMA.'
from public.solicitacoes_obreiro s
where n.solicitacao_id=s.id and n.loja_id is null;

delete from public.notificacoes_email where loja_id is null;
alter table public.notificacoes_email alter column loja_id set not null;

alter table public.notificacoes_email
  drop constraint if exists notificacoes_email_status_check;
alter table public.notificacoes_email
  add constraint notificacoes_email_status_check
  check(status in('Aguardando configuração','Pendente','Enviando','Enviado','Falhou','Falha','Ignorado'));

update public.notificacoes_email set status='Falhou' where status='Falha';

drop index if exists public.notificacoes_email_dedupe_uidx;
create unique index notificacoes_email_dedupe_uidx
  on public.notificacoes_email(dedupe_key);
create index if not exists notificacoes_email_loja_status_idx
  on public.notificacoes_email(loja_id,status,criado_em desc);
create index if not exists notificacoes_email_destinatario_idx
  on public.notificacoes_email(loja_id,destinatario_usuario_id,criado_em desc);

create table if not exists public.notificacoes_email_eventos(
  id bigint generated always as identity primary key,
  notificacao_id uuid references public.notificacoes_email(id) on delete set null,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  usuario_id uuid references public.profiles(id) on delete set null,
  acao text not null,
  resultado text not null,
  detalhe text,
  criado_em timestamptz not null default now()
);
create index if not exists notificacoes_email_eventos_idx
  on public.notificacoes_email_eventos(loja_id,criado_em desc);

create or replace function public.pode_gerenciar_notificacoes(alvo_loja uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_administrador()
    and exists(
      select 1 from public.loja_usuarios lu
      join public.profiles p on p.id=lu.usuario_id
      where lu.usuario_id=auth.uid()
        and lu.loja_id=alvo_loja
        and lu.status='ativo'
        and p.status='ativo'
    )
$$;
grant execute on function public.pode_gerenciar_notificacoes(uuid) to authenticated;

alter table public.notificacoes_email enable row level security;
alter table public.notificacoes_email_eventos enable row level security;

drop policy if exists "notificacoes: administrador visualiza por loja" on public.notificacoes_email;
create policy "notificacoes: administrador visualiza por loja"
on public.notificacoes_email for select to authenticated
using(public.pode_gerenciar_notificacoes(loja_id));

drop policy if exists "notificacoes: administrador atualiza por loja" on public.notificacoes_email;
create policy "notificacoes: administrador atualiza por loja"
on public.notificacoes_email for update to authenticated
using(public.pode_gerenciar_notificacoes(loja_id))
with check(public.pode_gerenciar_notificacoes(loja_id));

drop policy if exists "notificacoes eventos: administrador visualiza por loja" on public.notificacoes_email_eventos;
create policy "notificacoes eventos: administrador visualiza por loja"
on public.notificacoes_email_eventos for select to authenticated
using(public.pode_gerenciar_notificacoes(loja_id));

grant select,update on public.notificacoes_email to authenticated;
grant select on public.notificacoes_email_eventos to authenticated;
grant all on public.notificacoes_email,public.notificacoes_email_eventos to service_role;

create or replace function public.auditar_notificacao_email()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if tg_op='INSERT' then
    insert into public.notificacoes_email_eventos(
      notificacao_id,loja_id,usuario_id,acao,resultado,detalhe
    ) values(new.id,new.loja_id,new.ultima_acao_por,'Enfileirar',new.status,new.evento_tipo);
  elsif old.status is distinct from new.status or old.tentativas is distinct from new.tentativas then
    insert into public.notificacoes_email_eventos(
      notificacao_id,loja_id,usuario_id,acao,resultado,detalhe
    ) values(
      new.id,new.loja_id,new.ultima_acao_por,
      case when new.status='Pendente' and old.status in('Falhou','Falha') then 'Reenviar' else 'Processar' end,
      new.status,
      case when new.status in('Falhou','Falha','Ignorado','Aguardando configuração')
        then left(coalesce(new.ultimo_erro,new.evento_tipo),500)
        else new.evento_tipo end
    );
  end if;
  return new;
end
$$;

drop trigger if exists auditar_notificacao_email on public.notificacoes_email;
create trigger auditar_notificacao_email
after insert or update of status,tentativas on public.notificacoes_email
for each row execute function public.auditar_notificacao_email();

create or replace function public.enfileirar_email_tramitacao()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  solicitacao public.solicitacoes_obreiro%rowtype;
  destinatario record;
  perfil_destino text;
  tipo_evento text;
  assunto_email text;
  rota text;
begin
  select * into solicitacao
  from public.solicitacoes_obreiro
  where id=new.solicitacao_id;
  if not found then return new; end if;

  tipo_evento := case
    when new.etapa='Recebida' and solicitacao.tipo in('Justificativa de falta','Frequência e presença') then 'Justificativa enviada'
    when new.etapa='Recebida' and solicitacao.tipo='Envio de comprovante de pagamento' then 'Comprovante enviado'
    when new.etapa='Recebida' then 'Solicitação criada pelo Obreiro'
    when new.status_novo='Aprovada' and solicitacao.tipo in('Justificativa de falta','Frequência e presença') then 'Justificativa aprovada'
    when new.status_novo='Recusada' and solicitacao.tipo in('Justificativa de falta','Frequência e presença') then 'Justificativa recusada'
    when new.status_novo='Aprovada' and solicitacao.tipo='Envio de comprovante de pagamento' then 'Comprovante aprovado'
    when new.status_novo='Recusada' and solicitacao.tipo='Envio de comprovante de pagamento' then 'Comprovante recusado'
    when new.tipo_evento='CONCLUIR_ENTREGA' or new.arquivo_url is not null then 'Documento aprovado disponível'
    else 'Solicitação respondida'
  end;
  assunto_email := '[SIGMA] '||tipo_evento;
  rota := case when new.autor_usuario_id=solicitacao.usuario_id
    then '/solicitacoes'
    else '/portal-obreiro' end;

  if new.autor_usuario_id=solicitacao.usuario_id then
    perfil_destino := case
      when new.status_novo='Aguardando aprovação do Venerável' then 'Venerável Mestre'
      else solicitacao.responsavel_tecnico_perfil end;
    for destinatario in
      select distinct p.id,p.email,p.nome
      from public.profiles p
      join public.loja_usuarios lu on lu.usuario_id=p.id
      where lu.loja_id=solicitacao.loja_id
        and lu.status='ativo' and p.status='ativo'
        and coalesce(lu.perfil,p.perfil)=perfil_destino
        and nullif(trim(coalesce(p.email,'')),'') is not null
    loop
      insert into public.notificacoes_email(
        loja_id,solicitacao_id,tramitacao_id,destinatario_usuario_id,
        destinatario_email,destinatario_nome,assunto,mensagem,status,
        evento_tipo,rota_destino,dedupe_key
      ) values(
        solicitacao.loja_id,solicitacao.id,new.id,destinatario.id,
        lower(trim(destinatario.email)),destinatario.nome,assunto_email,
        'Há uma nova atualização disponível no SIGMA.','Pendente',
        tipo_evento,rota,
        'tramitacao:'||new.id::text||':'||destinatario.id::text
      ) on conflict do nothing;
    end loop;
  else
    select p.id,p.email,p.nome into destinatario
    from public.profiles p
    join public.loja_usuarios lu on lu.usuario_id=p.id
    where p.id=solicitacao.usuario_id
      and lu.usuario_id=p.id
      and lu.loja_id=solicitacao.loja_id
      and lu.status='ativo' and p.status='ativo'
      and nullif(trim(coalesce(p.email,'')),'') is not null
    limit 1;
    if found then
      insert into public.notificacoes_email(
        loja_id,solicitacao_id,tramitacao_id,destinatario_usuario_id,
        destinatario_email,destinatario_nome,assunto,mensagem,status,
        evento_tipo,rota_destino,dedupe_key
      ) values(
        solicitacao.loja_id,solicitacao.id,new.id,destinatario.id,
        lower(trim(destinatario.email)),destinatario.nome,assunto_email,
        'Há uma nova atualização disponível no SIGMA.','Pendente',
        tipo_evento,rota,
        'tramitacao:'||new.id::text||':'||destinatario.id::text
      ) on conflict do nothing;
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists enfileirar_email_tramitacao on public.solicitacoes_tramitacoes;
create trigger enfileirar_email_tramitacao
after insert on public.solicitacoes_tramitacoes
for each row execute function public.enfileirar_email_tramitacao();

create or replace function public.enfileirar_email_comunicado()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  destinatario record;
  perfil_destinatario text;
begin
  if new.status<>'Publicado' then return new; end if;
  if tg_op='UPDATE' and old.status='Publicado' then return new; end if;

  for destinatario in
    select distinct p.id,p.email,p.nome,coalesce(lu.perfil,p.perfil) as perfil
    from public.profiles p
    join public.loja_usuarios lu on lu.usuario_id=p.id
    where lu.loja_id=new.loja_id
      and lu.status='ativo' and p.status='ativo'
      and nullif(trim(coalesce(p.email,'')),'') is not null
  loop
    perfil_destinatario := destinatario.perfil;
    if
      (new.publico_alvo='Todos os obreiros' and exists(
        select 1 from public.loja_usuarios lx
        where lx.loja_id=new.loja_id and lx.usuario_id=destinatario.id
          and lx.status='ativo' and (lx.obreiro_id is not null or perfil_destinatario='Obreiro')
      ))
      or (new.publico_alvo='Diretoria' and perfil_destinatario in(
        'Administrador','Venerável Mestre','Secretário','Tesoureiro','Chanceler','Orador'
      ))
      or (new.publico_alvo='Obreiro' and perfil_destinatario='Obreiro')
      or new.publico_alvo=perfil_destinatario
    then
      insert into public.notificacoes_email(
        loja_id,comunicado_id,destinatario_usuario_id,destinatario_email,
        destinatario_nome,assunto,mensagem,status,evento_tipo,rota_destino,dedupe_key
      ) values(
        new.loja_id,new.id,destinatario.id,lower(trim(destinatario.email)),
        destinatario.nome,'[SIGMA] Novo comunicado publicado',
        'Há uma nova atualização disponível no SIGMA.','Pendente',
        'Comunicado publicado','/portal-obreiro',
        'comunicado:'||new.id::text||':'||destinatario.id::text
      ) on conflict do nothing;
    end if;
  end loop;
  return new;
end
$$;

drop trigger if exists enfileirar_email_comunicado on public.comunicados_internos;
create trigger enfileirar_email_comunicado
after insert or update of status on public.comunicados_internos
for each row execute function public.enfileirar_email_comunicado();

update public.profiles
set permissoes=case when permissoes ? '/notificacoes' then permissoes else permissoes||'["/notificacoes"]'::jsonb end
where perfil='Administrador' and status='ativo';

update public.loja_usuarios
set permissoes=case when permissoes ? '/notificacoes' then permissoes else permissoes||'["/notificacoes"]'::jsonb end,
    atualizado_em=now()
where perfil='Administrador' and status='ativo';

insert into supabase_migrations.schema_migrations(version,name)
values('20260805','email_notifications_resend')
on conflict(version) do update set name=excluded.name;
