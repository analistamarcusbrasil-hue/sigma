# Homologação das tarefas 1 a 7

Data: 12/07/2026  
Branch: `agent/homologacao-integracao-migrations`

## Resultado técnico

- Gestão, Livro Caixa, Fechamento Mensal, Prestação Final, Repasse, Patrimônio, Documentos e permissões compilam juntos no Next.js 16.
- As 16 migrations existentes estavam aplicadas e ordenadas no Supabase remoto.
- O lint do esquema remoto não encontrou erros.
- Os 23 cenários automatizados da matriz de permissões passaram.
- Rascunhos e lançamentos cancelados permanecem fora dos totais oficiais.
- A RLS de documentos foi alinhada ao módulo `/documentos`, eliminando o bloqueio indevido do Tesoureiro.
- Documentos, vínculos e patrimônio passaram a usar policies distintas para criar, editar e excluir.
- Fechamento Mensal, Prestação Final e Termo de Repasse possuem identificação e contato no PDF.

## Rotas validadas

O build reconheceu e gerou as rotas `/`, `/login`, `/dashboard`, `/agenda`, `/obreiros`, `/configuracoes`, `/tesouraria`, `/tesouraria/livro-caixa`, `/tesouraria/fechamento-mensal`, `/prestacao-contas`, `/prestacao-contas/final`, `/configuracoes/repasse`, `/patrimonio`, `/documentos`, `/chancelaria`, `/secretaria`, `/auditoria`, `/usuarios`, `/usuarios/desbloqueios` e `/backup`.

O endereço solicitado no roteiro como `/repasse-gestao` corresponde, na arquitetura atual, a `/configuracoes/repasse`. Não foi criado alias para evitar duplicação de rota.

## Fluxo integrado conferido

O encadeamento de tipos, serviços, tabelas e proteções foi conferido para Gestão → Livro Caixa → Fechamento Mensal → Prestação Final → Repasse. A finalização do repasse encerra a gestão de origem e protege a prestação aprovada. Gestão encerrada, prestação aprovada/bloqueada e repasse finalizado exigem desbloqueio administrativo válido para alterações protegidas.

Não foram inseridos dados fictícios no banco de produção. O teste funcional com dados reais deve ser executado por um administrador em uma loja de homologação, seguindo o checklist abaixo.

## Checklist manual com dados seguros

- [ ] Confirmar loja e administrador ativos.
- [ ] Criar obreiros de teste e uma gestão em rascunho.
- [ ] Ativar a gestão e conferir diretoria e saldo inicial no Dashboard.
- [ ] Criar agenda, sessão, presença e Tronco.
- [ ] Criar entrada, saída, rascunho e cancelado; conferir totais.
- [ ] Fechar e aprovar uma competência; confirmar bloqueio do período.
- [ ] Preparar e aprovar prestação final; gerar PDF.
- [ ] Preparar repasse, gerar termo e finalizar; confirmar gestão encerrada.
- [ ] Conferir patrimônio, baixa justificada, documentos e comprovantes.
- [ ] Repetir acessos com Administrador, Venerável, Tesoureiro, Secretário, Chanceler e Consulta.
- [ ] Conferir auditoria operacional, eventos bloqueados e desbloqueio justificado.

## Validações executadas

- `npm run build`: aprovado.
- `npm run lint`: zero erros; 15 avisos legados de hooks/variáveis não utilizadas.
- `npm run test:permissions`: 23 cenários aprovados.
- `supabase migration list`: migrations 10–25 sincronizadas antes desta branch.
- `supabase db lint --linked --level warning`: nenhum erro de esquema.

## Limitações conhecidas

- Upload binário para Storage ainda não existe; documentos guardam URL ou referência física.
- Não há ambiente separado com massa de teste para automatizar mutações ponta a ponta sem risco aos dados reais.
- Os PDFs são funcionais, porém ainda simples.
- Existem 15 avisos legados de lint, sem erro de produção.
- O deploy publicado deve ser acompanhado pelos checks da Vercel após o merge.

