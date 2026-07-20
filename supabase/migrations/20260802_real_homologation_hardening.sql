-- Homologação real: corrige gravações, comunicação e integridade sem apagar dados.

-- Todos os caminhos de inserção financeira passam a ter natureza coerente.
update public.lancamentos_financeiros
set natureza=case when tipo='Despesa' then 'Saída' else 'Entrada' end
where natureza is null;

alter table public.lancamentos_financeiros
  alter column natureza set default 'Entrada';

create or replace function public.normalizar_lancamento_financeiro()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  new.natureza := coalesce(
    new.natureza,
    case when new.tipo='Despesa' then 'Saída' else 'Entrada' end
  );
  new.origem := coalesce(
    new.origem,
    case
      when new.tipo='Tronco de Solidariedade' then 'Tronco'
      when new.tipo='Despesa' then 'Despesa'
      else 'Manual'
    end
  );
  new.status_caixa := coalesce(new.status_caixa,'Lançado');
  new.situacao := coalesce(new.situacao,'Efetivado');
  return new;
end
$$;

drop trigger if exists normalizar_lancamento_financeiro on public.lancamentos_financeiros;
create trigger normalizar_lancamento_financeiro
before insert or update on public.lancamentos_financeiros
for each row execute function public.normalizar_lancamento_financeiro();

-- Visitantes e demais cadastros nunca enviam string vazia para a coluna date.
alter table public.obreiros
  alter column data_cadastro set default current_date;

update public.obreiros
set data_cadastro=current_date
where data_cadastro is null;

-- Índices usados pelo Portal e pela fila administrativa.
create index if not exists solicitacoes_obreiro_usuario_loja_idx
  on public.solicitacoes_obreiro(usuario_id,loja_id,criado_em desc);
create index if not exists solicitacoes_obreiro_obreiro_loja_idx
  on public.solicitacoes_obreiro(obreiro_id,loja_id,criado_em desc);
create index if not exists comunicados_publicados_portal_idx
  on public.comunicados_internos(loja_id,status,publico_alvo,publicado_em desc);

-- A fila de e-mail passa a aceitar também eventos de comunicado.
alter table public.notificacoes_email
  add column if not exists comunicado_id uuid references public.comunicados_internos(id) on delete cascade;

alter table public.notificacoes_email
  alter column solicitacao_id drop not null,
  alter column tramitacao_id drop not null;

alter table public.notificacoes_email
  drop constraint if exists notificacoes_email_tramitacao_id_destinatario_email_key,
  drop constraint if exists notificacoes_email_origem_valida;

alter table public.notificacoes_email
  add constraint notificacoes_email_origem_valida check(
    (comunicado_id is not null and solicitacao_id is null and tramitacao_id is null)
    or
    (comunicado_id is null and solicitacao_id is not null and tramitacao_id is not null)
  );

create unique index if not exists notificacoes_email_tramitacao_destinatario_uidx
  on public.notificacoes_email(tramitacao_id,destinatario_email)
  where tramitacao_id is not null;
create unique index if not exists notificacoes_email_comunicado_destinatario_uidx
  on public.notificacoes_email(comunicado_id,destinatario_email)
  where comunicado_id is not null;

create or replace function public.enfileirar_email_comunicado()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status<>'Publicado' then return new; end if;
  if tg_op='UPDATE'
    and old.status='Publicado'
    and old.titulo is not distinct from new.titulo
    and old.mensagem is not distinct from new.mensagem
    and old.publico_alvo is not distinct from new.publico_alvo
  then
    return new;
  end if;

  insert into public.notificacoes_email(
    comunicado_id,destinatario_usuario_id,destinatario_email,destinatario_nome,
    assunto,mensagem,status,tentativas,ultimo_erro,enviado_em,atualizado_em
  )
  select
    new.id,p.id,p.email,p.nome,
    '[SIGMA] '||new.titulo,
    new.mensagem,
    'Pendente',0,null,null,now()
  from public.loja_usuarios lu
  join public.profiles p on p.id=lu.usuario_id
  where lu.loja_id=new.loja_id
    and lu.status='ativo'
    and p.status='ativo'
    and nullif(trim(p.email),'') is not null
    and (
      (new.publico_alvo='Todos os obreiros' and lu.obreiro_id is not null)
      or (new.publico_alvo='Diretoria' and coalesce(lu.perfil,p.perfil)<>'Obreiro')
      or (new.publico_alvo='Obreiro' and coalesce(lu.perfil,p.perfil)='Obreiro')
      or coalesce(lu.perfil,p.perfil)=new.publico_alvo
    )
  on conflict(comunicado_id,destinatario_email)
    where comunicado_id is not null
  do update set
    destinatario_usuario_id=excluded.destinatario_usuario_id,
    destinatario_nome=excluded.destinatario_nome,
    assunto=excluded.assunto,
    mensagem=excluded.mensagem,
    status='Pendente',
    tentativas=0,
    ultimo_erro=null,
    enviado_em=null,
    atualizado_em=now();

  return new;
end
$$;

drop trigger if exists enfileirar_email_comunicado on public.comunicados_internos;
create trigger enfileirar_email_comunicado
after insert or update of status,titulo,mensagem,publico_alvo
on public.comunicados_internos
for each row execute function public.enfileirar_email_comunicado();

-- Confirma a versão aplicada pelo fluxo de migrações do projeto.
insert into supabase_migrations.schema_migrations(version,name)
values('20260802','real_homologation_hardening')
on conflict(version) do update set name=excluded.name;
