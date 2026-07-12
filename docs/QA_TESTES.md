# QA e testes automatizados

## Comandos

```powershell
npm run test:unit
npm run test:permissions
npm run test:homologacao
npm run test
npm run test:coverage
npm run check
```

`test:unit` usa Vitest. `test:permissions` valida a matriz centralizada em 23 cenários. `test:homologacao` protege rotas, migrations, totais oficiais e exportações. `check` executa lint, toda a suíte e build.

## Cobertura atual

- valores vazios, `null`, `undefined` e `NaN`;
- saldo inicial, disponível, entrada, saída e fechamento;
- exclusão de rascunhos/cancelados e filtro por competência;
- comprovantes, mensalidades realizadas e Tronco separado;
- prestação, repasse, divergência e valores negativos;
- patrimônio ativo, baixa, documentação e documentos pendentes;
- moeda, data, percentual e ordenação de obreiros;
- perfis, módulos e ações da matriz de permissões;
- existência das rotas críticas e sequência de migrations;
- bloqueio dos dados demo por padrão.

## Validação manual ponta a ponta

Use um projeto Supabase de homologação. Crie Loja, obreiros e Gestão; registre agenda, sessão, presença e Livro Caixa; feche e aprove um mês; prepare a Prestação Final; gere e finalize o Repasse; confira a nova gestão, patrimônio, documentos, PDFs, permissões e auditoria. Não use dados fictícios na produção.

## Permissões e PDFs

Repita o acesso direto e as ações críticas com cada perfil. Usuários sem permissão devem receber bloqueio claro e gerar evento de segurança. Gere Fechamento, Prestação Final e Termo de Repasse e confira valores, paginação mínima e rodapé institucional.

## Ambiente publicado

Após merge, acompanhe os checks da Vercel, teste login e rotas principais com uma conta administrativa e execute o checklist de produção. Nunca inclua chaves ou credenciais em evidências de QA.

## Limitações

Componentes ainda são fortemente acoplados ao browser e ao Supabase; por isso não foi adicionada Testing Library agora. E2E com Playwright deve usar projeto e usuários exclusivos de homologação, com limpeza transacional. Os 15 avisos legados de lint permanecem sem impedir o build.

## Portal do Obreiro

Validar usuário Obreiro com e sem `obreiro_id`, isolamento de presenças/mensalidades, documento público e individual, comunicado publicado, criação de solicitação e resposta pela diretoria. O smoke test confere as policies individuais da migration 27.
