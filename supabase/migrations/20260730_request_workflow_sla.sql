-- Fluxo completo de solicitações: roteamento por área, SLA, tramitação e documento final.
alter table public.solicitacoes_obreiro
  add column if not exists protocolo text,
  add column if not exists area_destino text not null default 'Administração',
  add column if not exists responsavel_perfil text not null default 'Venerável Mestre',
  add column if not exists prioridade text not null default 'Normal',
  add column if not exists prazo_em timestamptz,
  add column if not exists etapa_atual text not null default 'Recebida',
  add column if not exists ultimo_movimento_em timestamptz not null default now(),
  add column if not exists responsavel_usuario_id uuid references auth.users(id) on delete set null,
  add column if not exists arquivo_final_url text,
  add column if not exists concluido_em timestamptz;

alter table public.solicitacoes_obreiro
  drop constraint if exists solicitacoes_prioridade_valida;
alter table public.solicitacoes_obreiro
  add constraint solicitacoes_prioridade_valida check (prioridade in ('Baixa','Normal','Alta','Urgente'));

create or replace function public.aplicar_classificacao_solicitacao()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  dias_prazo integer;
begin
  case new.tipo
    when 'Assunto financeiro' then
      new.area_destino := 'Tesouraria'; new.responsavel_perfil := 'Tesoureiro'; new.prioridade := 'Normal'; dias_prazo := 3;
    when 'Envio de comprovante de pagamento' then
      new.area_destino := 'Tesouraria'; new.responsavel_perfil := 'Tesoureiro'; new.prioridade := 'Alta'; dias_prazo := 3;
    when 'Solicitação à Tesouraria' then
      new.area_destino := 'Tesouraria'; new.responsavel_perfil := 'Tesoureiro'; new.prioridade := 'Normal'; dias_prazo := 3;
    when 'Frequência e presença' then
      new.area_destino := 'Chancelaria'; new.responsavel_perfil := 'Chanceler'; new.prioridade := 'Alta'; dias_prazo := 2;
    when 'Justificativa de falta' then
      new.area_destino := 'Chancelaria'; new.responsavel_perfil := 'Chanceler'; new.prioridade := 'Alta'; dias_prazo := 2;
    when 'Solicitação à Chancelaria' then
      new.area_destino := 'Chancelaria'; new.responsavel_perfil := 'Chanceler'; new.prioridade := 'Normal'; dias_prazo := 3;
    when 'Kit Placet e documentos' then
      new.area_destino := 'Secretaria'; new.responsavel_perfil := 'Secretário'; new.prioridade := 'Alta'; dias_prazo := 5;
    when 'Documento ou certidão' then
      new.area_destino := 'Secretaria'; new.responsavel_perfil := 'Secretário'; new.prioridade := 'Normal'; dias_prazo := 5;
    when 'Atualização cadastral' then
      new.area_destino := 'Secretaria'; new.responsavel_perfil := 'Secretário'; new.prioridade := 'Normal'; dias_prazo := 3;
    when 'Solicitação à Secretaria' then
      new.area_destino := 'Secretaria'; new.responsavel_perfil := 'Secretário'; new.prioridade := 'Normal'; dias_prazo := 5;
    else
      new.area_destino := 'Administração'; new.responsavel_perfil := 'Venerável Mestre'; new.prioridade := 'Normal'; dias_prazo := 5;
  end case;

  new.protocolo := coalesce(new.protocolo, 'SIG-' || to_char(coalesce(new.criado_em, now()), 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 8)));
  new.prazo_em := coalesce(new.prazo_em, coalesce(new.criado_em, now()) + make_interval(days => dias_prazo));
  new.etapa_atual := coalesce(nullif(new.etapa_atual, ''), 'Recebida');
  new.ultimo_movimento_em := coalesce(new.ultimo_movimento_em, now());
  return new;
end
$$;

drop trigger if exists classificar_solicitacao on public.solicitacoes_obreiro;
create trigger classificar_solicitacao
before insert on public.solicitacoes_obreiro
for each row execute function public.aplicar_classificacao_solicitacao();

update public.solicitacoes_obreiro
set
  area_destino = case
    when tipo in ('Assunto financeiro','Envio de comprovante de pagamento','Solicitação à Tesouraria') then 'Tesouraria'
    when tipo in ('Frequência e presença','Justificativa de falta','Solicitação à Chancelaria') then 'Chancelaria'
    when tipo in ('Kit Placet e documentos','Documento ou certidão','Atualização cadastral','Solicitação à Secretaria') then 'Secretaria'
    else 'Administração'
  end,
  responsavel_perfil = case
    when tipo in ('Assunto financeiro','Envio de comprovante de pagamento','Solicitação à Tesouraria') then 'Tesoureiro'
    when tipo in ('Frequência e presença','Justificativa de falta','Solicitação à Chancelaria') then 'Chanceler'
    when tipo in ('Kit Placet e documentos','Documento ou certidão','Atualização cadastral','Solicitação à Secretaria') then 'Secretário'
    else 'Venerável Mestre'
  end,
  prioridade = case when tipo in ('Envio de comprovante de pagamento','Frequência e presença','Justificativa de falta','Kit Placet e documentos') then 'Alta' else 'Normal' end,
  protocolo = coalesce(protocolo, 'SIG-' || to_char(criado_em, 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 8))),
  prazo_em = coalesce(prazo_em, criado_em + make_interval(days => case
    when tipo in ('Frequência e presença','Justificativa de falta') then 2
    when tipo in ('Assunto financeiro','Envio de comprovante de pagamento','Solicitação à Tesouraria','Atualização cadastral','Solicitação à Chancelaria') then 3
    else 5 end)),
  etapa_atual = case status
    when 'Pendente' then 'Recebida'
    when 'Em análise' then 'Em análise'
    when 'Aprovada' then 'Aprovada - aguardando conclusão'
    when 'Recusada' then 'Recusada'
    when 'Concluída' then 'Concluída'
    when 'Cancelada' then 'Cancelada'
    else etapa_atual end,
  ultimo_movimento_em = coalesce(ultimo_movimento_em, atualizado_em, criado_em);

create unique index if not exists solicitacoes_protocolo_uidx on public.solicitacoes_obreiro(protocolo);
create index if not exists solicitacoes_fila_sla_idx on public.solicitacoes_obreiro(loja_id,responsavel_perfil,status,prazo_em);

create table if not exists public.solicitacoes_tramitacoes(
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes_obreiro(id) on delete cascade,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  status_anterior text,
  status_novo text not null,
  etapa text not null,
  mensagem text not null,
  autor_usuario_id uuid references auth.users(id) on delete set null,
  autor_perfil text,
  arquivo_url text,
  publico_obreiro boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists solicitacoes_tramitacoes_timeline_idx on public.solicitacoes_tramitacoes(solicitacao_id,criado_em);

create or replace function public.usuario_pode_atender_solicitacao(alvo_loja uuid, perfil_destino text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.profiles p
    join public.loja_usuarios lu on lu.usuario_id=p.id
    where p.id=auth.uid()
      and p.status='ativo'
      and lu.status='ativo'
      and lu.loja_id=alvo_loja
      and (p.perfil='Administrador' or lu.perfil in ('Administrador','Venerável Mestre') or lu.perfil=perfil_destino)
      and (p.perfil='Administrador' or p.permissoes ? '/solicitacoes' or lu.permissoes ? '/solicitacoes')
  )
$$;
grant execute on function public.usuario_pode_atender_solicitacao(uuid,text) to authenticated;

drop policy if exists "solicitacoes: proprio obreiro le" on public.solicitacoes_obreiro;
create policy "solicitacoes: proprio obreiro le"
on public.solicitacoes_obreiro for select to authenticated
using(usuario_id=auth.uid() or public.usuario_pode_atender_solicitacao(loja_id,responsavel_perfil));

drop policy if exists "solicitacoes: gestores respondem" on public.solicitacoes_obreiro;
create policy "solicitacoes: gestores respondem"
on public.solicitacoes_obreiro for update to authenticated
using(public.usuario_pode_atender_solicitacao(loja_id,responsavel_perfil) and public.usuario_pode_executar(loja_id,'/solicitacoes','editar'))
with check(public.usuario_pode_atender_solicitacao(loja_id,responsavel_perfil) and public.usuario_pode_executar(loja_id,'/solicitacoes','editar'));

alter table public.solicitacoes_tramitacoes enable row level security;
drop policy if exists "tramitacoes: envolvidos leem" on public.solicitacoes_tramitacoes;
create policy "tramitacoes: envolvidos leem"
on public.solicitacoes_tramitacoes for select to authenticated
using(exists(
  select 1 from public.solicitacoes_obreiro s
  where s.id=solicitacao_id
    and (s.usuario_id=auth.uid() or public.usuario_pode_atender_solicitacao(s.loja_id,s.responsavel_perfil))
    and (s.usuario_id<>auth.uid() or publico_obreiro)
));

drop policy if exists "tramitacoes: gestores registram" on public.solicitacoes_tramitacoes;
create policy "tramitacoes: gestores registram"
on public.solicitacoes_tramitacoes for insert to authenticated
with check(public.usuario_pode_atender_solicitacao(loja_id,(
  select s.responsavel_perfil from public.solicitacoes_obreiro s where s.id=solicitacao_id
)));

create or replace function public.registrar_recebimento_solicitacao()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.solicitacoes_tramitacoes(
    solicitacao_id,loja_id,status_novo,etapa,mensagem,autor_usuario_id,autor_perfil,publico_obreiro
  ) values(
    new.id,new.loja_id,new.status,new.etapa_atual,
    'Solicitação recebida e encaminhada automaticamente para ' || new.area_destino || '.',
    new.usuario_id,'Obreiro',true
  );
  return new;
end
$$;

drop trigger if exists registrar_recebimento_solicitacao on public.solicitacoes_obreiro;
create trigger registrar_recebimento_solicitacao
after insert on public.solicitacoes_obreiro
for each row execute function public.registrar_recebimento_solicitacao();

insert into public.solicitacoes_tramitacoes(
  solicitacao_id,loja_id,status_novo,etapa,mensagem,autor_usuario_id,autor_perfil,publico_obreiro,criado_em
)
select s.id,s.loja_id,s.status,s.etapa_atual,
  'Solicitação incorporada ao fluxo de tramitação e encaminhada para ' || s.area_destino || '.',
  s.usuario_id,'Obreiro',true,s.criado_em
from public.solicitacoes_obreiro s
where not exists(select 1 from public.solicitacoes_tramitacoes t where t.solicitacao_id=s.id);

create or replace function public.tramitar_solicitacao(
  p_solicitacao_id uuid,
  p_status text,
  p_resposta text,
  p_arquivo_final_url text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  atual public.solicitacoes_obreiro%rowtype;
  perfil_autor text;
  nova_etapa text;
  mensagem_evento text;
  url_final text;
begin
  select * into atual from public.solicitacoes_obreiro where id=p_solicitacao_id for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if not public.usuario_pode_atender_solicitacao(atual.loja_id,atual.responsavel_perfil)
    or not public.usuario_pode_executar(atual.loja_id,'/solicitacoes','editar')
  then raise exception 'Seu perfil não pode tramitar esta solicitação.'; end if;
  if p_status not in ('Em análise','Aprovada','Recusada','Concluída') then
    raise exception 'Status de tramitação inválido.';
  end if;

  url_final := nullif(trim(coalesce(p_arquivo_final_url,'')),'');
  if url_final is not null and url_final !~* '^https?://' then
    raise exception 'Informe um link válido para o documento final.';
  end if;

  select coalesce(lu.perfil,p.perfil) into perfil_autor
  from public.profiles p join public.loja_usuarios lu on lu.usuario_id=p.id
  where p.id=auth.uid() and lu.loja_id=atual.loja_id and lu.status='ativo'
  limit 1;

  nova_etapa := case p_status
    when 'Em análise' then 'Em análise - ' || atual.area_destino
    when 'Aprovada' then 'Aprovada - aguardando conclusão'
    when 'Recusada' then 'Recusada'
    when 'Concluída' then 'Concluída'
  end;

  mensagem_evento := coalesce(nullif(trim(coalesce(p_resposta,'')),''),
    case p_status
      when 'Em análise' then 'Solicitação assumida por ' || coalesce(perfil_autor,atual.responsavel_perfil) || '.'
      when 'Aprovada' then 'Solicitação aprovada e encaminhada para conclusão.'
      when 'Recusada' then 'Solicitação recusada pela área responsável.'
      when 'Concluída' then 'Solicitação concluída pela área responsável.'
    end
  );

  update public.solicitacoes_obreiro
  set status=p_status,
      etapa_atual=nova_etapa,
      resposta=coalesce(nullif(trim(coalesce(p_resposta,'')),''),resposta),
      arquivo_final_url=coalesce(url_final,arquivo_final_url),
      responsavel_usuario_id=auth.uid(),
      ultimo_movimento_em=now(),
      atualizado_em=now(),
      respondido_em=case when p_status in ('Aprovada','Recusada','Concluída') then now() else respondido_em end,
      concluido_em=case when p_status='Concluída' then now() else concluido_em end
  where id=atual.id;

  insert into public.solicitacoes_tramitacoes(
    solicitacao_id,loja_id,status_anterior,status_novo,etapa,mensagem,
    autor_usuario_id,autor_perfil,arquivo_url,publico_obreiro
  ) values(
    atual.id,atual.loja_id,atual.status,p_status,nova_etapa,mensagem_evento,
    auth.uid(),perfil_autor,url_final,true
  );

  return jsonb_build_object('id',atual.id,'status',p_status,'etapa',nova_etapa);
end
$$;
grant execute on function public.tramitar_solicitacao(uuid,text,text,text) to authenticated;

comment on column public.solicitacoes_obreiro.prazo_em is 'SLA padrão em dias corridos definido automaticamente por tipo.';
comment on column public.solicitacoes_obreiro.arquivo_final_url is 'Link do documento final disponibilizado ao Obreiro após a conclusão.';
