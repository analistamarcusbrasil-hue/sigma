-- SIGMA LUMP: banco operacional multi-loja.
-- Execute depois de 20260710_create_profiles.sql.

create extension if not exists pgcrypto;

create table if not exists public.lojas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  numero text,
  potencia text,
  oriente text,
  uf char(2),
  ativa boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (nome, numero)
);

create table if not exists public.loja_usuarios (
  loja_id uuid not null references public.lojas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'membro' check (papel in ('administrador', 'gestor', 'membro')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (loja_id, usuario_id)
);

create table if not exists public.obreiros (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  nome text not null check (length(trim(nome)) > 0),
  grau text not null default 'Aprendiz Maçom',
  cargo text,
  telefone text,
  email text,
  situacao text not null default 'Ativo' check (situacao in ('Ativo', 'Inativo')),
  tipo text not null default 'Obreiro da Loja' check (tipo in ('Obreiro da Loja', 'Visitante')),
  loja_origem text,
  data_cadastro date not null default current_date,
  observacoes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique nulls not distinct (loja_id, email)
);

create table if not exists public.sessoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  data date not null,
  tipo text not null,
  grau text not null,
  titulo text not null check (length(trim(titulo)) > 0),
  observacao text,
  status text not null default 'planejada' check (status in ('planejada', 'realizada', 'cancelada')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (loja_id, data, titulo)
);

create table if not exists public.presencas (
  sessao_id uuid not null references public.sessoes(id) on delete cascade,
  obreiro_id uuid not null references public.obreiros(id) on delete restrict,
  status text not null default 'Não marcado' check (status in ('Não marcado', 'Presente', 'Falta', 'Justificado')),
  observacao text,
  cargo_sessao text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (sessao_id, obreiro_id)
);

create table if not exists public.administracoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  nome text not null,
  data_inicio date not null,
  data_fim date,
  ano_trabalho integer not null,
  saldo_positivo_inicial numeric(14,2) not null default 0,
  saldo_negativo_inicial numeric(14,2) not null default 0,
  observacoes text,
  ativa boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists administracoes_loja_ativa_uidx on public.administracoes(loja_id) where ativa;

create table if not exists public.administracao_cargos (
  administracao_id uuid not null references public.administracoes(id) on delete cascade,
  obreiro_id uuid not null references public.obreiros(id) on delete restrict,
  cargo text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (administracao_id, cargo)
);

create table if not exists public.mensalidades (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  obreiro_id uuid not null references public.obreiros(id) on delete restrict,
  competencia date not null check (date_trunc('month', competencia)::date = competencia),
  vencimento date not null,
  valor numeric(14,2) not null check (valor >= 0),
  status text not null default 'Pendente' check (status in ('Pendente', 'Pago', 'Isento', 'Cancelado')),
  observacao text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (loja_id, obreiro_id, competencia)
);

create table if not exists public.recebimentos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  mensalidade_id uuid references public.mensalidades(id) on delete restrict,
  obreiro_id uuid references public.obreiros(id) on delete restrict,
  data date not null,
  valor numeric(14,2) not null check (valor > 0),
  forma_pagamento text,
  descricao text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tronco_solidariedade (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  sessao_id uuid references public.sessoes(id) on delete restrict,
  data date not null,
  valor numeric(14,2) not null check (valor >= 0),
  descricao text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.documentos_secretaria (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  sessao_id uuid references public.sessoes(id) on delete restrict,
  numero text not null,
  tipo text not null check (tipo in ('Ata', 'Balaústre')),
  data date not null,
  titulo text not null,
  grau text,
  status text not null default 'Rascunho' check (status in ('Rascunho', 'Em revisão', 'Aprovado', 'Arquivado')),
  ordem_do_dia text,
  resumo text,
  deliberacoes text,
  tronco text,
  observacoes text,
  relato_bruto text,
  decisoes_loja text,
  texto_gerado text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (loja_id, numero, tipo)
);

create table if not exists public.acoes_secretaria (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  titulo text not null,
  responsavel_id uuid references public.obreiros(id) on delete restrict,
  prazo date,
  status text not null default 'Pendente' check (status in ('Pendente', 'Em andamento', 'Concluída')),
  observacao text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.processos_secretaria (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete restrict,
  nome text not null,
  tipo text not null,
  etapa text,
  responsavel_id uuid references public.obreiros(id) on delete restrict,
  data_prevista date,
  status text not null default 'Aberto' check (status in ('Aberto', 'Em andamento', 'Concluído', 'Suspenso')),
  observacao text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists loja_usuarios_usuario_idx on public.loja_usuarios(usuario_id);
create index if not exists obreiros_loja_nome_idx on public.obreiros(loja_id, nome);
create index if not exists obreiros_loja_situacao_idx on public.obreiros(loja_id, situacao);
create index if not exists sessoes_loja_data_idx on public.sessoes(loja_id, data desc);
create index if not exists presencas_obreiro_idx on public.presencas(obreiro_id);
create index if not exists mensalidades_loja_competencia_idx on public.mensalidades(loja_id, competencia);
create index if not exists recebimentos_loja_data_idx on public.recebimentos(loja_id, data desc);
create index if not exists tronco_loja_data_idx on public.tronco_solidariedade(loja_id, data desc);
create index if not exists documentos_loja_data_idx on public.documentos_secretaria(loja_id, data desc);
create index if not exists acoes_loja_status_idx on public.acoes_secretaria(loja_id, status);
create index if not exists processos_loja_status_idx on public.processos_secretaria(loja_id, status);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

do $$
declare tabela text;
begin
  foreach tabela in array array['lojas','obreiros','sessoes','presencas','administracoes','mensalidades','recebimentos','tronco_solidariedade','documentos_secretaria','acoes_secretaria','processos_secretaria']
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', tabela, tabela);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', tabela, tabela);
  end loop;
end $$;

create or replace function public.usuario_pertence_loja(alvo_loja uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.loja_usuarios lu
    join public.profiles p on p.id = lu.usuario_id
    where lu.loja_id = alvo_loja and lu.usuario_id = auth.uid() and p.status = 'ativo'
  );
$$;

create or replace function public.usuario_pode_escrever(alvo_loja uuid, rota text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.loja_usuarios lu
    join public.profiles p on p.id = lu.usuario_id
    where lu.loja_id = alvo_loja and lu.usuario_id = auth.uid() and p.status = 'ativo'
      and (lu.papel in ('administrador','gestor') or p.perfil in ('Administrador','Venerável Mestre') or p.permissoes ? rota)
  );
$$;

grant execute on function public.usuario_pertence_loja(uuid) to authenticated;
grant execute on function public.usuario_pode_escrever(uuid, text) to authenticated;

alter table public.lojas enable row level security;
alter table public.loja_usuarios enable row level security;
alter table public.obreiros enable row level security;
alter table public.sessoes enable row level security;
alter table public.presencas enable row level security;
alter table public.administracoes enable row level security;
alter table public.administracao_cargos enable row level security;
alter table public.mensalidades enable row level security;
alter table public.recebimentos enable row level security;
alter table public.tronco_solidariedade enable row level security;
alter table public.documentos_secretaria enable row level security;
alter table public.acoes_secretaria enable row level security;
alter table public.processos_secretaria enable row level security;

create policy "lojas: membros leem" on public.lojas for select to authenticated using (public.usuario_pertence_loja(id));
create policy "lojas: administrador cria" on public.lojas for insert to authenticated with check (public.is_administrador());
create policy "lojas: gestores atualizam" on public.lojas for update to authenticated using (public.usuario_pode_escrever(id, '/configuracoes')) with check (public.usuario_pode_escrever(id, '/configuracoes'));
create policy "loja usuarios: membros leem" on public.loja_usuarios for select to authenticated using (public.usuario_pertence_loja(loja_id) or usuario_id = auth.uid());
create policy "loja usuarios: admin cria primeiro vinculo" on public.loja_usuarios for insert to authenticated with check ((usuario_id = auth.uid() and public.is_administrador()) or public.usuario_pode_escrever(loja_id, '/usuarios'));
create policy "loja usuarios: gestores atualizam" on public.loja_usuarios for update to authenticated using (public.usuario_pode_escrever(loja_id, '/usuarios')) with check (public.usuario_pode_escrever(loja_id, '/usuarios'));
create policy "loja usuarios: gestores excluem" on public.loja_usuarios for delete to authenticated using (public.usuario_pode_escrever(loja_id, '/usuarios') and usuario_id <> auth.uid());

create policy "obreiros: membros leem" on public.obreiros for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "obreiros: autorizados inserem" on public.obreiros for insert to authenticated with check (public.usuario_pode_escrever(loja_id, '/obreiros'));
create policy "obreiros: autorizados atualizam" on public.obreiros for update to authenticated using (public.usuario_pode_escrever(loja_id, '/obreiros')) with check (public.usuario_pode_escrever(loja_id, '/obreiros'));
create policy "obreiros: autorizados excluem" on public.obreiros for delete to authenticated using (public.usuario_pode_escrever(loja_id, '/obreiros'));
create policy "sessoes: membros leem" on public.sessoes for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "sessoes: autorizados inserem" on public.sessoes for insert to authenticated with check (public.usuario_pode_escrever(loja_id, '/chancelaria') or public.usuario_pode_escrever(loja_id, '/secretaria'));
create policy "sessoes: autorizados atualizam" on public.sessoes for update to authenticated using (public.usuario_pode_escrever(loja_id, '/chancelaria') or public.usuario_pode_escrever(loja_id, '/secretaria')) with check (public.usuario_pertence_loja(loja_id));
create policy "sessoes: autorizados excluem" on public.sessoes for delete to authenticated using (public.usuario_pode_escrever(loja_id, '/chancelaria') or public.usuario_pode_escrever(loja_id, '/secretaria'));
create policy "presencas: membros leem" on public.presencas for select to authenticated using (exists (select 1 from public.sessoes s where s.id = sessao_id and public.usuario_pertence_loja(s.loja_id)));
create policy "presencas: autorizados inserem" on public.presencas for insert to authenticated with check (exists (select 1 from public.sessoes s where s.id = sessao_id and public.usuario_pode_escrever(s.loja_id, '/chancelaria')));
create policy "presencas: autorizados atualizam" on public.presencas for update to authenticated using (exists (select 1 from public.sessoes s where s.id = sessao_id and public.usuario_pode_escrever(s.loja_id, '/chancelaria')));
create policy "presencas: autorizados excluem" on public.presencas for delete to authenticated using (exists (select 1 from public.sessoes s where s.id = sessao_id and public.usuario_pode_escrever(s.loja_id, '/chancelaria')));

create policy "administracoes: membros leem" on public.administracoes for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "administracoes: autorizados escrevem" on public.administracoes for all to authenticated using (public.usuario_pode_escrever(loja_id, '/configuracoes')) with check (public.usuario_pode_escrever(loja_id, '/configuracoes'));
create policy "cargos: membros leem" on public.administracao_cargos for select to authenticated using (exists (select 1 from public.administracoes a where a.id = administracao_id and public.usuario_pertence_loja(a.loja_id)));
create policy "cargos: autorizados escrevem" on public.administracao_cargos for all to authenticated using (exists (select 1 from public.administracoes a where a.id = administracao_id and public.usuario_pode_escrever(a.loja_id, '/configuracoes'))) with check (exists (select 1 from public.administracoes a where a.id = administracao_id and public.usuario_pode_escrever(a.loja_id, '/configuracoes')));

create policy "mensalidades: membros leem" on public.mensalidades for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "mensalidades: tesouraria escreve" on public.mensalidades for all to authenticated using (public.usuario_pode_escrever(loja_id, '/tesouraria')) with check (public.usuario_pode_escrever(loja_id, '/tesouraria'));
create policy "recebimentos: membros leem" on public.recebimentos for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "recebimentos: tesouraria escreve" on public.recebimentos for all to authenticated using (public.usuario_pode_escrever(loja_id, '/tesouraria')) with check (public.usuario_pode_escrever(loja_id, '/tesouraria'));
create policy "tronco: membros leem" on public.tronco_solidariedade for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "tronco: tesouraria escreve" on public.tronco_solidariedade for all to authenticated using (public.usuario_pode_escrever(loja_id, '/tesouraria')) with check (public.usuario_pode_escrever(loja_id, '/tesouraria'));
create policy "documentos: membros leem" on public.documentos_secretaria for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "documentos: secretaria escreve" on public.documentos_secretaria for all to authenticated using (public.usuario_pode_escrever(loja_id, '/secretaria')) with check (public.usuario_pode_escrever(loja_id, '/secretaria'));
create policy "acoes: membros leem" on public.acoes_secretaria for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "acoes: secretaria escreve" on public.acoes_secretaria for all to authenticated using (public.usuario_pode_escrever(loja_id, '/secretaria')) with check (public.usuario_pode_escrever(loja_id, '/secretaria'));
create policy "processos: membros leem" on public.processos_secretaria for select to authenticated using (public.usuario_pertence_loja(loja_id));
create policy "processos: secretaria escreve" on public.processos_secretaria for all to authenticated using (public.usuario_pode_escrever(loja_id, '/secretaria')) with check (public.usuario_pode_escrever(loja_id, '/secretaria'));

-- Cria uma loja padrão e vincula o primeiro administrador já existente.
do $$
declare admin_id uuid; loja_padrao_id uuid;
begin
  select id into admin_id from public.profiles where perfil = 'Administrador' and status = 'ativo' order by created_at limit 1;
  if admin_id is not null and not exists (select 1 from public.loja_usuarios where usuario_id = admin_id) then
    insert into public.lojas (nome) values ('Loja SIGMA') returning id into loja_padrao_id;
    insert into public.loja_usuarios (loja_id, usuario_id, papel) values (loja_padrao_id, admin_id, 'administrador');
  end if;
end $$;
