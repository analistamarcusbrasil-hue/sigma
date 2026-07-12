-- SIGMA 2.0: Livro Caixa profissional. Migration aditiva e compatível com lançamentos existentes.
alter table public.lancamentos_financeiros add column if not exists natureza text;
alter table public.lancamentos_financeiros add column if not exists origem text not null default 'Manual';
alter table public.lancamentos_financeiros add column if not exists observacoes text;
alter table public.lancamentos_financeiros add column if not exists status_caixa text not null default 'Lançado';
alter table public.lancamentos_financeiros add column if not exists responsavel_id uuid references auth.users(id) on delete set null;
alter table public.lancamentos_financeiros add column if not exists comprovante_observacao text;
alter table public.lancamentos_financeiros add column if not exists documento_numero text;
alter table public.lancamentos_financeiros add column if not exists comprovante_data date;
update public.lancamentos_financeiros set natureza = case when tipo = 'Despesa' then 'Saída' else 'Entrada' end where natureza is null;
alter table public.lancamentos_financeiros alter column natureza set not null;
alter table public.lancamentos_financeiros drop constraint if exists lancamentos_financeiros_natureza_check;
alter table public.lancamentos_financeiros add constraint lancamentos_financeiros_natureza_check check (natureza in ('Entrada','Saída'));
alter table public.lancamentos_financeiros drop constraint if exists lancamentos_financeiros_origem_check;
alter table public.lancamentos_financeiros add constraint lancamentos_financeiros_origem_check check (origem in ('Manual','Mensalidade','Tronco','Despesa','Evento','Repasse','Outro'));
alter table public.lancamentos_financeiros drop constraint if exists lancamentos_financeiros_status_caixa_check;
alter table public.lancamentos_financeiros add constraint lancamentos_financeiros_status_caixa_check check (status_caixa in ('Rascunho','Lançado','Conferido','Aprovado','Conciliado','Cancelado'));
alter table public.categorias_financeiras drop constraint if exists categorias_financeiras_natureza_check;
alter table public.categorias_financeiras add constraint categorias_financeiras_natureza_check check (natureza in ('Receita','Despesa','Ambos'));
alter table public.contas_financeiras drop constraint if exists contas_financeiras_tipo_check;
alter table public.contas_financeiras add constraint contas_financeiras_tipo_check check (tipo in ('Caixa','Conta corrente','Poupança','Investimento','PIX','Outros'));
alter table public.contas_financeiras add column if not exists observacoes text;
create index if not exists lancamentos_livro_caixa_idx on public.lancamentos_financeiros(loja_id, administracao_id, data desc);
create index if not exists lancamentos_status_caixa_idx on public.lancamentos_financeiros(loja_id, status_caixa, data desc);

-- Categorias e centros recomendados, sem duplicar os cadastros existentes.
insert into public.categorias_financeiras(loja_id,nome,natureza,cor)
select l.id,p.nome,p.natureza,p.cor from public.lojas l cross join (values
 ('Regularização','Receita','#38bdf8'),('Repasse recebido','Receita','#fbbf24'),('Taxa administrativa','Receita','#34d399'),
 ('Aluguel','Despesa','#fb7185'),('Energia','Despesa','#f97316'),('Água','Despesa','#60a5fa'),('Internet','Despesa','#818cf8'),
 ('Material de expediente','Despesa','#a78bfa'),('Ágape','Despesa','#c084fc'),('GOB Estadual','Despesa','#ef4444'),('GOB Nacional','Despesa','#dc2626')
) p(nome,natureza,cor) on conflict(loja_id,nome,natureza) do nothing;
insert into public.centros_custo(loja_id,nome,descricao)
select l.id,p.nome,'Centro de custo padrão do SIGMA 2.0' from public.lojas l cross join (values
 ('Administração da Loja'),('Secretaria'),('Tesouraria'),('Chancelaria'),('Eventos'),('Beneficência'),('Manutenção do Templo'),('Instrução'),('Patrimônio'),('Outros')
) p(nome) on conflict(loja_id,nome) do nothing;

-- Garante autoria e vínculo com a Gestão Atual mesmo em inserções diretas autorizadas.
create or replace function public.preparar_lancamento_caixa()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.administracao_id is null then select id into new.administracao_id from public.administracoes where loja_id=new.loja_id and status='Atual' limit 1; end if;
  if new.responsavel_id is null then new.responsavel_id := auth.uid(); end if;
  return new;
end; $$;
drop trigger if exists preparar_lancamento_caixa on public.lancamentos_financeiros;
create trigger preparar_lancamento_caixa before insert on public.lancamentos_financeiros for each row execute function public.preparar_lancamento_caixa();

