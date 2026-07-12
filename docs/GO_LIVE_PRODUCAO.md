# Go Live de produção — SIGMA 2.0

Data: 12/07/2026  
Projeto Supabase: `rvkkwspikkgjgruosdwh`  
Produção: `https://sigma-sand-nine.vercel.app/`

## Escopo validado

- autenticação, perfil ativo e proteção de rotas;
- Dashboard, Agenda, Obreiros e Gestão Atual;
- Livro Caixa, Fechamento Mensal e Prestação Final;
- Repasse de Gestão, Termo de Repasse e proteção de encerramento;
- Patrimônio, Documentos e comprovantes por link/referência física;
- usuários, matriz de permissões, auditoria e desbloqueios administrativos;
- PDFs de Fechamento, Prestação Final e Repasse com rodapé institucional;
- dados demo desativados por padrão em produção.

## Rotas

Foram protegidas pelo smoke test 21 rotas públicas e autenticadas, incluindo `/login`, `/dashboard`, `/configuracoes`, `/tesouraria/livro-caixa`, `/tesouraria/fechamento-mensal`, `/prestacao-contas/final`, `/repasse-gestao`, `/patrimonio`, `/documentos`, `/auditoria` e `/usuarios`. A rota `/repasse-gestao` redireciona para a implementação protegida em `/configuracoes/repasse`.

## Qualidade

- `npm run test`: 40 testes unitários, 23 cenários de permissão e smoke/homologação aprovados.
- `npm run test:coverage`: cobertura das regras novas acima de 97% em statements e 100% de funções.
- `npm run lint`: zero erros; 15 avisos legados documentados.
- `npm run build`: build Next.js e TypeScript aprovados.
- `SIGMA CI`: lint, testes e build executados em Pull Requests e pushes na `main`.

## Banco e segurança

As migrations `20260710` a `20260726` estão aplicadas no Supabase. O lint remoto do esquema não encontrou erros. A cadeia é aditiva, mantém RLS e separação por Loja, e protege registros encerrados por desbloqueio administrativo justificado.

## Publicação

O commit final publicado é o merge do Pull Request de Go Live registrado no histórico da `main`. A confirmação do GitHub Actions e do deployment da Vercel deve permanecer vinculada a esse commit.

## Pendências não críticas

- 15 avisos legados de React Hooks/variáveis sem uso;
- upload binário privado no Supabase Storage ainda não implementado;
- E2E com navegador deve usar projeto Supabase exclusivo de homologação;
- PDFs funcionais, ainda sem assinatura digital e identidade visual avançada.

## Próximos passos

Criar ambiente permanente de homologação, implementar Storage privado, ampliar E2E e eliminar gradualmente os avisos legados sem alterar regras financeiras.
