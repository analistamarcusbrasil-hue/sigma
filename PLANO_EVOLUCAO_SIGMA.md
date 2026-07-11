# Plano de Evolução do SIGMA

Auditoria técnica realizada em 10/07/2026 sobre a branch `main`, commit `e9a9b73`.

## 1. Resumo do estado atual

O SIGMA é uma aplicação Next.js 16.2.10 com App Router, React 19, TypeScript estrito, Tailwind CSS 4, Supabase (`@supabase/ssr` e `@supabase/supabase-js`) e geração de PDF com jsPDF. A aplicação usa componentes de página em `src/app`, telas interativas em `src/components`, regras auxiliares em `src/lib`, tipos básicos em `src/types` e migrações SQL versionadas em `supabase/migrations`.

As rotas funcionais são: login, recuperação/redefinição de senha, confirmação de autenticação, dashboard, obreiros, chancelaria, tesouraria, secretaria, prestação de contas, configurações, backup e usuários. `proxy.ts` protege rotas privadas, renova cookies do Supabase e rejeita perfis inativos.

O banco operacional está no Supabase e possui modelo multi-Loja, chaves estrangeiras, índices, timestamps, RLS e políticas orientadas pelas permissões do perfil. A publishable key é usada no navegador; a secret key está isolada em `src/lib/supabase/admin.ts`, utilizada apenas por páginas e Server Actions de administração de usuários.

Não há suíte de testes automatizados. O build compila, mas o lint inicial apresentou 22 avisos. Cinco componentes têm mais de mil linhas, concentrando tipos, cálculos, acesso a dados e interface.

## 2. Funcionalidades existentes

### Autenticação, usuários e perfis

- Login por e-mail e senha com Supabase Auth.
- Recuperação e redefinição de senha.
- Confirmação de sessão por rota de callback.
- Convites, edição de perfil, suspensão, reativação e revogação.
- Permissões por rota e perfis Administrador, Venerável Mestre, Secretário, Tesoureiro, Chanceler e Obreiro.
- Logout visível no layout.

### Dashboard

- Consolidação da gestão ativa, finanças, sessões, frequência, documentos, processos, peças, decisões e alertas.
- Estados vazios e indicadores executivos.
- Dados carregados do Supabase, mas cálculos e tipos estão duplicados no componente.

### Obreiros

- Cadastro, edição, busca, filtro, ativação/inativação e exclusão protegida por vínculos do banco.
- Visitantes integrados ao cadastro e à chamada.
- Persistência no Supabase.

### Sessões, Chancelaria e presença

- Criação, edição, abertura e exclusão de sessões.
- Chamada individual e em lote, justificativas, cargo em sessão, visitante, cópia da sessão anterior, frequência e CSV.
- Persistência de sessões e presenças no Supabase.

### Administração da Loja

- Cadastro, edição, ativação e exclusão de gestões/mandatos.
- Período, ano de trabalho, saldos herdados, observações e cargos.
- Persistência no Supabase.

### Tesouraria

- Regras de mensalidade, recebimentos, situação financeira, receitas, despesas, tronco de solidariedade, custos e parcelas.
- Persistência no Supabase e integração com obreiros, sessões e gestão.

### Secretaria

- Atas e balaústres, geração de texto/PDF, ações, processos, peças de arquitetura e decisões.
- Integração com sessões, presença, cargos, obreiros, gestão e tronco.
- Persistência no Supabase.

### Prestação de contas e backup

- Relatórios financeiros mensais/anuais, visões sintética/analítica e geração de PDF.
- Tela de backup informa cobertura dos grupos no Supabase e impede restauração local sobre o banco oficial.

## 3. Problemas encontrados

### Crítico

- `sincronizarTesouraria` e `sincronizarSecretaria` reconciliam a tabela inteira a partir do estado do navegador: primeiro excluem registros ausentes e depois fazem `upsert`. Duas sessões simultâneas ou uma leitura parcial podem sobrescrever/apagar alterações válidas. Substituir por mutações pontuais, transações/RPC e controle de concorrência antes de ampliar o uso multiusuário.
- A chave secreta usada no projeto foi compartilhada durante a configuração inicial. Ela deve ser rotacionada no Supabase e atualizada nos ambientes local e Vercel.

### Alto

- Não há trilha de auditoria de alterações financeiras, administrativas ou documentais.
- A ativação da gestão ocorre em duas operações separadas; falha intermediária pode deixar a Loja sem gestão ativa. Criar RPC transacional.
- `obterLojaAtual()` escolhe o primeiro vínculo com `.limit(1)`, sem seletor explícito de Loja; o modelo é multi-Loja, mas a experiência ainda é mono-Loja implícita.
- O acesso operacional está concentrado no cliente. RLS protege o banco, porém falta uma camada de acesso a dados tipada e testável, preferencialmente com DTOs e operações do servidor para fluxos sensíveis.
- Não existem testes automatizados de RLS, autenticação, cálculos financeiros ou fluxos críticos.

### Médio

- `SecretariaClient` (1.558 linhas), `TesourariaClient` (1.505), `ChancelariaClient` (1.360), `PrestacaoContasClient` (1.122) e `DashboardClient` (1.048) são difíceis de manter e testar.
- Entidades iguais possuem tipos diferentes e duplicados em várias telas. `src/types/index.ts` cobre apenas parte do domínio.
- O lint inicial tinha 22 avisos: dependências de hooks ausentes e símbolos não utilizados.
- Existem arquivos `.backup-*`, um ZIP de contexto e arquivos vazios na raiz (`atas,`, `cadastro`, `mensalidades`, `presenças`, `tela`, `visão`). Não afetam o build, mas confundem manutenção; remover somente após confirmação do responsável.
- `src/lib/obreiros.ts` e `src/lib/gestao.ts` mantêm caminhos legados de `localStorage`, embora as telas principais já usem Supabase.
- Mocks de obreiros permanecem em `mock-data.ts`; o menu também está no mesmo arquivo, misturando configuração e dados simulados.
- Ausência de tipagem gerada do schema Supabase faz consultas retornarem estruturas inferidas de forma frágil e exige casts.

### Baixo

- Muitos formulários usam `alert()` e `confirm()` em vez de feedback visual consistente e acessível.
- Componentes pequenos de autenticação e usuários estão comprimidos em linhas extensas, prejudicando leitura.
- Menu lateral tem rolagem e item ativo, mas não há navegação móvel dedicada/colapsável.
- Acessibilidade básica existe em partes dos formulários, porém faltam rótulos explícitos, regiões `aria-live`, foco após erros e modal acessível para confirmações.
- `allowJs` e `skipLibCheck` estão habilitados no TypeScript; devem ser reavaliados, sem alteração abrupta.
- Não há dependências claramente desnecessárias; jsPDF é utilizado, e os pacotes Supabase/Next/Tailwind são coerentes com a aplicação.

## 4. Riscos técnicos

- Perda de dados por reconciliação integral concorrente.
- Alterações financeiras sem histórico imutável ou identificação do autor.
- Estado inconsistente em operações compostas não transacionais.
- Seleção implícita de Loja em usuários com múltiplos vínculos.
- Tipos divergentes causando cálculos ou filtros diferentes entre Dashboard, Tesouraria e relatórios.
- Regressões em componentes grandes sem cobertura de testes.
- Código legado de `localStorage` ser reutilizado acidentalmente.
- Chave secreta comprometida permanecer ativa.
- Erros assíncronos exibirem mensagens técnicas do banco ao usuário.
- Convites/redirecionamentos dependerem de `NEXT_PUBLIC_SITE_URL` corretamente configurada em cada ambiente.

## 5. Arquitetura recomendada

Evoluir incrementalmente, sem mover arquivos apenas por estética:

```text
src/
  app/                         # rotas, Server Components e Server Actions
  components/
    layout/                    # AppShell, navegação
    ui/                        # alertas, estados, modal, campos
    dashboard/
    obreiros/
    chancelaria/
    tesouraria/
    secretaria/
  hooks/                       # estado e coordenação de telas
  services/
    supabase/                  # repositórios/mutações por domínio
  lib/                         # autenticação, cálculos puros, configuração
  types/
    database.ts               # tipos gerados pelo Supabase
    domain.ts                 # DTOs compartilhados do SIGMA
  utils/                       # datas, moeda e exportações
```

Prioridades arquiteturais:

1. Gerar tipos do schema Supabase e eliminar casts divergentes.
2. Substituir sincronização integral por comandos pontuais (`create`, `update`, `delete`) e RPCs transacionais.
3. Separar cálculos puros de finanças/frequência dos componentes React.
4. Extrair seções dos componentes grandes sem mudar comportamento visual.
5. Criar componentes reutilizáveis para carregamento, erro, vazio, sucesso e confirmação.
6. Adicionar testes unitários para cálculos e testes de integração para RLS e mutações.
7. Criar auditoria de alterações com usuário, Loja, entidade, operação e timestamps.

## 6. Ordem recomendada das próximas etapas

1. Fundação técnica e banco de dados.
2. Autenticação, usuários e permissões.
3. Cadastro central de obreiros.
4. Administração e mandatos.
5. Sessões e calendário maçônico.
6. Chancelaria e frequência.
7. Tesouraria e mensalidades.
8. Secretaria, atas e balaústres.
9. Processos de admissão e comissões.
10. Documentos e biblioteca.
11. Comunicação e notificações.
12. Dashboard executivo.
13. Relatórios e prestação de contas.
14. Auditoria e histórico de alterações.
15. Configuração multi-Loja.
16. Testes, segurança e implantação.

Como as etapas 1 a 8 já possuem implementação funcional, a próxima tarefa recomendada é **estabilizar as mutações concorrentes e criar testes de integridade/RLS**, antes de adicionar novos módulos.

## 7. Pendências do responsável pelo projeto

- Rotacionar `SUPABASE_SECRET_KEY` no Supabase e atualizar `.env.local` e Vercel.
- Autorizar uma migração não destrutiva para funções RPC transacionais e tabela de auditoria.
- Definir regras de concorrência e quem pode excluir registros financeiros/documentais.
- Definir como o usuário seleciona a Loja quando possuir mais de um vínculo.
- Fornecer dados reais e critérios oficiais de mensalidade, frequência, mandatos e prestação de contas.
- Aprovar a divisão visual dos componentes grandes e o padrão de notificações/modais.
- Autorizar a remoção dos arquivos de backup/contexto e arquivos vazios da raiz.
- Autorizar commit, push e PR das alterações desta auditoria; nenhum será feito automaticamente.

## 8. Validação desta auditoria

Estado inicial:

- `npm.cmd run build`: aprovado.
- `npm.cmd run lint`: 0 erros e 22 avisos.
- Variáveis esperadas encontradas por nome, sem leitura/exposição dos valores.
- `.env.local` ignorado pelo Git.

Estado final:

- `npm.cmd install`: dependências atualizadas sem alteração funcional; auditoria do npm reportou 2 vulnerabilidades moderadas. Não foi aplicado `npm audit fix --force` por poder introduzir mudanças incompatíveis.
- `npm.cmd run lint`: 0 erros e 15 avisos (redução de 7 avisos); os restantes envolvem dependências de hooks e recursos de interface parcialmente implementados, que exigem refatoração comportamental e testes.
- `npm.cmd run build`: aprovado, incluindo compilação TypeScript e geração das 17 rotas.

Primeira estabilização autorizada após a auditoria:

- Criada a migração `20260713_transactional_active_administration.sql`.
- A ativação de gestão passa a usar uma única RPC transacional, com bloqueio por Loja e validação de permissão.
- A migração é não destrutiva, mas precisa ser aplicada no Supabase antes de publicar o código correspondente.
- A Tesouraria deixou de reconciliar snapshots completos; regras, recebimentos, lançamentos, custos e parcelas usam mutações pontuais.
- A Secretaria deixou de reconciliar snapshots completos; ações, processos e peças usam mutações pontuais.
- Criada `20260714_transactional_secretary_documents.sql` para salvar documentos e suas decisões na mesma transação e removê-los preservando integridade referencial.

Correções de baixo risco realizadas:

- Remoção de imports, mocks e funções legadas de `localStorage` não utilizados no Dashboard e Prestação de Contas.
- Estado inicial de obreiros nessas telas alterado para vazio até a consulta oficial ao Supabase, evitando exibição temporária de dados simulados.
- Fallback financeiro local removido; ausência de gestão passa a representar saldo inicial zero.
- Comentário do ESLint atualizado para refletir hidratação remota, sem alterar regras funcionais.

Nenhuma tela foi substituída, nenhuma funcionalidade foi removida, nenhuma migração foi executada e nenhuma credencial foi alterada.
