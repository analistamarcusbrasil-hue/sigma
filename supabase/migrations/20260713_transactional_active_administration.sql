-- Ativação transacional de administração por Loja.
-- Não remove dados nem altera registros existentes durante a instalação.

create or replace function public.ativar_administracao(alvo_administracao uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  alvo_loja uuid;
begin
  select loja_id
    into alvo_loja
    from public.administracoes
   where id = alvo_administracao
   for update;

  if alvo_loja is null then
    raise exception 'Administração não encontrada.' using errcode = 'P0002';
  end if;

  if not public.usuario_pode_escrever(alvo_loja, '/configuracoes') then
    raise exception 'Usuário sem permissão para alterar a administração.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(alvo_loja::text, 0));

  update public.administracoes
     set ativa = (id = alvo_administracao)
   where loja_id = alvo_loja
     and ativa is distinct from (id = alvo_administracao);
end;
$$;

revoke all on function public.ativar_administracao(uuid) from public;
grant execute on function public.ativar_administracao(uuid) to authenticated;
