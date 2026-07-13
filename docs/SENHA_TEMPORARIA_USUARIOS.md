# Senha temporária de usuários

## Objetivo

O Administrador SIGMA pode cadastrar ou redefinir diretamente a senha inicial em **Usuários e Acessos**. A senha é enviada exclusivamente ao Supabase Auth pelo servidor e nunca é gravada em tabelas, logs, respostas, eventos de auditoria ou documentação.

## Regras

- somente o perfil global Administrador ativo executa a operação;
- a senha é escolhida pelo Administrador e precisa apenas respeitar o mínimo técnico de 6 caracteres do Supabase;
- confirmação idêntica é obrigatória;
- o motivo administrativo é obrigatório;
- **Exigir troca no próximo login** é opcional e vem desmarcado;
- quando a troca não é exigida, a senha informada continua funcionando até ser alterada pelo Administrador ou pelo usuário;
- usuário já existente no Auth é atualizado, sem duplicação;
- usuário inexistente é criado confirmado e vinculado à Loja;
- o fluxo de convite por e-mail continua disponível.

## Primeiro acesso

Quando deve_trocar_senha está ativo, o proxy redireciona qualquer navegação protegida para /alterar-senha. Após a nova senha ser aceita pelo Auth:

1. o indicador é removido de todos os vínculos ativos do usuário;
2. o evento é auditado sem incluir a senha;
3. Obreiro segue para /portal-obreiro;
4. demais perfis seguem para /dashboard.

Se a senha ou confirmação estiver incorreta, a tela permanece aberta e permite nova tentativa.

## Auditoria

A auditoria registra ator, Loja, ação, usuário afetado, data e motivo. Nunca registra senha temporária nem nova senha.

## Operação em produção

1. aplicar 20260729_temporary_password_portal_access.sql;
2. confirmar os checks do PR;
3. validar com um usuário de homologação;
4. somente então promover o deploy.
