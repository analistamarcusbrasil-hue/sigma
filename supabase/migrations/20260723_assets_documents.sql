-- Base patrimonial e documental unificada do SIGMA 2.0.
create table public.documentos_gestao (
 id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id), administracao_id uuid references public.administracoes(id),
 titulo text not null check(length(trim(titulo))>0), tipo text not null, descricao text, data_documento date,
 modulo_origem text not null default 'Gestão', entidade_tipo text, entidade_id uuid, arquivo_url text, observacao_anexo text,
 fisico_arquivado boolean not null default false, status text not null default 'Rascunho' check(status in('Rascunho','Pendente','Conferido','Aprovado','Arquivado','Substituído','Cancelado')),
 responsavel_id uuid references public.obreiros(id), observacoes text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table public.patrimonios (
 id uuid primary key default gen_random_uuid(), loja_id uuid not null references public.lojas(id), administracao_id uuid not null references public.administracoes(id),
 nome text not null check(length(trim(nome))>0), categoria text not null, descricao text, quantidade integer not null default 1 check(quantidade>0),
 estado text not null check(estado in('Novo','Bom','Regular','Ruim','Inservível')), data_aquisicao date,
 origem text not null check(origem in('Recebido da gestão anterior','Adquirido na gestão','Doado','Baixado','Outro')),
 valor_estimado numeric(14,2) not null default 0 check(valor_estimado>=0), localizacao text, responsavel_id uuid references public.obreiros(id),
 status text not null default 'Ativo' check(status in('Ativo','Baixado','Repassado','Em manutenção','Extraviado')), observacoes text,
 documento_id uuid references public.documentos_gestao(id), justificativa_baixa text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
 check(status<>'Baixado' or length(trim(coalesce(justificativa_baixa,'')))>0)
);
create table public.documento_vinculos(id uuid primary key default gen_random_uuid(),documento_id uuid not null references public.documentos_gestao(id) on delete cascade,entidade_tipo text not null,entidade_id uuid not null,modulo text not null,criado_em timestamptz not null default now(),unique(documento_id,entidade_tipo,entidade_id));
create index documentos_gestao_loja_idx on public.documentos_gestao(loja_id,administracao_id,status);create index patrimonios_loja_idx on public.patrimonios(loja_id,administracao_id,status);
alter table public.documentos_gestao enable row level security;alter table public.patrimonios enable row level security;alter table public.documento_vinculos enable row level security;
create policy "documentos leem" on public.documentos_gestao for select to authenticated using(public.usuario_pertence_loja(loja_id));create policy "documentos escrevem" on public.documentos_gestao for all to authenticated using(public.usuario_pode_escrever(loja_id,'/secretaria')) with check(public.usuario_pode_escrever(loja_id,'/secretaria'));
create policy "patrimonio leem" on public.patrimonios for select to authenticated using(public.usuario_pertence_loja(loja_id));create policy "patrimonio escrevem" on public.patrimonios for all to authenticated using(public.usuario_pode_escrever(loja_id,'/configuracoes')) with check(public.usuario_pode_escrever(loja_id,'/configuracoes'));
create policy "vinculos leem" on public.documento_vinculos for select to authenticated using(exists(select 1 from public.documentos_gestao d where d.id=documento_id and public.usuario_pertence_loja(d.loja_id)));create policy "vinculos escrevem" on public.documento_vinculos for all to authenticated using(exists(select 1 from public.documentos_gestao d where d.id=documento_id and public.usuario_pode_escrever(d.loja_id,'/secretaria')));
create trigger auditoria_operacional after insert or update or delete on public.documentos_gestao for each row execute function public.registrar_auditoria_operacional();create trigger auditoria_operacional after insert or update or delete on public.patrimonios for each row execute function public.registrar_auditoria_operacional();
