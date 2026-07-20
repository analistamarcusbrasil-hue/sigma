-- Pré-cadastro público do Obreiro, avaliação administrativa e conversão controlada.
-- Migration aditiva: não remove nem altera dados existentes.

alter table public.obreiros
  add column if not exists nome_preferido text,
  add column if not exists cpf text,
  add column if not exists data_nascimento date,
  add column if not exists cim text,
  add column if not exists oriente text,
  add column if not exists potencia text;

create unique index if not exists obreiros_loja_cim_uidx
  on public.obreiros(loja_id, lower(cim)) where cim is not null and trim(cim) <> '';
create unique index if not exists obreiros_loja_cpf_uidx
  on public.obreiros(loja_id, cpf) where cpf is not null and trim(cpf) <> '';

create table if not exists public.pre_cadastros_obreiro (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  loja_id uuid not null references public.lojas(id) on delete restrict,
  nome_completo text not null check(length(trim(nome_completo)) between 3 and 160),
  nome_preferido text check(nome_preferido is null or length(nome_preferido) <= 80),
  email text not null check(length(email) between 5 and 254),
  telefone text not null check(length(telefone) between 8 and 30),
  cpf text check(cpf is null or length(cpf) <= 20),
  data_nascimento date,
  cim text not null check(length(trim(cim)) between 2 and 40),
  grau text not null check(grau in('Aprendiz','Companheiro','Mestre','Mestre Instalado','Não informado')),
  situacao_informada text not null check(situacao_informada in('Ativo','Filiado','Regularizando','Visitante','Licenciado','Em processo de retorno','Outro')),
  loja_origem text check(loja_origem is null or length(loja_origem) <= 160),
  oriente text check(oriente is null or length(oriente) <= 120),
  potencia text check(potencia is null or length(potencia) <= 120),
  cargo_funcao text check(cargo_funcao is null or length(cargo_funcao) <= 120),
  observacoes text check(observacoes is null or length(observacoes) <= 1500),
  status text not null default 'Pendente' check(status in('Pendente','Em análise','Aprovado','Recusado','Correção solicitada','Convertido em Obreiro','Arquivado')),
  parecer_administrativo text check(parecer_administrativo is null or length(parecer_administrativo) <= 2000),
  avaliado_por uuid references public.profiles(id) on delete set null,
  avaliado_em timestamptz,
  obreiro_id_criado uuid references public.obreiros(id) on delete set null,
  usuario_id_criado uuid references public.profiles(id) on delete set null,
  token_acompanhamento text,
  ip_origem text,
  user_agent text check(user_agent is null or length(user_agent) <= 500),
  consentimento boolean not null check(consentimento),
  criado_em timestamptz not null default timezone('utc',now()),
  atualizado_em timestamptz not null default timezone('utc',now())
);

create table if not exists public.pre_cadastros_eventos (
  id bigint generated always as identity primary key,
  loja_id uuid references public.lojas(id) on delete restrict,
  pre_cadastro_id uuid references public.pre_cadastros_obreiro(id) on delete set null,
  usuario_id uuid references public.profiles(id) on delete set null,
  acao text not null,
  resultado text not null check(resultado in('permitido','bloqueado','erro')),
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default timezone('utc',now())
);

create index if not exists pre_cadastros_loja_status_idx on public.pre_cadastros_obreiro(loja_id,status,criado_em desc);
create index if not exists pre_cadastros_email_idx on public.pre_cadastros_obreiro(lower(email),criado_em desc);
create index if not exists pre_cadastros_cim_idx on public.pre_cadastros_obreiro(loja_id,lower(cim));
create index if not exists pre_cadastros_ip_idx on public.pre_cadastros_obreiro(ip_origem,criado_em desc);
create index if not exists pre_cadastros_eventos_idx on public.pre_cadastros_eventos(loja_id,criado_em desc);

create or replace function public.set_atualizado_em()
returns trigger language plpgsql as $$ begin new.atualizado_em=timezone('utc',now()); return new; end $$;
drop trigger if exists pre_cadastros_obreiro_updated_at on public.pre_cadastros_obreiro;
create trigger pre_cadastros_obreiro_updated_at before update on public.pre_cadastros_obreiro
for each row execute function public.set_atualizado_em();

drop trigger if exists auditoria_operacional on public.pre_cadastros_obreiro;
create trigger auditoria_operacional after insert or update or delete on public.pre_cadastros_obreiro
for each row execute function public.registrar_auditoria_operacional();

create or replace function public.pode_avaliar_pre_cadastro(alvo_loja uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ativo'
      and (
        p.perfil='Administrador'
        or (p.perfil='Venerável Mestre' and exists(
          select 1 from public.loja_usuarios lu
          where lu.usuario_id=p.id and lu.loja_id=alvo_loja and lu.status='ativo'
        ))
      )
  )
$$;
grant execute on function public.pode_avaliar_pre_cadastro(uuid) to authenticated;

alter table public.pre_cadastros_obreiro enable row level security;
alter table public.pre_cadastros_eventos enable row level security;

create policy "pre cadastro: avaliadores leem por loja" on public.pre_cadastros_obreiro
for select to authenticated using(public.pode_avaliar_pre_cadastro(loja_id));
create policy "pre cadastro: avaliadores atualizam por loja" on public.pre_cadastros_obreiro
for update to authenticated using(public.pode_avaliar_pre_cadastro(loja_id))
with check(public.pode_avaliar_pre_cadastro(loja_id));
create policy "pre cadastro eventos: avaliadores leem por loja" on public.pre_cadastros_eventos
for select to authenticated using(loja_id is not null and public.pode_avaliar_pre_cadastro(loja_id));

-- O papel anon não recebe acesso direto. A inserção pública ocorre somente pela rota
-- /api/pre-cadastros, que executa validação, honeypot e rate limit no servidor.
revoke all on public.pre_cadastros_obreiro from anon;
revoke all on public.pre_cadastros_eventos from anon;
grant select,update on public.pre_cadastros_obreiro to authenticated;
grant select on public.pre_cadastros_eventos to authenticated;
