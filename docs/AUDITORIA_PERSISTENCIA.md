# Auditoria de persistência do SIGMA

Auditoria realizada em 11/07/2026 antes da implantação do banco operacional.

## Migrado para Supabase

| Módulo | Chaves locais anteriores | Situação |
| --- | --- | --- |
| Obreiros e visitantes | `sigma_obreiros` | CRUD migrado para `public.obreiros` |
| Sessões | `sigma_sessoes` | Secretaria e Chancelaria migradas para `public.sessoes` |
| Presenças | `sigma_presencas` | Chancelaria e consultas da Secretaria migradas para `public.presencas` |

Os dados dessas três chaves não são mais lidos nem gravados pelas telas migradas. A migração não importa automaticamente dados antigos do navegador; cadastros reais devem ser conferidos antes de remover qualquer backup local.

## Estrutura criada, integração de tela pendente

| Módulo | Persistência atual encontrada | Tabela criada |
| --- | --- | --- |
| Administrações/mandatos | `sigma_gestoes`, `sigma_gestao_atual_id`, `sigma_configuracao_gestao`, `sigma_ano_trabalho`, `sigma_data_inicio_gestao`, `sigma_saldo_anterior` | `administracoes`, `administracao_cargos` |
| Mensalidades | `sigma_regras_mensalidade` e referências a `sigma_mensalidades` | `mensalidades` |
| Recebimentos | `sigma_recebimentos_tesouraria` | `recebimentos` |
| Tronco de solidariedade | misturado em `sigma_lancamentos_financeiros` | `tronco_solidariedade` |
| Atas/balaústres | `sigma_documentos_secretaria` | `documentos_secretaria` |
| Ações da Secretaria | `sigma_acoes_secretaria` | `acoes_secretaria` |
| Processos | `sigma_processos_secretaria` | `processos_secretaria` |

Persistências auxiliares ainda locais: `sigma_pecas_secretaria`, `sigma_decisoes_loja`, `sigma_lancamentos_financeiros`, `sigma_custos_loja` e os metadados do módulo de backup. Dashboard e Prestação de Contas também leem as chaves financeiras e de gestão acima.

## Decisões de segurança

- O navegador usa somente a publishable key e a sessão do Supabase Auth.
- A secret key permanece exclusivamente no servidor e não foi lida nem alterada nesta implementação.
- Toda tabela operacional possui RLS.
- Leitura exige vínculo ativo em `loja_usuarios`; escrita exige papel gestor, perfil administrativo ou a permissão de rota correspondente no `profiles.permissoes`.
- Chaves estrangeiras com `restrict` preservam histórico; presenças são removidas em cascata apenas quando a própria sessão é excluída.
