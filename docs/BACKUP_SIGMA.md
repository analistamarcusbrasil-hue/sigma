# Backup do SIGMA 2.0

## Objetivo

O módulo `/backup` cria versões de segurança dos dados da Loja ativa, mantém histórico auditável, permite download JSON privado, exclusão protegida e pré-visualização de restauração sem apagar dados atuais.

## Quem pode acessar

- Administrador SIGMA: cria, lista, baixa, valida restauração e apaga backups de qualquer Loja selecionada.
- Venerável Mestre: executa as mesmas ações somente na própria Loja ativa.
- Secretário, Tesoureiro, Chanceler, Orador, Consulta e Obreiro: sem acesso nesta versão.
- Toda ação é novamente autorizada no servidor; esconder o menu não é usado como mecanismo de segurança.

## Como criar

1. Selecione a Loja ativa no menu lateral.
2. Abra **Backup**.
3. Clique em **Novo backup**.
4. Informe uma observação opcional.
5. Marque a confirmação e gere a versão.
6. O SIGMA monta o JSON no servidor, calcula SHA-256, grava metadados e envia ao bucket privado `backups-sigma`.
7. Se o Storage estiver temporariamente indisponível, a cópia JSONB de contingência é preservada e a tela mostra um aviso amigável.

## Como baixar

Use **Baixar** na versão desejada ou **Baixar último**. O arquivo passa por uma Route Handler autenticada, que:

- revalida sessão, perfil e Loja;
- bloqueia ID de outra Loja;
- recupera o objeto privado ou a cópia de contingência;
- recalcula e compara o hash;
- registra a auditoria;
- devolve `.json` com `Cache-Control: private, no-store`.

Não existe URL pública permanente para o arquivo.

## Como restaurar

A restauração automática total não é executada nesta primeira fase porque substituir tabelas relacionadas em produção exige uma estratégia por dependências e manutenção programada.

O botão **Restaurar** executa a pré-visualização segura:

1. exige digitar `RESTAURAR`;
2. exige justificativa com pelo menos 10 caracteres;
3. valida versão, JSON, hash e `loja_id`;
4. bloqueia backup de outra Loja;
5. cria obrigatoriamente um `backup_pre_restauracao` do estado atual;
6. apresenta a quantidade de registros por módulo;
7. não altera nem apaga dados atuais;
8. registra início, resultado e falhas.

A restauração destrutiva futura deverá usar transação, ordem explícita de dependências, janela de manutenção e plano de rollback.

## Como apagar

1. Abra **Apagar**.
2. Confira arquivo, Loja e data.
3. Digite `APAGAR`.
4. O objeto privado e o conteúdo JSONB são removidos.
5. O metadado permanece como `Excluído`, registrando usuário e horário.

## Formato JSON

Campos principais:

- `tipo`: `backup_loja` ou `backup_pre_restauracao`;
- `versao_backup`: atualmente `1.0`;
- `gerado_em`, `gerado_por`, `loja_id` e `loja_nome`;
- `sistema`: `SIGMA 2.0`;
- `dados_excluidos`: declaração explícita do que não entra;
- `dados`: arrays por módulo;
- `metadados.contagens` e `total_registros`.

Nome: `sigma_backup_NOME-DA-LOJA_AAAA-MM-DD_HH-MM.json`.

## Dados incluídos

- cadastro e configurações da Loja;
- obreiros;
- sessões, presenças e Agenda;
- gestões e cargos;
- mensalidades, recebimentos e regras;
- Livro Caixa, contas, categorias, centros de custo, fechamentos e prestações;
- custos fixos e Tronco de Solidariedade;
- repasses;
- comunicados e leituras;
- solicitações, tramitações, sessões, anexos e isenções;
- documentos, vínculos documentais e Secretaria;
- patrimônio, ações, processos, decisões e peças de arquitetura.

Consultas usam paginação para não truncar Lojas com mais de mil registros.

## Dados excluídos

Nunca entram:

- `auth.users`;
- `profiles` e `loja_usuarios`;
- senhas, tokens, chaves, service role e variáveis de ambiente;
- fila de e-mail;
- eventos de segurança e desbloqueios;
- auditorias operacionais;
- dados de outra Loja;
- arquivos binários referenciados pelos módulos.

## Segurança

- lógica sensível em módulo `server-only`;
- Server Actions tratadas como endpoints e autorizadas individualmente;
- Route Handler autenticada;
- cliente administrativo somente no servidor;
- bucket privado `backups-sigma`;
- RLS em metadados e eventos;
- isolamento obrigatório por `loja_id`;
- SHA-256 e JSON canônico;
- download sem cache;
- soft delete do histórico;
- confirmação forte para operações críticas;
- IP e user agent registrados quando disponíveis;
- nenhuma mutação destrutiva na pré-visualização.

## Tabelas

- `backups_sistema`: versão, arquivo, hash, status, responsáveis, conteúdo de contingência e metadados.
- `backups_eventos`: criação, download, validação de restauração, exclusão, bloqueios e falhas.

## Storage privado

A migration `20260804_backup_module.sql` cria ou endurece o bucket `backups-sigma` como privado, com limite de 50 MB e MIME `application/json`. O download da aplicação não expõe `caminho_storage`.

## Limitações

- escopo global não foi habilitado para evitar mistura de Lojas e inclusão indireta de usuários;
- restauração completa destrutiva está desabilitada;
- o JSON guarda metadados e referências de anexos, mas não copia arquivos binários de outros buckets;
- retenção automática e compactação ZIP ainda não estão habilitadas;
- backups maiores que 50 MB permanecem no fallback JSONB e devem ser avaliados antes da restauração.

## Próximos passos

- restauração transacional completa em ambiente de homologação dedicado;
- política de retenção configurável;
- cópia opcional de binários para um pacote;
- compactação e criptografia de arquivo;
- agendamento automático;
- backup global somente após política específica para Administrador SIGMA.
