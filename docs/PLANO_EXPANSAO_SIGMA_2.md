# Plano de expansão do SIGMA 2.0

## Visão do produto

O SIGMA 2.0 será a plataforma operacional completa da Loja: simples para a rotina diária, rigorosa para finanças e documentos, rastreável para a administração e preparada para múltiplas Lojas sem mistura de dados.

## Princípios obrigatórios

- Uma única fonte de dados por entidade e por Loja.
- Menor privilégio, RLS e ações sensíveis auditadas.
- Mutações pontuais e transacionais; nenhuma reconciliação destrutiva de snapshots.
- Fluxos guiados, estados vazios úteis e linguagem não técnica.
- Indicadores calculados a partir de lançamentos reais.
- Histórico preservado para documentos, finanças, mandatos e progressões.
- Desktop e celular com a mesma capacidade operacional.

## Fases

### Fase 1 — Governança e segurança operacional

- Auditoria automática por Loja, usuário, tabela, operação e registro.
- Histórico administrativo com filtros e detalhes antes/depois.
- Permissão exclusiva para consulta de auditoria.
- Seleção explícita de Loja para usuários com mais de um vínculo.
- Tipos do schema Supabase e testes de RLS.

Critério de aceite: toda alteração crítica é rastreável e um usuário nunca consulta outra Loja.

### Fase 2 — Sessões e agenda unificadas

- Calendário mensal, semanal e lista.
- Pauta, ordem do dia, horários, local, grau e responsáveis.
- Fluxo planejada → aberta → encerrada → documento aprovado.
- Cargos específicos da sessão, visitantes e justificativas.
- Pendências geradas por decisão e lembretes.

### Fase 3 — Tesouraria profissional

- Contas bancárias e caixa, categorias e centros de custo.
- Contas a pagar/receber, parcelamento, negociação e conciliação.
- Mensalidades com pagamento parcial, isenção, vencimento e acordo.
- Orçamento, fechamento mensal e anexos comprobatórios.
- Tronco segregado contabilmente e prestação de contas por competência.

### Fase 4 — Secretaria e documentos

- Numeração configurável por tipo/ano.
- Modelos, versionamento, aprovação e assinatura.
- Documentos recebidos/expedidos, anexos e pesquisa textual.
- Ata e balaústre derivados da sessão, sem redigitação.

### Fase 5 — Admissão e progressão maçônica

- Pipeline configurável de indicação, documentos, sindicância, parecer e votação.
- Controle de dados sensíveis por permissão.
- Interstícios, instruções, peças, avaliações, elevação e exaltação.

### Fase 6 — Comissões, tarefas e comunicação

- Comissões permanentes/temporárias, responsáveis, prazos e entregas.
- Caixa de tarefas integrada às decisões e sessões.
- Avisos por perfil, cargo, grau e situação, com confirmação de leitura.

### Fase 7 — Patrimônio, eventos e biblioteca

- Tombamento, localização, responsável, manutenção, transferência e baixa.
- Eventos e ágapes com participantes, fornecedores e prestação de contas.
- Normas, regulamentos e documentos históricos com versão e vigência.

### Fase 8 — Inteligência gerencial

- Painéis por perfil, alertas configuráveis e metas.
- Relatórios PDF/planilha, comparativos por gestão e indicadores históricos.
- Transição de gestão com termo, saldos, obrigações e patrimônio.

## Ordem imediata de execução

1. Aplicar e validar a migration de auditoria em ambiente de homologação.
2. Liberar a tela de Auditoria apenas para Administrador e Venerável Mestre.
3. Integrar seletor de Loja ao contexto autenticado.
4. Gerar tipos do banco e criar testes de RLS.
5. Iniciar Sessões e Agenda unificadas.

