-- Fluxo decisório completo: parecer técnico, validação final do Venerável,
-- múltiplas sessões/períodos, anexos privados, interação e fila de e-mails.

alter table public.solicitacoes_obreiro
  add column if not exists responsavel_tecnico_perfil text,
  add column if not exists periodo_inicio date,
  add column if not exists periodo_fim date,
  add column if not exists parecer_tecnico text,
  add column if not exists parecer_tecnico_em timestamptz,
  add column if not exists parecer_tecnico_usuario_id uuid references auth.users(id) on delete set null,
  add column if not exists encaminhada_veneravel_em timestamptz,
  add column if not exists decisao_final text,
  add column if not exists decisao_final_em timestamptz,
  add column if not exists decisao_final_usuario_id uuid references auth.users(id) on delete set null,
  add column if not exists aguardando_de text,
  add column if not exists codigo_comprovante text,
  add column if not exists comprovante_emitido_em timestamptz;

alter table public.solicitacoes_obreiro
  drop constraint if exists solicitacoes_obreiro_status_check;
alter table public.solicitacoes_obreiro
  add constraint solicitacoes_obreiro_status_check check(status in(
    'Pendente','Em análise','Aguardando complementação',
    'Aguardando aprovação do Venerável','Aprovada','Recusada','Concluída','Cancelada'
  ));

alter table public.solicitacoes_obreiro
  drop constraint if exists solicitacoes_periodo_valido;
alter table public.solicitacoes_obreiro
  add constraint solicitacoes_periodo_valido check(
    (periodo_inicio is null and periodo_fim is null)
    or (periodo_inicio is not null and periodo_fim is not null and periodo_inicio<=periodo_fim)
  );

alter table public.solicitacoes_obreiro
  drop constraint if exists solicitacoes_decisao_final_valida;
alter table public.solicitacoes_obreiro
  add constraint solicitacoes_decisao_final_valida check(
    decisao_final is null or decisao_final in ('Aprovada','Recusada')
  );

create unique index if not exists solicitacoes_codigo_comprovante_uidx
  on public.solicitacoes_obreiro(codigo_comprovante)
  where codigo_comprovante is not null;

update public.solicitacoes_obreiro
set responsavel_tecnico_perfil=responsavel_perfil
where responsavel_tecnico_perfil is null;

create table if not exists public.solicitacoes_sessoes(
  solicitacao_id uuid not null references public.solicitacoes_obreiro(id) on delete cascade,
  sessao_id uuid not null references public.sessoes(id) on delete restrict,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key(solicitacao_id,sessao_id)
);
create index if not exists solicitacoes_sessoes_loja_idx
  on public.solicitacoes_sessoes(loja_id,sessao_id);

insert into public.solicitacoes_sessoes(solicitacao_id,sessao_id,loja_id)
select id,sessao_id,loja_id
from public.solicitacoes_obreiro
where sessao_id is not null
on conflict do nothing;

create table if not exists public.solicitacoes_anexos(
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes_obreiro(id) on delete cascade,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  storage_path text not null unique,
  nome_arquivo text not null,
  tipo_mime text not null,
  tamanho_bytes bigint not null check(tamanho_bytes>0 and tamanho_bytes<=10485760),
  categoria text not null default 'Documento complementar',
  autor_usuario_id uuid not null references auth.users(id) on delete restrict,
  autor_perfil text not null,
  criado_em timestamptz not null default now()
);
create index if not exists solicitacoes_anexos_solicitacao_idx
  on public.solicitacoes_anexos(solicitacao_id,criado_em);

create table if not exists public.isencoes_mensalidades(
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null unique references public.solicitacoes_obreiro(id) on delete restrict,
  loja_id uuid not null references public.lojas(id) on delete restrict,
  obreiro_id uuid not null references public.obreiros(id) on delete restrict,
  periodo_inicio date not null,
  periodo_fim date not null,
  motivo text not null,
  status text not null default 'Ativa' check(status in('Ativa','Revogada','Encerrada')),
  aprovado_por uuid not null references auth.users(id) on delete restrict,
  aprovado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  check(periodo_inicio<=periodo_fim)
);
create index if not exists isencoes_mensalidades_periodo_idx
  on public.isencoes_mensalidades(loja_id,obreiro_id,periodo_inicio,periodo_fim,status);

alter table public.solicitacoes_tramitacoes
  add column if not exists tipo_evento text not null default 'Movimentação',
  add column if not exists requer_acao boolean not null default false,
  add column if not exists destinatario_perfil text;

create table if not exists public.notificacoes_email(
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes_obreiro(id) on delete cascade,
  tramitacao_id uuid not null references public.solicitacoes_tramitacoes(id) on delete cascade,
  destinatario_usuario_id uuid references auth.users(id) on delete set null,
  destinatario_email text not null,
  destinatario_nome text,
  assunto text not null,
  mensagem text not null,
  status text not null default 'Pendente' check(status in('Pendente','Enviando','Enviado','Falha','Aguardando configuração')),
  tentativas integer not null default 0,
  ultimo_erro text,
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique(tramitacao_id,destinatario_email)
);
create index if not exists notificacoes_email_pendentes_idx
  on public.notificacoes_email(status,criado_em);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'solicitacoes-anexos','solicitacoes-anexos',false,10485760,
  array[
    'application/pdf','image/jpeg','image/png','image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict(id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.perfil_usuario_loja(alvo_loja uuid)
returns text
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(lu.perfil,p.perfil)
  from public.profiles p
  join public.loja_usuarios lu on lu.usuario_id=p.id
  where p.id=auth.uid()
    and p.status='ativo'
    and lu.status='ativo'
    and lu.loja_id=alvo_loja
  limit 1
$$;
grant execute on function public.perfil_usuario_loja(uuid) to authenticated;

create or replace function public.usuario_e_veneravel(alvo_loja uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(public.perfil_usuario_loja(alvo_loja)='Venerável Mestre',false)
$$;
grant execute on function public.usuario_e_veneravel(uuid) to authenticated;

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
    when 'Isenção de mensalidades' then
      new.area_destino := 'Tesouraria'; new.responsavel_perfil := 'Tesoureiro'; new.prioridade := 'Alta'; dias_prazo := 5;
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

  new.responsavel_tecnico_perfil := coalesce(new.responsavel_tecnico_perfil,new.responsavel_perfil);
  new.protocolo := coalesce(new.protocolo,'SIG-'||to_char(coalesce(new.criado_em,now()),'YYYYMMDD')||'-'||upper(substr(replace(new.id::text,'-',''),1,8)));
  new.prazo_em := coalesce(new.prazo_em,coalesce(new.criado_em,now())+make_interval(days=>dias_prazo));
  new.etapa_atual := coalesce(nullif(new.etapa_atual,''),'Recebida');
  new.ultimo_movimento_em := coalesce(new.ultimo_movimento_em,now());
  return new;
end
$$;

drop trigger if exists validar_sessao_solicitacao on public.solicitacoes_obreiro;
drop function if exists public.validar_sessao_solicitacao();

create or replace function public.criar_solicitacao_portal(
  p_loja_id uuid,
  p_tipo text,
  p_titulo text,
  p_descricao text,
  p_dados jsonb default '{}'::jsonb,
  p_sessao_ids uuid[] default null,
  p_periodo_inicio date default null,
  p_periodo_fim date default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  vinculo public.loja_usuarios%rowtype;
  solicitacao public.solicitacoes_obreiro%rowtype;
  ids uuid[];
  quantidade integer;
  sessao_resumo jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sua sessão expirou. Entre novamente.' using errcode='42501';
  end if;

  select * into vinculo
  from public.loja_usuarios
  where usuario_id=auth.uid()
    and loja_id=p_loja_id
    and status='ativo'
  limit 1;

  if not found or not coalesce(vinculo.acesso_portal_obreiro,false) or vinculo.obreiro_id is null then
    raise exception 'Seu Portal não está liberado ou vinculado a um Obreiro nesta Loja.' using errcode='42501';
  end if;

  if p_tipo not in(
    'Atualização cadastral','Justificativa de falta','Frequência e presença',
    'Envio de comprovante de pagamento','Assunto financeiro','Isenção de mensalidades',
    'Kit Placet e documentos','Documento ou certidão','Solicitação à Secretaria',
    'Solicitação à Tesouraria','Solicitação à Chancelaria','Outra'
  ) then
    raise exception 'Tipo de solicitação inválido.' using errcode='23514';
  end if;

  if length(trim(coalesce(p_titulo,''))) not between 3 and 120 then
    raise exception 'O assunto deve ter entre 3 e 120 caracteres.' using errcode='23514';
  end if;
  if length(trim(coalesce(p_descricao,''))) not between 10 and 2000 then
    raise exception 'A descrição deve ter entre 10 e 2.000 caracteres.' using errcode='23514';
  end if;

  select coalesce(array_agg(distinct x),array[]::uuid[]) into ids
  from unnest(coalesce(p_sessao_ids,array[]::uuid[])) x;
  quantidade := coalesce(array_length(ids,1),0);

  if p_tipo in('Justificativa de falta','Frequência e presença') then
    if quantidade=0 then
      raise exception 'Selecione ao menos uma sessão para justificar.' using errcode='23514';
    end if;
    if quantidade>52 then
      raise exception 'Selecione no máximo 52 sessões por solicitação.' using errcode='23514';
    end if;
    if (
      select count(*) from public.sessoes s
      where s.id=any(ids)
        and s.loja_id=p_loja_id
        and s.status<>'cancelada'
        and s.data<=current_date
    )<>quantidade then
      raise exception 'Uma ou mais sessões são inválidas, futuras, canceladas ou de outra Loja.' using errcode='23514';
    end if;
    if exists(
      select 1
      from public.solicitacoes_obreiro so
      join public.solicitacoes_sessoes ss on ss.solicitacao_id=so.id
      where so.usuario_id=auth.uid()
        and ss.sessao_id=any(ids)
        and so.status not in('Recusada','Concluída','Cancelada')
    ) then
      raise exception 'Já existe uma justificativa ativa para uma das sessões escolhidas.' using errcode='23505';
    end if;

    select jsonb_agg(jsonb_build_object(
      'sessaoId',s.id,'sessaoData',s.data,'sessaoTitulo',s.titulo,'sessaoTipo',s.tipo
    ) order by s.data) into sessao_resumo
    from public.sessoes s where s.id=any(ids);

    select min(data),max(data) into p_periodo_inicio,p_periodo_fim
    from public.sessoes where id=any(ids);
  elsif p_tipo='Isenção de mensalidades' then
    if p_periodo_inicio is null or p_periodo_fim is null
      or p_periodo_inicio>p_periodo_fim
      or p_periodo_fim>p_periodo_inicio+interval '24 months'
    then
      raise exception 'Informe um período válido de até 24 meses para a isenção.' using errcode='23514';
    end if;
    p_periodo_inicio := date_trunc('month',p_periodo_inicio)::date;
    p_periodo_fim := date_trunc('month',p_periodo_fim)::date;
    if exists(
      select 1 from public.solicitacoes_obreiro so
      where so.usuario_id=auth.uid()
        and so.tipo='Isenção de mensalidades'
        and so.status not in('Recusada','Concluída','Cancelada')
        and daterange(so.periodo_inicio,so.periodo_fim,'[]') && daterange(p_periodo_inicio,p_periodo_fim,'[]')
    ) then
      raise exception 'Já existe um pedido de isenção ativo para parte deste período.' using errcode='23505';
    end if;
  else
    p_periodo_inicio := null;
    p_periodo_fim := null;
  end if;

  insert into public.solicitacoes_obreiro(
    loja_id,obreiro_id,usuario_id,tipo,titulo,descricao,dados_json,
    sessao_id,periodo_inicio,periodo_fim
  ) values(
    p_loja_id,vinculo.obreiro_id,auth.uid(),p_tipo,trim(p_titulo),trim(p_descricao),
    coalesce(p_dados,'{}'::jsonb)||case when sessao_resumo is null then '{}'::jsonb else jsonb_build_object('sessoes',sessao_resumo) end,
    case when quantidade>0 then ids[1] else null end,p_periodo_inicio,p_periodo_fim
  ) returning * into solicitacao;

  if quantidade>0 then
    insert into public.solicitacoes_sessoes(solicitacao_id,sessao_id,loja_id)
    select solicitacao.id,s.id,p_loja_id from public.sessoes s where s.id=any(ids);
  end if;

  return jsonb_build_object(
    'id',solicitacao.id,'protocolo',solicitacao.protocolo,'status',solicitacao.status,
    'areaDestino',solicitacao.area_destino,'prazoEm',solicitacao.prazo_em,'criadoEm',solicitacao.criado_em
  );
end
$$;
grant execute on function public.criar_solicitacao_portal(uuid,text,text,text,jsonb,uuid[],date,date) to authenticated;

create or replace function public.aplicar_isencao_mensalidade()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  isencao public.isencoes_mensalidades%rowtype;
begin
  if new.status not in('Pendente','Isento') then return new; end if;
  select * into isencao
  from public.isencoes_mensalidades i
  where i.loja_id=new.loja_id
    and i.obreiro_id=new.obreiro_id
    and i.status='Ativa'
    and new.competencia between i.periodo_inicio and i.periodo_fim
  order by i.aprovado_em desc
  limit 1;
  if found then
    new.status := 'Isento';
    if coalesce(new.observacao,'') not like '%protocolo '||(
      select protocolo from public.solicitacoes_obreiro where id=isencao.solicitacao_id
    )||'%' then
      new.observacao := concat_ws(E'\n',nullif(new.observacao,''),
        'Isenção aprovada pelo Venerável - protocolo '||(
          select protocolo from public.solicitacoes_obreiro where id=isencao.solicitacao_id
        ));
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists aplicar_isencao_mensalidade on public.mensalidades;
create trigger aplicar_isencao_mensalidade
before insert or update of competencia,status on public.mensalidades
for each row execute function public.aplicar_isencao_mensalidade();

create or replace function public.movimentar_solicitacao(
  p_solicitacao_id uuid,
  p_acao text,
  p_mensagem text default null,
  p_parecer text default null,
  p_arquivo_final_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  atual public.solicitacoes_obreiro%rowtype;
  perfil_autor text;
  status_novo text;
  etapa_nova text;
  mensagem_evento text;
  url_final text;
  eh_admin boolean;
  eh_tecnico boolean;
  eh_veneravel boolean;
  frequencias_atualizadas integer := 0;
  mensalidades_isentas integer := 0;
  codigo text;
begin
  select * into atual
  from public.solicitacoes_obreiro
  where id=p_solicitacao_id
  for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;

  perfil_autor := public.perfil_usuario_loja(atual.loja_id);
  if perfil_autor is null then
    raise exception 'Seu usuário não possui vínculo ativo com esta Loja.' using errcode='42501';
  end if;
  eh_admin := perfil_autor='Administrador';
  eh_tecnico := perfil_autor=atual.responsavel_tecnico_perfil;
  eh_veneravel := perfil_autor='Venerável Mestre';

  if atual.status in('Recusada','Concluída','Cancelada') then
    raise exception 'Esta solicitação já está encerrada.';
  end if;

  if p_acao='ASSUMIR' then
    if not(eh_tecnico or eh_admin) then
      raise exception 'Somente a área técnica responsável pode assumir esta solicitação.' using errcode='42501';
    end if;
    status_novo := 'Em análise';
    etapa_nova := 'Em análise técnica - '||atual.area_destino;
    mensagem_evento := coalesce(nullif(trim(coalesce(p_mensagem,'')),''),'Solicitação assumida para análise técnica.');

  elsif p_acao='SOLICITAR_COMPLEMENTO' then
    if not(eh_tecnico or eh_admin or eh_veneravel) then
      raise exception 'Seu perfil não pode solicitar complementação.' using errcode='42501';
    end if;
    if length(trim(coalesce(p_mensagem,'')))<10 then
      raise exception 'Explique com pelo menos 10 caracteres o que o Obreiro deve corrigir ou complementar.';
    end if;
    status_novo := 'Aguardando complementação';
    etapa_nova := 'Aguardando resposta do Obreiro';
    mensagem_evento := trim(p_mensagem);
    update public.solicitacoes_obreiro
    set aguardando_de='Obreiro',
        dados_json=coalesce(dados_json,'{}'::jsonb)||jsonb_build_object(
          'retornoComplemento',case when encaminhada_veneravel_em is null then 'Em análise' else 'Aguardando aprovação do Venerável' end
        )
    where id=atual.id;

  elsif p_acao='ENCAMINHAR_VENERAVEL' then
    if not(eh_tecnico or eh_admin) then
      raise exception 'Somente a área técnica responsável pode emitir o parecer.' using errcode='42501';
    end if;
    if p_parecer not in('Favorável','Desfavorável') then
      raise exception 'Informe se o parecer técnico é Favorável ou Desfavorável.';
    end if;
    if length(trim(coalesce(p_mensagem,'')))<10 then
      raise exception 'Fundamente o parecer técnico antes de encaminhar ao Venerável.';
    end if;
    status_novo := 'Aguardando aprovação do Venerável';
    etapa_nova := 'Parecer técnico concluído - decisão do Venerável';
    mensagem_evento := 'Parecer '||p_parecer||': '||trim(p_mensagem);
    update public.solicitacoes_obreiro
    set parecer_tecnico=p_parecer||': '||trim(p_mensagem),
        parecer_tecnico_em=now(),
        parecer_tecnico_usuario_id=auth.uid(),
        encaminhada_veneravel_em=now(),
        aguardando_de='Venerável Mestre'
    where id=atual.id;

  elsif p_acao in('APROVAR_FINAL','RECUSAR_FINAL') then
    if not eh_veneravel then
      raise exception 'A decisão final é exclusiva do Venerável Mestre.' using errcode='42501';
    end if;
    if atual.encaminhada_veneravel_em is null then
      raise exception 'A área técnica ainda não encaminhou esta solicitação para decisão final.';
    end if;
    if length(trim(coalesce(p_mensagem,'')))<5 then
      raise exception 'Registre a fundamentação da decisão final.';
    end if;

    status_novo := case when p_acao='APROVAR_FINAL' then 'Aprovada' else 'Recusada' end;
    etapa_nova := case when p_acao='APROVAR_FINAL' then 'Aprovada pelo Venerável' else 'Recusada pelo Venerável' end;
    mensagem_evento := trim(p_mensagem);

    if p_acao='APROVAR_FINAL' then
      codigo := 'CMP-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(atual.id::text,'-',''),1,10));

      if atual.tipo in('Justificativa de falta','Frequência e presença') then
        insert into public.presencas as presenca_atual(
          sessao_id,obreiro_id,status,observacao,cargo_sessao
        )
        select ss.sessao_id,atual.obreiro_id,'Justificado',
          'Justificado após decisão do Venerável - protocolo '||atual.protocolo||'. '||trim(p_mensagem),
          null
        from public.solicitacoes_sessoes ss
        where ss.solicitacao_id=atual.id
        on conflict(sessao_id,obreiro_id) do update
        set status=case when presenca_atual.status='Presente' then 'Presente' else 'Justificado' end,
            observacao=case
              when presenca_atual.status='Presente' then presenca_atual.observacao
              when coalesce(presenca_atual.observacao,'') like '%protocolo '||atual.protocolo||'%' then presenca_atual.observacao
              else concat_ws(E'\n',nullif(presenca_atual.observacao,''),excluded.observacao)
            end,
            updated_at=timezone('utc',now());
        get diagnostics frequencias_atualizadas=row_count;
      end if;

      if atual.tipo='Isenção de mensalidades' then
        insert into public.isencoes_mensalidades(
          solicitacao_id,loja_id,obreiro_id,periodo_inicio,periodo_fim,motivo,aprovado_por
        ) values(
          atual.id,atual.loja_id,atual.obreiro_id,atual.periodo_inicio,atual.periodo_fim,
          atual.descricao,auth.uid()
        )
        on conflict(solicitacao_id) do nothing;

        update public.mensalidades
        set status='Isento',
            observacao=concat_ws(E'\n',nullif(observacao,''),
              'Isenção aprovada pelo Venerável - protocolo '||atual.protocolo),
            updated_at=timezone('utc',now())
        where loja_id=atual.loja_id
          and obreiro_id=atual.obreiro_id
          and competencia between atual.periodo_inicio and atual.periodo_fim
          and status='Pendente';
        get diagnostics mensalidades_isentas=row_count;
      end if;

      update public.solicitacoes_obreiro
      set frequencia_ajustada_em=case
            when atual.tipo in('Justificativa de falta','Frequência e presença') then coalesce(frequencia_ajustada_em,now())
            else frequencia_ajustada_em end,
          codigo_comprovante=coalesce(codigo_comprovante,codigo),
          comprovante_emitido_em=coalesce(comprovante_emitido_em,now())
      where id=atual.id;
    end if;

    update public.solicitacoes_obreiro
    set decisao_final=status_novo,
        decisao_final_em=now(),
        decisao_final_usuario_id=auth.uid(),
        aguardando_de=null
    where id=atual.id;

  elsif p_acao='CONCLUIR_ENTREGA' then
    if not(eh_tecnico or eh_admin) then
      raise exception 'Somente a área responsável pode concluir a entrega.' using errcode='42501';
    end if;
    if atual.status<>'Aprovada' then
      raise exception 'A entrega só pode ser concluída depois da aprovação do Venerável.';
    end if;
    if length(trim(coalesce(p_mensagem,'')))<5 then
      raise exception 'Informe o que foi entregue ao Obreiro.';
    end if;
    status_novo := 'Concluída';
    etapa_nova := 'Documento ou providência entregue ao Obreiro';
    mensagem_evento := trim(p_mensagem);

  else
    raise exception 'Ação de tramitação inválida.' using errcode='23514';
  end if;

  url_final := nullif(trim(coalesce(p_arquivo_final_url,'')),'');
  if url_final is not null and url_final !~* '^https://' then
    raise exception 'Informe um link HTTPS válido para o documento final.';
  end if;

  update public.solicitacoes_obreiro
  set status=status_novo,
      etapa_atual=etapa_nova,
      resposta=coalesce(nullif(trim(coalesce(p_mensagem,'')),''),resposta),
      arquivo_final_url=coalesce(url_final,arquivo_final_url),
      responsavel_usuario_id=auth.uid(),
      ultimo_movimento_em=now(),
      atualizado_em=now(),
      respondido_em=case when status_novo in('Aprovada','Recusada','Concluída') then now() else respondido_em end,
      concluido_em=case when status_novo='Concluída' then coalesce(concluido_em,now()) else concluido_em end
  where id=atual.id;

  insert into public.solicitacoes_tramitacoes(
    solicitacao_id,loja_id,status_anterior,status_novo,etapa,mensagem,
    autor_usuario_id,autor_perfil,arquivo_url,publico_obreiro,
    tipo_evento,requer_acao,destinatario_perfil
  ) values(
    atual.id,atual.loja_id,atual.status,status_novo,etapa_nova,mensagem_evento,
    auth.uid(),perfil_autor,url_final,true,
    p_acao,p_acao='SOLICITAR_COMPLEMENTO',
    case
      when p_acao='SOLICITAR_COMPLEMENTO' then 'Obreiro'
      when p_acao='ENCAMINHAR_VENERAVEL' then 'Venerável Mestre'
      else null end
  );

  return jsonb_build_object(
    'id',atual.id,'status',status_novo,'etapa',etapa_nova,
    'frequenciasAtualizadas',frequencias_atualizadas,
    'mensalidadesIsentas',mensalidades_isentas,
    'codigoComprovante',codigo
  );
end
$$;
grant execute on function public.movimentar_solicitacao(uuid,text,text,text,text) to authenticated;

create or replace function public.responder_solicitacao(
  p_solicitacao_id uuid,
  p_mensagem text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  atual public.solicitacoes_obreiro%rowtype;
  perfil_autor text;
  eh_obreiro boolean;
  status_novo text;
  etapa_nova text;
begin
  select * into atual from public.solicitacoes_obreiro where id=p_solicitacao_id for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if length(trim(coalesce(p_mensagem,''))) not between 2 and 2000 then
    raise exception 'A mensagem deve ter entre 2 e 2.000 caracteres.';
  end if;

  eh_obreiro := atual.usuario_id=auth.uid();
  perfil_autor := case when eh_obreiro then 'Obreiro' else public.perfil_usuario_loja(atual.loja_id) end;
  if not eh_obreiro and not public.usuario_pode_atender_solicitacao(atual.loja_id,atual.responsavel_tecnico_perfil) then
    raise exception 'Seu perfil não participa desta solicitação.' using errcode='42501';
  end if;

  status_novo := atual.status;
  etapa_nova := atual.etapa_atual;
  if eh_obreiro and atual.status='Aguardando complementação' then
    status_novo := case when atual.encaminhada_veneravel_em is null then 'Em análise' else 'Aguardando aprovação do Venerável' end;
    etapa_nova := case when atual.encaminhada_veneravel_em is null
      then 'Complementação recebida - análise técnica'
      else 'Complementação recebida - decisão do Venerável' end;
    update public.solicitacoes_obreiro set aguardando_de=null where id=atual.id;
  end if;

  update public.solicitacoes_obreiro
  set status=status_novo,etapa_atual=etapa_nova,ultimo_movimento_em=now(),atualizado_em=now()
  where id=atual.id;

  insert into public.solicitacoes_tramitacoes(
    solicitacao_id,loja_id,status_anterior,status_novo,etapa,mensagem,
    autor_usuario_id,autor_perfil,publico_obreiro,tipo_evento,requer_acao,destinatario_perfil
  ) values(
    atual.id,atual.loja_id,atual.status,status_novo,etapa_nova,trim(p_mensagem),
    auth.uid(),perfil_autor,true,'Mensagem',false,
    case when eh_obreiro then
      case when status_novo='Aguardando aprovação do Venerável' then 'Venerável Mestre' else atual.responsavel_tecnico_perfil end
    else 'Obreiro' end
  );

  return jsonb_build_object('id',atual.id,'status',status_novo,'etapa',etapa_nova);
end
$$;
grant execute on function public.responder_solicitacao(uuid,text) to authenticated;

create or replace function public.registrar_anexo_solicitacao(
  p_solicitacao_id uuid,
  p_storage_path text,
  p_nome_arquivo text,
  p_tipo_mime text,
  p_tamanho_bytes bigint,
  p_categoria text default 'Documento complementar'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  atual public.solicitacoes_obreiro%rowtype;
  perfil_autor text;
  eh_obreiro boolean;
  anexo public.solicitacoes_anexos%rowtype;
begin
  select * into atual from public.solicitacoes_obreiro where id=p_solicitacao_id;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  eh_obreiro := atual.usuario_id=auth.uid();
  perfil_autor := case when eh_obreiro then 'Obreiro' else public.perfil_usuario_loja(atual.loja_id) end;
  if not eh_obreiro and not public.usuario_pode_atender_solicitacao(atual.loja_id,atual.responsavel_tecnico_perfil) then
    raise exception 'Seu perfil não participa desta solicitação.' using errcode='42501';
  end if;
  if p_storage_path not like atual.loja_id::text||'/'||auth.uid()::text||'/'||atual.id::text||'/%' then
    raise exception 'Caminho do anexo inválido.' using errcode='42501';
  end if;
  if p_tamanho_bytes<=0 or p_tamanho_bytes>10485760 then
    raise exception 'Cada arquivo deve ter no máximo 10 MB.';
  end if;
  if p_tipo_mime not in(
    'application/pdf','image/jpeg','image/png','image/webp',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) then
    raise exception 'Formato de arquivo não permitido.';
  end if;

  insert into public.solicitacoes_anexos(
    solicitacao_id,loja_id,storage_path,nome_arquivo,tipo_mime,tamanho_bytes,
    categoria,autor_usuario_id,autor_perfil
  ) values(
    atual.id,atual.loja_id,p_storage_path,left(trim(p_nome_arquivo),255),p_tipo_mime,p_tamanho_bytes,
    case when eh_obreiro then 'Documento enviado pelo Obreiro' else left(coalesce(nullif(trim(p_categoria),''),'Documento complementar'),80) end,
    auth.uid(),perfil_autor
  ) returning * into anexo;

  insert into public.solicitacoes_tramitacoes(
    solicitacao_id,loja_id,status_anterior,status_novo,etapa,mensagem,
    autor_usuario_id,autor_perfil,publico_obreiro,tipo_evento,requer_acao,destinatario_perfil
  ) values(
    atual.id,atual.loja_id,atual.status,atual.status,atual.etapa_atual,
    'Arquivo anexado: '||anexo.nome_arquivo||' ('||anexo.categoria||').',
    auth.uid(),perfil_autor,true,'Anexo',false,
    case when eh_obreiro then atual.responsavel_tecnico_perfil else 'Obreiro' end
  );

  return jsonb_build_object('id',anexo.id,'nome',anexo.nome_arquivo,'categoria',anexo.categoria);
end
$$;
grant execute on function public.registrar_anexo_solicitacao(uuid,text,text,text,bigint,text) to authenticated;

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
begin
  return public.movimentar_solicitacao(
    p_solicitacao_id,
    case p_status
      when 'Em análise' then 'ASSUMIR'
      when 'Aprovada' then 'APROVAR_FINAL'
      when 'Recusada' then 'RECUSAR_FINAL'
      when 'Concluída' then 'CONCLUIR_ENTREGA'
      else 'INVALIDA' end,
    p_resposta,null,p_arquivo_final_url
  );
end
$$;
grant execute on function public.tramitar_solicitacao(uuid,text,text,text) to authenticated;

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
  assunto_email text;
  mensagem_email text;
begin
  select * into solicitacao from public.solicitacoes_obreiro where id=new.solicitacao_id;
  if not found then return new; end if;

  assunto_email := '[SIGMA] '||coalesce(solicitacao.protocolo,'Solicitação')||' - '||new.etapa;
  mensagem_email := new.mensagem||E'\n\nEtapa atual: '||new.etapa||E'\nProtocolo: '||coalesce(solicitacao.protocolo,'');

  if new.autor_usuario_id=solicitacao.usuario_id then
    perfil_destino := case
      when new.status_novo='Aguardando aprovação do Venerável' then 'Venerável Mestre'
      else solicitacao.responsavel_tecnico_perfil end;
    for destinatario in
      select distinct p.id,p.email,p.nome
      from public.profiles p
      join public.loja_usuarios lu on lu.usuario_id=p.id
      where lu.loja_id=solicitacao.loja_id
        and lu.status='ativo'
        and p.status='ativo'
        and coalesce(lu.perfil,p.perfil)=perfil_destino
        and nullif(trim(coalesce(p.email,'')),'') is not null
    loop
      insert into public.notificacoes_email(
        solicitacao_id,tramitacao_id,destinatario_usuario_id,destinatario_email,
        destinatario_nome,assunto,mensagem
      ) values(
        solicitacao.id,new.id,destinatario.id,destinatario.email,destinatario.nome,
        assunto_email,mensagem_email
      ) on conflict do nothing;
    end loop;
  else
    select p.id,p.email,p.nome into destinatario
    from public.profiles p where p.id=solicitacao.usuario_id and nullif(trim(coalesce(p.email,'')),'') is not null;
    if found then
      insert into public.notificacoes_email(
        solicitacao_id,tramitacao_id,destinatario_usuario_id,destinatario_email,
        destinatario_nome,assunto,mensagem
      ) values(
        solicitacao.id,new.id,destinatario.id,destinatario.email,destinatario.nome,
        assunto_email,mensagem_email
      ) on conflict do nothing;
    end if;
  end if;

  if new.tipo_evento='ENCAMINHAR_VENERAVEL' then
    for destinatario in
      select distinct p.id,p.email,p.nome
      from public.profiles p
      join public.loja_usuarios lu on lu.usuario_id=p.id
      where lu.loja_id=solicitacao.loja_id
        and lu.status='ativo'
        and p.status='ativo'
        and coalesce(lu.perfil,p.perfil)='Venerável Mestre'
        and nullif(trim(coalesce(p.email,'')),'') is not null
    loop
      insert into public.notificacoes_email(
        solicitacao_id,tramitacao_id,destinatario_usuario_id,destinatario_email,
        destinatario_nome,assunto,mensagem
      ) values(
        solicitacao.id,new.id,destinatario.id,destinatario.email,destinatario.nome,
        assunto_email,mensagem_email
      ) on conflict do nothing;
    end loop;
  end if;

  return new;
end
$$;

drop trigger if exists enfileirar_email_tramitacao on public.solicitacoes_tramitacoes;
create trigger enfileirar_email_tramitacao
after insert on public.solicitacoes_tramitacoes
for each row execute function public.enfileirar_email_tramitacao();

alter table public.solicitacoes_sessoes enable row level security;
alter table public.solicitacoes_anexos enable row level security;
alter table public.isencoes_mensalidades enable row level security;
alter table public.notificacoes_email enable row level security;

drop policy if exists "solicitacoes sessoes: envolvidos leem" on public.solicitacoes_sessoes;
create policy "solicitacoes sessoes: envolvidos leem"
on public.solicitacoes_sessoes for select to authenticated
using(exists(
  select 1 from public.solicitacoes_obreiro s
  where s.id=solicitacao_id
    and (s.usuario_id=auth.uid() or public.usuario_pode_atender_solicitacao(s.loja_id,s.responsavel_tecnico_perfil))
));

drop policy if exists "solicitacoes anexos: envolvidos leem" on public.solicitacoes_anexos;
create policy "solicitacoes anexos: envolvidos leem"
on public.solicitacoes_anexos for select to authenticated
using(exists(
  select 1 from public.solicitacoes_obreiro s
  where s.id=solicitacao_id
    and (s.usuario_id=auth.uid() or public.usuario_pode_atender_solicitacao(s.loja_id,s.responsavel_tecnico_perfil))
));

drop policy if exists "isencoes: envolvidos leem" on public.isencoes_mensalidades;
create policy "isencoes: envolvidos leem"
on public.isencoes_mensalidades for select to authenticated
using(
  exists(select 1 from public.solicitacoes_obreiro s where s.id=solicitacao_id and s.usuario_id=auth.uid())
  or public.usuario_pode_atender_solicitacao(loja_id,'Tesoureiro')
);

drop policy if exists "anexos storage: envolvidos leem" on storage.objects;
create policy "anexos storage: envolvidos leem"
on storage.objects for select to authenticated
using(
  bucket_id='solicitacoes-anexos'
  and exists(
    select 1
    from public.solicitacoes_anexos a
    join public.solicitacoes_obreiro s on s.id=a.solicitacao_id
    where a.storage_path=name
      and (s.usuario_id=auth.uid() or public.usuario_pode_atender_solicitacao(s.loja_id,s.responsavel_tecnico_perfil))
  )
);

drop policy if exists "anexos storage: usuario envia" on storage.objects;
create policy "anexos storage: usuario envia"
on storage.objects for insert to authenticated
with check(
  bucket_id='solicitacoes-anexos'
  and (storage.foldername(name))[2]=auth.uid()::text
  and public.usuario_tem_acesso_loja(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "anexos storage: autor remove" on storage.objects;
create policy "anexos storage: autor remove"
on storage.objects for delete to authenticated
using(
  bucket_id='solicitacoes-anexos'
  and (storage.foldername(name))[2]=auth.uid()::text
);

grant select on public.solicitacoes_sessoes,public.solicitacoes_anexos,public.isencoes_mensalidades to authenticated;
grant select on public.notificacoes_email to service_role;

comment on column public.solicitacoes_obreiro.parecer_tecnico is
  'Parecer não decisório emitido por Tesoureiro, Chanceler, Secretário ou Administração.';
comment on column public.solicitacoes_obreiro.decisao_final is
  'Decisão final exclusiva do Venerável Mestre.';
comment on column public.solicitacoes_obreiro.codigo_comprovante is
  'Código do comprovante imprimível emitido após a aprovação final.';
