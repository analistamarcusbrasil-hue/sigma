# Arquitetura multi-Loja SaaS

Cada entidade operacional possui `loja_id`. O vínculo contextual fica em `loja_usuarios`, com perfil, status, permissões e `obreiro_id` próprios por Loja. Um usuário pode ser Tesoureiro numa Loja e Obreiro em outra.

## Loja ativa

O seletor do AppShell mostra apenas vínculos retornados pelo Supabase. A escolha é guardada no navegador apenas como preferência; toda consulta confirma o vínculo pela RLS. Trocar a Loja recarrega os módulos e limpa o estado visual.

## Cadastro e onboarding

`/loja` mantém identidade, dados maçônicos, endereço, contatos, cores, rodapé e configurações operacionais. `/onboarding` cria uma Loja em implantação somente após confirmação e vincula o Administrador. `/admin-sigma` apresenta visão global ao Administrador.

## Segurança

As funções `usuario_tem_acesso_loja`, `usuario_perfil_na_loja` e `usuario_obreiro_na_loja` são `security definer` e usam vínculos ativos. RLS continua sendo a fonte de segurança. A preferência local nunca concede acesso.

## Compatibilidade

A migration 28 adiciona campos e faz backfill dos vínculos existentes a partir de `profiles`, sem apagar dados. Todas as Lojas, gestões, obreiros e lançamentos existentes são preservados.

## Limitações

O onboarding inicial cria a Loja e conduz à configuração institucional; diretoria, contas, categorias e convites continuam nos módulos especializados. PDFs mantêm o rodapé SIGMA atual e estão preparados para receber identidade completa da Loja em uma evolução incremental.
