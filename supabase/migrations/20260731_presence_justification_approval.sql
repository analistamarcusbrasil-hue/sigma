-- Justificativa de presença/falta vinculada à sessão e aplicação automática na frequência.
alter table public.solicitacoes_obreiro
  add column if not exists sessao_id uuid references public.sessoes(id) on delete restrict,
  add column if not exists frequencia_ajustada_em timestamptz;

create index if not exists solicitacoes_sessao_obreiro_idx
  on public.solicitacoes_obreiro(sessao_id,obreiro_id,status)
  where sessao_id is not null;

create or replace function public.validar_sessao_solicitacao()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  sessao public.sessoes%rowtype;
begin
  if new.tipo not in ('Justificativa de falta','Frequência e presença') then
    return new;
  end if;

  if new.sessao_id is null then
    raise exception 'Selecione a sessão que será justificada.' using errcode='23514';
  end if;

  select * into sessao
  from public.sessoes s
  where s.id=new.sessao_id
    and s.loja_id=new.loja_id;

  if not found then
    raise exception 'A sessão selecionada não pertence a esta Loja.' using errcode='23514';
  end if;

  if sessao.status='cancelada' then
    raise exception 'Não é possível justificar uma sessão cancelada.' using errcode='23514';
  end if;

  if sessao.data>current_date then
    raise exception 'Não é possível justificar uma sessão futura.' using errcode='23514';
  end if;

  if exists(
    select 1
    from public.solicitacoes_obreiro so
    where so.usuario_id=new.usuario_id
      and so.sessao_id=new.sessao_id
      and so.tipo in ('Justificativa de falta','Frequência e presença')
      and so.status in ('Pendente','Em análise','Aprovada')
      and so.id<>new.id
  ) then
    raise exception 'Já existe uma justificativa em andamento para esta sessão.' using errcode='23505';
  end if;

  new.dados_json := coalesce(new.dados_json,'{}'::jsonb) || jsonb_build_object(
    'sessaoId',sessao.id,
    'sessaoData',sessao.data,
    'sessaoTitulo',sessao.titulo,
    'sessaoTipo',sessao.tipo
  );
  return new;
end
$$;

drop trigger if exists validar_sessao_solicitacao on public.solicitacoes_obreiro;
create trigger validar_sessao_solicitacao
before insert on public.solicitacoes_obreiro
for each row execute function public.validar_sessao_solicitacao();

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
  mensagem_frequencia text;
  url_final text;
  status_presenca text;
  sessao_titulo text;
  sessao_data date;
  frequencia_confirmada boolean := false;
begin
  select * into atual
  from public.solicitacoes_obreiro
  where id=p_solicitacao_id
  for update;

  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if not public.usuario_pode_atender_solicitacao(atual.loja_id,atual.responsavel_perfil)
    or not public.usuario_pode_executar(atual.loja_id,'/solicitacoes','editar')
  then
    raise exception 'Seu perfil não pode tramitar esta solicitação.' using errcode='42501';
  end if;

  if p_status not in ('Em análise','Aprovada','Recusada','Concluída') then
    raise exception 'Status de tramitação inválido.';
  end if;

  if atual.status='Concluída' and p_status<>'Concluída' then
    raise exception 'Uma solicitação concluída não pode retornar para outra etapa.';
  end if;

  if atual.status='Aprovada' and p_status in ('Em análise','Recusada') then
    raise exception 'Uma solicitação aprovada somente pode ser concluída.';
  end if;

  url_final := nullif(trim(coalesce(p_arquivo_final_url,'')),'');
  if url_final is not null and url_final !~* '^https://' then
    raise exception 'Informe um link HTTPS válido para o documento final.';
  end if;

  select coalesce(lu.perfil,p.perfil) into perfil_autor
  from public.profiles p
  join public.loja_usuarios lu on lu.usuario_id=p.id
  where p.id=auth.uid()
    and lu.loja_id=atual.loja_id
    and lu.status='ativo'
  limit 1;

  if p_status in ('Aprovada','Concluída')
     and atual.tipo in ('Justificativa de falta','Frequência e presença')
  then
    if atual.sessao_id is null then
      raise exception 'Esta justificativa antiga não possui uma sessão vinculada. Solicite ao Obreiro um novo pedido.';
    end if;

    select s.titulo,s.data into sessao_titulo,sessao_data
    from public.sessoes s
    where s.id=atual.sessao_id
      and s.loja_id=atual.loja_id
      and s.status<>'cancelada';

    if not found then
      raise exception 'A sessão vinculada não foi encontrada ou está cancelada.';
    end if;

    select p.status into status_presenca
    from public.presencas p
    where p.sessao_id=atual.sessao_id
      and p.obreiro_id=atual.obreiro_id;

    if status_presenca='Presente' then
      mensagem_frequencia := 'A frequência já estava marcada como Presente e foi mantida.';
      frequencia_confirmada := true;
    else
      if status_presenca is distinct from 'Justificado' then
        insert into public.presencas(
          sessao_id,obreiro_id,status,observacao,cargo_sessao
        ) values(
          atual.sessao_id,
          atual.obreiro_id,
          'Justificado',
          'Justificado pelo Portal do Obreiro - protocolo ' || atual.protocolo ||
            case when nullif(trim(coalesce(p_resposta,'')),'') is not null
              then '. ' || trim(p_resposta) else '' end,
          null
        )
        on conflict(sessao_id,obreiro_id) do update
        set status='Justificado',
            observacao=case
              when nullif(trim(coalesce(public.presencas.observacao,'')),'') is null
                then excluded.observacao
              else public.presencas.observacao || E'\n' || excluded.observacao
            end,
            updated_at=timezone('utc',now());
      end if;
      mensagem_frequencia := 'Frequência da sessão de ' || to_char(sessao_data,'DD/MM/YYYY') || ' atualizada para Justificado.';
      frequencia_confirmada := true;
    end if;
  end if;

  nova_etapa := case p_status
    when 'Em análise' then 'Em análise - ' || atual.area_destino
    when 'Aprovada' then case
      when frequencia_confirmada then 'Aprovada - frequência atualizada'
      else 'Aprovada - aguardando conclusão' end
    when 'Recusada' then 'Recusada'
    when 'Concluída' then 'Concluída'
  end;

  mensagem_evento := coalesce(
    nullif(trim(coalesce(p_resposta,'')),''),
    case p_status
      when 'Em análise' then 'Solicitação assumida por ' || coalesce(perfil_autor,atual.responsavel_perfil) || '.'
      when 'Aprovada' then 'Solicitação aprovada pela área responsável.'
      when 'Recusada' then 'Solicitação recusada pela área responsável.'
      when 'Concluída' then 'Solicitação concluída pela área responsável.'
    end
  );

  if mensagem_frequencia is not null then
    mensagem_evento := mensagem_evento || ' ' || mensagem_frequencia;
  end if;

  update public.solicitacoes_obreiro
  set status=p_status,
      etapa_atual=nova_etapa,
      resposta=coalesce(nullif(trim(coalesce(p_resposta,'')),''),resposta),
      arquivo_final_url=coalesce(url_final,arquivo_final_url),
      responsavel_usuario_id=auth.uid(),
      ultimo_movimento_em=now(),
      atualizado_em=now(),
      respondido_em=case
        when p_status in ('Aprovada','Recusada','Concluída') then now()
        else respondido_em end,
      concluido_em=case
        when p_status='Concluída' then coalesce(concluido_em,now())
        else concluido_em end,
      frequencia_ajustada_em=case
        when frequencia_confirmada then coalesce(frequencia_ajustada_em,now())
        else frequencia_ajustada_em end
  where id=atual.id;

  insert into public.solicitacoes_tramitacoes(
    solicitacao_id,loja_id,status_anterior,status_novo,etapa,mensagem,
    autor_usuario_id,autor_perfil,arquivo_url,publico_obreiro
  ) values(
    atual.id,atual.loja_id,atual.status,p_status,nova_etapa,mensagem_evento,
    auth.uid(),perfil_autor,url_final,true
  );

  return jsonb_build_object(
    'id',atual.id,
    'status',p_status,
    'etapa',nova_etapa,
    'frequenciaAtualizada',frequencia_confirmada,
    'sessaoId',atual.sessao_id
  );
end
$$;

grant execute on function public.tramitar_solicitacao(uuid,text,text,text) to authenticated;

comment on column public.solicitacoes_obreiro.sessao_id is
  'Sessão escolhida pelo Obreiro em pedidos de justificativa de presença ou falta.';
comment on column public.solicitacoes_obreiro.frequencia_ajustada_em is
  'Data em que a aprovação foi aplicada automaticamente na frequência.';
