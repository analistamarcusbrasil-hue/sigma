# Notificações por e-mail com Resend

## Visão geral

O SIGMA LUMP mantém uma fila transacional por Loja e envia somente avisos genéricos. O conteúdo funcional permanece dentro do sistema autenticado.

A rota administrativa é `/notificacoes` e está disponível apenas para Administradores ativos vinculados à Loja selecionada.

## Variáveis da Vercel

Configure nos ambientes desejados:

```env
RESEND_API_KEY=re_...
EMAIL_FROM=SIGMA LUMP <notificacoes@seu-dominio-verificado.com>
NEXT_PUBLIC_SITE_URL=https://sigma-sand-nine.vercel.app
```

Nunca use prefixo `NEXT_PUBLIC_` na chave do Resend. O valor da chave não aparece no cliente, nos logs do painel nem na fila.

O domínio do `EMAIL_FROM` precisa estar validado no Resend. Enquanto qualquer uma das duas variáveis estiver ausente, o SIGMA não quebra: a fila usa o status **Aguardando configuração**.

## Eventos atendidos

- Comunicado publicado;
- Solicitação criada pelo Obreiro;
- Solicitação respondida;
- Justificativa enviada;
- Justificativa aprovada ou recusada;
- Comprovante enviado;
- Comprovante aprovado ou recusado;
- Acesso ao Portal liberado;
- Senha definida pelo Administrador;
- Documento aprovado disponível;
- Teste administrativo.

Rascunhos de comunicado não geram e-mail.

## Privacidade e segurança

O e-mail contém somente:

- cabeçalho **SIGMA LUMP**;
- nome do destinatário;
- aviso de que há uma atualização;
- botão **Acessar o SIGMA**;
- rodapé institucional.

Não são enviados senha, justificativa, resposta, protocolo, comprovante, documento, dados financeiros ou dados de outro Obreiro.

Antes de cada envio, o serviço confirma novamente:

1. perfil ativo;
2. vínculo ativo com a mesma Loja;
3. endereço de e-mail ainda correspondente ao cadastro;
4. rota interna segura.

Usuários suspensos, revogados, bloqueados ou sem vínculo são marcados como **Ignorado** e não recebem mensagem.

## Público de comunicados

- **Todos os obreiros:** usuários ativos vinculados a Obreiro na Loja;
- **Diretoria:** Administrador, Venerável Mestre, Secretário, Tesoureiro, Chanceler e Orador;
- **Obreiro:** perfil Obreiro;
- públicos específicos: correspondência exata do perfil.

Cada comunicado usa uma chave de deduplicação por comunicado e destinatário.

## Estados da fila

- **Aguardando configuração:** faltam `RESEND_API_KEY` ou `EMAIL_FROM`;
- **Pendente:** pronto para envio;
- **Enviando:** chamada ao Resend em andamento;
- **Enviado:** aceito pelo Resend, com identificador do provedor;
- **Falhou:** o provedor recusou ou ocorreu erro de rede;
- **Ignorado:** destinatário inválido, inativo ou bloqueado.

O Administrador pode processar pendentes, reenviar falhas e testar o envio para o próprio e-mail.

## Auditoria

A tabela `notificacoes_email_eventos` registra enfileiramento, processamento, reenvio, resultado e responsável administrativo. A fila e sua auditoria são isoladas por Loja com RLS.

## Testes

A validação automatizada cobre:

1. rascunho não dispara processamento;
2. publicação gera fila por trigger;
3. serviço chama o Resend quando configurado;
4. ausência de configuração preserva a fila;
5. reenvio de falhas;
6. bloqueados são ignorados;
7. solicitação criada avisa o setor;
8. resposta avisa o Obreiro;
9. aviso de senha não contém a senha;
10. rota, painel, estados e auditoria;
11. `npm run check` e `npm run build`.

Execute:

```bash
npm run test:email
npm run check
npm run build
```

## Operação

1. Acesse **Notificações**.
2. Confirme que as duas variáveis aparecem como configuradas.
3. Clique em **Testar no meu e-mail**.
4. Verifique o status **Enviado**.
5. Em caso de **Falhou**, confira o domínio remetente no Resend e use **Reenviar**.
