-- Documentos e decisões da Secretaria gravados na mesma transação.
create or replace function public.salvar_documento_com_decisoes(p_documento jsonb, p_decisoes jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare v_loja uuid := (p_documento->>'loja_id')::uuid; v_documento uuid := (p_documento->>'id')::uuid;
begin
  if not public.usuario_pode_escrever(v_loja, '/secretaria') then raise exception 'Usuário sem permissão.' using errcode='42501'; end if;
  insert into public.documentos_secretaria (id,loja_id,sessao_id,numero,tipo,data,titulo,grau,status,ordem_do_dia,resumo,deliberacoes,tronco,observacoes,relato_bruto,decisoes_loja,texto_gerado)
  values (v_documento,v_loja,nullif(p_documento->>'sessao_id','')::uuid,p_documento->>'numero',p_documento->>'tipo',(p_documento->>'data')::date,p_documento->>'titulo',p_documento->>'grau',p_documento->>'status',p_documento->>'ordem_do_dia',p_documento->>'resumo',p_documento->>'deliberacoes',p_documento->>'tronco',p_documento->>'observacoes',p_documento->>'relato_bruto',p_documento->>'decisoes_loja',p_documento->>'texto_gerado')
  on conflict (id) do update set sessao_id=excluded.sessao_id,numero=excluded.numero,tipo=excluded.tipo,data=excluded.data,titulo=excluded.titulo,grau=excluded.grau,status=excluded.status,ordem_do_dia=excluded.ordem_do_dia,resumo=excluded.resumo,deliberacoes=excluded.deliberacoes,tronco=excluded.tronco,observacoes=excluded.observacoes,relato_bruto=excluded.relato_bruto,decisoes_loja=excluded.decisoes_loja,texto_gerado=excluded.texto_gerado;
  delete from public.decisoes_loja where documento_id=v_documento;
  insert into public.decisoes_loja (id,loja_id,documento_id,sessao_id,data,texto,status,origem)
  select x.id,v_loja,v_documento,x.sessao_id,x.data,x.texto,x.status,x.origem from jsonb_to_recordset(coalesce(p_decisoes,'[]'::jsonb)) as x(id uuid,sessao_id uuid,data date,texto text,status text,origem text);
end $$;
revoke all on function public.salvar_documento_com_decisoes(jsonb,jsonb) from public;
grant execute on function public.salvar_documento_com_decisoes(jsonb,jsonb) to authenticated;

create or replace function public.remover_documento_secretaria(p_documento uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare v_loja uuid;
begin
  select loja_id into v_loja from public.documentos_secretaria where id=p_documento for update;
  if v_loja is null then return; end if;
  if not public.usuario_pode_escrever(v_loja,'/secretaria') then raise exception 'Usuário sem permissão.' using errcode='42501'; end if;
  delete from public.decisoes_loja where documento_id=p_documento;
  delete from public.documentos_secretaria where id=p_documento;
end $$;
revoke all on function public.remover_documento_secretaria(uuid) from public;
grant execute on function public.remover_documento_secretaria(uuid) to authenticated;
