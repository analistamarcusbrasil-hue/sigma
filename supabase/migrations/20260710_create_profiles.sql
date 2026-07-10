-- SIGMA LUMP: perfis de acesso. Senhas pertencem exclusivamente ao Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  obreiro_id text,
  nome text not null check (length(trim(nome)) > 0),
  email text not null unique,
  perfil text not null check (perfil in ('Administrador', 'Venerável Mestre', 'Secretário', 'Tesoureiro', 'Chanceler', 'Obreiro')),
  status text not null default 'convite_enviado' check (status in ('convite_enviado', 'ativo', 'suspenso', 'revogado')),
  permissoes jsonb not null default '[]'::jsonb check (jsonb_typeof(permissoes) = 'array'),
  convite_enviado_em timestamptz,
  ativado_em timestamptz,
  ultimo_acesso_em timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_obreiro_id_idx on public.profiles (obreiro_id);

create or replace function public.set_profiles_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_profiles_updated_at();

alter table public.profiles enable row level security;

create or replace function public.is_administrador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and perfil = 'Administrador' and status = 'ativo');
$$;

grant execute on function public.is_administrador() to authenticated;

create policy "profiles: usuário lê o próprio perfil" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_administrador());

-- Escritas são feitas exclusivamente por Server Actions com a SUPABASE_SECRET_KEY.
