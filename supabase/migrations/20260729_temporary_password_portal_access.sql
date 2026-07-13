-- Senha temporária e acesso contextual ao Portal do Obreiro.
-- Migration aditiva: nenhuma senha é persistida no banco.
alter table public.loja_usuarios
  add column if not exists acesso_portal_obreiro boolean not null default false,
  add column if not exists deve_trocar_senha boolean not null default false,
  add column if not exists senha_temporaria_definida_em timestamptz,
  add column if not exists senha_temporaria_definida_por uuid references auth.users(id) on delete set null;

update public.loja_usuarios
set acesso_portal_obreiro = true,
    permissoes = '["/portal-obreiro"]'::jsonb
where perfil = 'Obreiro'
  and status = 'ativo'
  and obreiro_id is not null;

update public.profiles
set permissoes = '["/portal-obreiro"]'::jsonb
where perfil = 'Obreiro';

alter table public.loja_usuarios
  drop constraint if exists loja_usuarios_acesso_portal_valido;
alter table public.loja_usuarios
  add constraint loja_usuarios_acesso_portal_valido
  check (
    not acesso_portal_obreiro
    or (status = 'ativo' and obreiro_id is not null)
  );

create index if not exists loja_usuarios_portal_idx
  on public.loja_usuarios (usuario_id, loja_id)
  where status = 'ativo' and acesso_portal_obreiro;

create index if not exists loja_usuarios_troca_senha_idx
  on public.loja_usuarios (usuario_id)
  where status = 'ativo' and deve_trocar_senha;

create or replace function public.usuario_tem_acesso_portal(alvo_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.loja_usuarios lu
    join public.profiles p on p.id = lu.usuario_id
    where lu.usuario_id = auth.uid()
      and lu.loja_id = alvo_loja
      and lu.status = 'ativo'
      and p.status = 'ativo'
      and lu.acesso_portal_obreiro
      and lu.obreiro_id is not null
  )
$$;
grant execute on function public.usuario_tem_acesso_portal(uuid) to authenticated;

create or replace function public.usuario_pode_executar(alvo_loja uuid, modulo text, acao text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.loja_usuarios lu
    join public.profiles p on p.id = lu.usuario_id
    where lu.usuario_id = auth.uid()
      and lu.loja_id = alvo_loja
      and lu.status = 'ativo'
      and p.status = 'ativo'
      and (
        (p.perfil = 'Administrador' and (modulo <> '/portal-obreiro' or lu.acesso_portal_obreiro))
        or (
          (lu.permissoes ? modulo or p.permissoes ? modulo)
          and (
            coalesce(p.permissoes_acoes -> modulo, '[]'::jsonb) ? acao
            or acao = 'visualizar'
            or (lu.perfil in ('Venerável Mestre','Secretário','Tesoureiro','Chanceler') and acao in ('criar','editar','aprovar','exportar','gerar_pdf'))
            or (lu.perfil = 'Obreiro' and modulo = '/portal-obreiro' and acao = 'criar')
          )
        )
      )
      and (modulo <> '/portal-obreiro' or (lu.acesso_portal_obreiro and lu.obreiro_id is not null))
  )
$$;

drop policy if exists "solicitacoes: proprio obreiro cria" on public.solicitacoes_obreiro;
create policy "solicitacoes: proprio obreiro cria"
  on public.solicitacoes_obreiro
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and obreiro_id = public.usuario_obreiro_na_loja(auth.uid(), loja_id)
    and public.usuario_tem_acesso_portal(loja_id)
  );

drop trigger if exists auditoria_operacional on public.loja_usuarios;
create trigger auditoria_operacional
after insert or update or delete on public.loja_usuarios
for each row execute function public.registrar_auditoria_operacional();

comment on column public.loja_usuarios.acesso_portal_obreiro is 'Concede acesso contextual ao Portal para esta Loja.';
comment on column public.loja_usuarios.deve_trocar_senha is 'Bloqueia a navegação até a troca da senha temporária no Auth.';
comment on column public.loja_usuarios.senha_temporaria_definida_em is 'Data da definição; a senha nunca é armazenada.';
comment on column public.loja_usuarios.senha_temporaria_definida_por is 'Administrador que definiu a senha; a senha nunca é armazenada.';
