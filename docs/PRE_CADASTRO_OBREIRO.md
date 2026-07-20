# Pré-cadastro público do Obreiro

## Objetivo e rotas

O pré-cadastro permite que um interessado envie dados básicos sem possuir login. A rota pública é `/pre-cadastro`; a fila administrativa protegida é `/pre-cadastros`. O envio não cria Obreiro, usuário, sessão ou acesso ao Portal.

## Dados coletados

São obrigatórios Loja, nome completo, e-mail, telefone/WhatsApp, CIM, grau, situação, declaração de veracidade e consentimento. Nome preferido, CPF, nascimento, Loja de origem, Oriente, Potência, cargo e observações são opcionais. Todos os textos têm limites no navegador, no servidor e no banco.

Somente Lojas com `ativa=true` são apresentadas. A resposta pública contém apenas nome, número e identificador técnico da Loja; potência, endereço, membros e dados administrativos não são expostos.

## Avaliação administrativa

Administrador ativo pode consultar a fila global e o Venerável Mestre somente as Lojas às quais está vinculado. Obreiro, Secretário e outros perfis não acessam a fila. Os filtros cobrem Loja, status, data, grau, palavra-chave, CIM e e-mail.

O avaliador pode marcar em análise, aprovar, recusar, solicitar correção ou arquivar. Recusa e correção exigem orientação. A trilha registra visualização, mudança de status e decisão.

## Conversão em Obreiro e criação de usuário

Somente um pedido aprovado pode ser convertido. Antes da criação, o sistema pesquisa e-mail, CIM e CPF na mesma Loja. Havendo coincidência, exige que o Administrador escolha o cadastro existente; os dados recebidos apenas completam campos vazios. Sem coincidência, cria um Obreiro na Loja escolhida e grava `obreiro_id_criado`.

A criação do usuário é uma ação posterior e exclusiva do Administrador em Usuários e Acessos. O formulário vem vinculado ao Obreiro convertido, mas o Portal permanece desmarcado até decisão explícita. Convite ou senha temporária usam o fluxo existente; a senha nunca é armazenada ou enviada por e-mail. Ao concluir, `usuario_id_criado` e a auditoria são registrados.

## Segurança e LGPD

- API pública exclusivamente no servidor; nenhuma chave privilegiada entra no cliente.
- Tabelas sem grants para `anon`; RLS limita leitura e atualização administrativa por perfil/Loja.
- Honeypot invisível e limite de três tentativas por IP ou e-mail a cada hora.
- IP armazenado somente como SHA-256 não reversível; token de acompanhamento armazenado como hash.
- Validação de formato, tamanho, Loja ativa, e-mail, telefone, CIM e consentimento.
- Mensagens públicas limitadas e sem consulta de cadastros existentes.
- Dados usados apenas para avaliação cadastral autorizada; retenção/eliminação deve seguir a política LGPD da Loja.

## Auditoria e notificações

O trigger padrão registra INSERT/UPDATE na auditoria operacional. `pre_cadastros_eventos` registra envio, visualização, bloqueios, decisão, conversão e criação de usuário. O envio enfileira aviso para Administrador, Venerável e Secretaria; Resend ausente mantém a notificação em `Aguardando configuração` e nunca bloqueia o formulário.

## Limitações

Não existe autocorreção pública por token nesta versão; ao solicitar correção, a Administração deve orientar o interessado pelo contato informado. A notificação externa de aprovação/recusa também fica para evolução posterior. Aplicação da migration e teste transacional devem ocorrer primeiro no Supabase de homologação.
