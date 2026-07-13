# Acesso ao Portal do Obreiro

## Regra contextual por Loja

O acesso é controlado em loja_usuarios.acesso_portal_obreiro. Para abrir **Meu Portal**, o vínculo da Loja ativa precisa ter:

- status ativo;
- acesso_portal_obreiro verdadeiro;
- obreiro_id preenchido;
- perfil global ativo.

O próprio usuário não pode alterar essa liberação.

## Perfil Obreiro

O perfil Obreiro recebe somente a permissão /portal-obreiro. Ao ser ativado com um Obreiro vinculado, o acesso ao Portal é liberado automaticamente. Ele não recebe Dashboard, Usuários, Tesouraria, Secretaria, Configurações ou outros módulos administrativos.

## Perfis administrativos

Um Administrador ou outro perfil pode receber acesso ao Portal sem perder suas funções administrativas. O menu **Meu Portal** aparece apenas na Loja em que a liberação e o vínculo com Obreiro estiverem válidos.

## Conteúdo disponível

O Portal mantém os dados já isolados por RLS:

- meus dados;
- frequência;
- mensalidades e recebimentos;
- agenda pública;
- documentos liberados;
- comunicados;
- solicitações do próprio usuário.

## Diagnóstico

- **Portal não liberado:** habilitar a opção no cadastro do vínculo.
- **Obreiro não vinculado:** selecionar o Obreiro correto na Loja ativa.
- **Acesso suspenso:** reativar o perfil e revisar a liberação.
- **Troca de senha pendente:** concluir /alterar-senha.
- **Loja errada:** selecionar a Loja que contém o vínculo válido.

Toda concessão, remoção e tentativa bloqueada deve ser verificável na auditoria.
