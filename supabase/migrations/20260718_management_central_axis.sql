-- SIGMA 2.0: Gestão como eixo central. Migration não destrutiva.
alter table public.administracoes add column if not exists status text not null default 'Rascunho';
alter table public.administracoes add column if not exists caixa_fisico_inicial numeric(14,2) not null default 0;
alter table public.administracoes add column if not exists conta_bancaria_inicial numeric(14,2) not null default 0;
alter table public.administracoes add column if not exists creditos_receber_iniciais numeric(14,2) not null default 0;
alter table public.administracoes add column if not exists diretoria jsonb not null default '{}'::jsonb;
alter table public.administracoes drop constraint if exists administracoes_status_check;
alter table public.administracoes add constraint administracoes_status_check check (status in ('Rascunho','Atual','Encerrada'));
alter table public.administracoes add constraint administracoes_valores_transicao_check check (
  saldo_positivo_inicial >= 0 and saldo_negativo_inicial >= 0 and caixa_fisico_inicial >= 0
  and conta_bancaria_inicial >= 0 and creditos_receber_iniciais >= 0
);
update public.administracoes set status = case when ativa then 'Atual' else coalesce(nullif(status,''),'Rascunho') end;
create unique index if not exists administracoes_loja_status_atual_uidx on public.administracoes(loja_id) where status = 'Atual';

alter table public.sessoes add column if not exists administracao_id uuid references public.administracoes(id) on delete restrict;
alter table public.agenda_eventos add column if not exists administracao_id uuid references public.administracoes(id) on delete restrict;
alter table public.lancamentos_financeiros add column if not exists administracao_id uuid references public.administracoes(id) on delete restrict;
alter table public.documentos_secretaria add column if not exists administracao_id uuid references public.administracoes(id) on delete restrict;
create index if not exists sessoes_administracao_idx on public.sessoes(administracao_id, data);
create index if not exists agenda_administracao_idx on public.agenda_eventos(administracao_id, inicio);
create index if not exists lancamentos_administracao_idx on public.lancamentos_financeiros(administracao_id, data);
create index if not exists documentos_administracao_idx on public.documentos_secretaria(administracao_id, data);

create or replace function public.ativar_administracao(alvo_administracao uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare alvo_loja uuid; diretoria_alvo jsonb;
begin
  select loja_id, diretoria into alvo_loja, diretoria_alvo from public.administracoes where id = alvo_administracao for update;
  if alvo_loja is null then raise exception 'Administração não encontrada.' using errcode = 'P0002'; end if;
  if not public.usuario_pode_escrever(alvo_loja, '/configuracoes') then raise exception 'Usuário sem permissão.' using errcode = '42501'; end if;
  if coalesce(diretoria_alvo->>'veneravelMestre','') = '' or coalesce(diretoria_alvo->>'secretario','') = ''
     or coalesce(diretoria_alvo->>'tesoureiro','') = '' or coalesce(diretoria_alvo->>'chanceler','') = '' then
    raise exception 'Preencha Venerável Mestre, Secretário, Tesoureiro e Chanceler antes de tornar a gestão Atual.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(alvo_loja::text, 0));
  update public.administracoes set ativa = false, status = case when status='Atual' then 'Rascunho' else status end where loja_id=alvo_loja and id<>alvo_administracao;
  update public.administracoes set ativa = true, status = 'Atual' where id=alvo_administracao;
end; $$;

create or replace function public.vincular_gestao_atual()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.administracao_id is null then
    select id into new.administracao_id from public.administracoes where loja_id=new.loja_id and status='Atual' limit 1;
  end if;
  return new;
end; $$;
do $$ declare tabela text; begin
  foreach tabela in array array['sessoes','agenda_eventos','lancamentos_financeiros','documentos_secretaria'] loop
    execute format('drop trigger if exists vincular_gestao_atual on public.%I',tabela);
    execute format('create trigger vincular_gestao_atual before insert on public.%I for each row execute function public.vincular_gestao_atual()',tabela);
  end loop;
end $$;

