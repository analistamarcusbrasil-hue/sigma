# Roadmap do SIGMA 2.0 após homologação

## Portal do Obreiro

- Portal, solicitações e comunicados internos implementados com RLS individual.
- Próximo passo: upload privado de comprovantes, notificações e confirmação de leitura avançada.

## Prioridade 1 — ambiente de homologação

- Criar projeto Supabase separado para testes e dados sintéticos.
- Automatizar o fluxo Gestão → Repasse com Playwright e limpeza transacional.
- Manter migrations imutáveis depois de aplicadas e exigir `db lint` no CI.

## Prioridade 2 — documentos

- Implementar bucket privado no Supabase Storage.
- Validar tipo, tamanho, antivírus e URL assinada dos comprovantes.
- Integrar anexos à Prestação Final e ao Repasse.

## Prioridade 3 — qualidade contínua

- Corrigir os avisos legados de hooks do React.
- Adicionar testes unitários para saldos, fechamento e transição de status.
- Executar build, lint, testes e validação de migrations em cada Pull Request.

## Prioridade 4 — relatórios

- Evoluir os PDFs com paginação, assinaturas e identidade da Loja.
- Criar exportações estruturadas sem duplicar cálculos financeiros.


## Backup e continuidade

- Backup manual por Loja, histórico, download privado, hash, auditoria e exclusão protegida implementados.
- Pré-visualização de restauração com confirmação forte e backup pré-restauração implementada.
- Próximo passo: restauração completa transacional em ambiente de homologação, com ordem de dependências e rollback.
- Evoluções: retenção automática, agendamento, ZIP/criptografia, binários e backup global governado.
