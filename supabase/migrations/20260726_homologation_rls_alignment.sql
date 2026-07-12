-- Alinha a RLS documental e patrimonial à matriz de ações, sem remover dados.
drop policy if exists "documentos escrevem" on public.documentos_gestao;
create policy "documentos: cria por acao" on public.documentos_gestao for insert to authenticated with check (public.usuario_pode_executar(loja_id, '/documentos', 'criar'));
create policy "documentos: edita por acao" on public.documentos_gestao for update to authenticated using (public.usuario_pode_executar(loja_id, '/documentos', 'editar')) with check (public.usuario_pode_executar(loja_id, '/documentos', 'editar'));
create policy "documentos: exclui por acao" on public.documentos_gestao for delete to authenticated using (public.usuario_pode_executar(loja_id, '/documentos', 'excluir'));

drop policy if exists "patrimonio escrevem" on public.patrimonios;
create policy "patrimonio: cria por acao" on public.patrimonios for insert to authenticated with check (public.usuario_pode_executar(loja_id, '/patrimonio', 'criar'));
create policy "patrimonio: edita por acao" on public.patrimonios for update to authenticated using (public.usuario_pode_executar(loja_id, '/patrimonio', 'editar')) with check (public.usuario_pode_executar(loja_id, '/patrimonio', 'editar'));
create policy "patrimonio: exclui por acao" on public.patrimonios for delete to authenticated using (public.usuario_pode_executar(loja_id, '/patrimonio', 'excluir'));

drop policy if exists "vinculos escrevem" on public.documento_vinculos;
create policy "vinculos: cria por acao" on public.documento_vinculos for insert to authenticated with check (exists (select 1 from public.documentos_gestao documento where documento.id = documento_id and public.usuario_pode_executar(documento.loja_id, '/documentos', 'editar')));
create policy "vinculos: exclui por acao" on public.documento_vinculos for delete to authenticated using (exists (select 1 from public.documentos_gestao documento where documento.id = documento_id and public.usuario_pode_executar(documento.loja_id, '/documentos', 'editar')));
