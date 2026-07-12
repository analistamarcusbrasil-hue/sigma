-- Aplica a matriz por aÃ§Ã£o ao backend e prepara desbloqueios justificados.
create or replace function public.usuario_pode_executar(alvo_loja uuid,modulo text,acao text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles p join public.loja_usuarios lu on lu.usuario_id=p.id where p.id=auth.uid() and p.status='ativo' and lu.loja_id=alvo_loja and (p.perfil='Administrador' or ((p.permissoes ? modulo) and (
  coalesce(p.permissoes_acoes->modulo,'[]'::jsonb) ? acao or
  (p.perfil in('Consulta','Orador','Obreiro') and acao in('visualizar','exportar','gerar_pdf')) or
  (p.perfil='VenerÃ¡vel Mestre' and (acao in('visualizar','exportar','gerar_pdf','aprovar','reabrir') or (modulo in('/configuracoes','/prestacao-contas') and acao in('criar','editar')))) or
  (p.perfil='Tesoureiro' and modulo in('/tesouraria','/prestacao-contas','/documentos') and acao in('visualizar','criar','editar','cancelar','aprovar','exportar','gerar_pdf')) or
  (p.perfil='SecretÃ¡rio' and modulo in('/secretaria','/documentos','/agenda','/chancelaria') and acao in('visualizar','criar','editar','cancelar','exportar','gerar_pdf')) or
  (p.perfil='Chanceler' and modulo in('/chancelaria','/agenda') and acao in('visualizar','criar','editar','exportar','gerar_pdf'))
 )))) $$;

create table if not exists public.desbloqueios_administrativos(id uuid primary key default gen_random_uuid(),loja_id uuid not null references public.lojas(id),entidade_tipo text not null,entidade_id uuid not null,motivo text not null check(length(trim(motivo))>=10),solicitado_por uuid not null default auth.uid() references auth.users(id),valido_ate timestamptz not null default(now()+interval '30 minutes'),criado_em timestamptz not null default now());
alter table public.desbloqueios_administrativos enable row level security;
create policy "desbloqueios: admin le" on public.desbloqueios_administrativos for select to authenticated using(public.is_administrador());
create policy "desbloqueios: admin cria" on public.desbloqueios_administrativos for insert to authenticated with check(public.is_administrador() and solicitado_por=auth.uid());
create or replace function public.desbloqueio_valido(tipo text,registro uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.is_administrador() and exists(select 1 from public.desbloqueios_administrativos d where d.entidade_tipo=tipo and d.entidade_id=registro and d.solicitado_por=auth.uid() and d.valido_ate>now()) $$;

create or replace function public.preparar_prestacao_final() returns trigger language plpgsql security definer set search_path=public as $$ begin if tg_op='UPDATE' and old.status in('Aprovada','Bloqueada') and new.status<>'Bloqueada' and not public.desbloqueio_valido('prestacao_final',old.id) then raise exception 'Registro protegido. Autorize um desbloqueio administrativo com justificativa.';end if;if new.status='Aprovada' then if tg_op='INSERT' or old.status<>'Pronta para aprovaÃ§Ã£o' then raise exception 'A prestaÃ§Ã£o precisa estar pronta para aprovaÃ§Ã£o.';end if;new.aprovado_por=auth.uid();new.aprovado_em=now();end if;new.atualizado_em=now();return new;end $$;
create or replace function public.preparar_repasse() returns trigger language plpgsql security definer set search_path=public as $$ begin if tg_op='UPDATE' and old.status='Finalizado' and not public.desbloqueio_valido('repasse_gestao',old.id) then raise exception 'Repasse finalizado estÃ¡ protegido. Autorize um desbloqueio justificado.';end if;if new.status='Finalizado' then if new.data_repasse is null or new.responsavel_repasse_id is null then raise exception 'Data e responsÃ¡vel sÃ£o obrigatÃ³rios';end if;new.finalizado_em=now();update public.administracoes set status='Encerrada',ativa=false where id=new.gestao_origem_id;update public.prestacoes_finais set status='Bloqueada' where id=new.prestacao_final_id and status='Aprovada';end if;new.atualizado_em=now();return new;end $$;
create or replace function public.proteger_administracao_encerrada() returns trigger language plpgsql security definer set search_path=public as $$ begin if old.status='Encerrada' and not public.desbloqueio_valido('administracao',old.id) then raise exception 'Esta gestÃ£o estÃ¡ encerrada. Exige desbloqueio administrativo justificado.';end if;return new;end $$;
drop trigger if exists proteger_administracao_encerrada on public.administracoes;create trigger proteger_administracao_encerrada before update on public.administracoes for each row execute function public.proteger_administracao_encerrada();

drop policy if exists "lancamentos: tesouraria escreve" on public.lancamentos_financeiros;
create policy "lancamentos: cria por acao" on public.lancamentos_financeiros for insert to authenticated with check(public.usuario_pode_executar(loja_id,'/tesouraria','criar'));
create policy "lancamentos: edita por acao" on public.lancamentos_financeiros for update to authenticated using(public.usuario_pode_executar(loja_id,'/tesouraria','editar')) with check(public.usuario_pode_executar(loja_id,'/tesouraria','editar'));
create policy "lancamentos: exclui por acao" on public.lancamentos_financeiros for delete to authenticated using(public.usuario_pode_executar(loja_id,'/tesouraria','excluir'));
drop policy if exists "fechamentos: tesouraria escreve" on public.fechamentos_mensais;
create policy "fechamentos: cria por acao" on public.fechamentos_mensais for insert to authenticated with check(public.usuario_pode_executar(loja_id,'/tesouraria','criar'));
create policy "fechamentos: atualiza por acao" on public.fechamentos_mensais for update to authenticated using(public.usuario_pode_executar(loja_id,'/tesouraria','editar') or public.usuario_pode_executar(loja_id,'/tesouraria','aprovar')) with check(public.usuario_pode_executar(loja_id,'/tesouraria','editar') or public.usuario_pode_executar(loja_id,'/tesouraria','aprovar'));
drop policy if exists "prestacoes finais: tesouraria escreve" on public.prestacoes_finais;
create policy "prestacoes: cria por acao" on public.prestacoes_finais for insert to authenticated with check(public.usuario_pode_executar(loja_id,'/prestacao-contas','criar'));
create policy "prestacoes: atualiza por acao" on public.prestacoes_finais for update to authenticated using(public.usuario_pode_executar(loja_id,'/prestacao-contas','editar') or public.usuario_pode_executar(loja_id,'/prestacao-contas','aprovar')) with check(public.usuario_pode_executar(loja_id,'/prestacao-contas','editar') or public.usuario_pode_executar(loja_id,'/prestacao-contas','aprovar'));
drop policy if exists "repasse escrita" on public.repasses_gestao;
create policy "repasse: cria por acao" on public.repasses_gestao for insert to authenticated with check(public.usuario_pode_executar(loja_id,'/configuracoes','criar'));
create policy "repasse: atualiza por acao" on public.repasses_gestao for update to authenticated using(public.usuario_pode_executar(loja_id,'/configuracoes','editar') or public.usuario_pode_executar(loja_id,'/configuracoes','aprovar')) with check(public.usuario_pode_executar(loja_id,'/configuracoes','editar') or public.usuario_pode_executar(loja_id,'/configuracoes','aprovar'));

create trigger auditoria_operacional after insert or update or delete on public.desbloqueios_administrativos for each row execute function public.registrar_auditoria_operacional();

