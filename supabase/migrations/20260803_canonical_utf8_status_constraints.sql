-- Corrige restrições criadas por migrações antigas com texto UTF-8 interpretado incorretamente.

update public.agenda_eventos
set tipo=case tipo
  when 'SessÃ£o' then 'Sessão'
  when 'ReuniÃ£o' then 'Reunião'
  when 'CerimÃ´nia' then 'Cerimônia'
  when 'ComissÃ£o' then 'Comissão'
  else tipo end,
status=case status when 'ConcluÃdo' then 'Concluído' else status end;

alter table public.agenda_eventos
  drop constraint if exists agenda_eventos_tipo_check,
  drop constraint if exists agenda_eventos_status_check;
alter table public.agenda_eventos
  add constraint agenda_eventos_tipo_check check(tipo in(
    'Sessão','Reunião','Cerimônia','Evento social','Prazo','Financeiro','Comissão','Outro'
  )),
  add constraint agenda_eventos_status_check check(status in(
    'Planejado','Confirmado','Concluído','Cancelado'
  ));

update public.acoes_secretaria
set status='Concluída'
where status='ConcluÃda';

alter table public.acoes_secretaria
  drop constraint if exists acoes_secretaria_status_check;
alter table public.acoes_secretaria
  add constraint acoes_secretaria_status_check check(status in(
    'Pendente','Em andamento','Concluída'
  ));

update public.processos_secretaria
set status='Concluído'
where status='ConcluÃdo';

alter table public.processos_secretaria
  drop constraint if exists processos_secretaria_status_check;
alter table public.processos_secretaria
  add constraint processos_secretaria_status_check check(status in(
    'Aberto','Em andamento','Concluído','Suspenso'
  ));

insert into supabase_migrations.schema_migrations(version,name)
values('20260803','canonical_utf8_status_constraints')
on conflict(version) do update set name=excluded.name;
