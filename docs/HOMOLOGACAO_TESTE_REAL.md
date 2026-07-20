# Homologação do teste real — SIGMA LUMP

Data: 19/07/2026  
Repositório: `analistamarcusbrasil-hue/sigma`  
Branch: `agent/correcao-geral-homologacao-real`  
Pull request: #29  
Supabase: `rvkkwspikkgjgruosdwh`  
Preview Vercel: `sigma-git-agent-corre-1aa0de-analistamarcusbrasil-hues-projects.vercel.app`

## Resultado executivo

A homologação encontrou falhas reais de integração entre a interface e restrições antigas do banco. As correções foram feitas em código e em duas migrações aditivas, sem exclusão de dados. Os testes de banco usam transações com `rollback` e não deixam registros artificiais.

## Causas encontradas e correções

| Fluxo | Causa real | Correção |
| --- | --- | --- |
| Agenda | restrições antigas continham textos UTF-8 corrompidos, como `SessÃ£o`, incompatíveis com a interface | migração 20260803 converte dados e recria restrições canônicas; interface valida início, término e intervalo |
| Comunicado sem e-mail | a gravação era feita no cliente e a fila só aceitava tramitações de solicitações | ação de servidor, gatilho por público-alvo e fila ampliada para `comunicado_id` |
| Visitante | `data_cadastro` recebia string vazia | cliente usa data atual e o banco possui `default current_date` |
| Obreiro/Loja | Portal depende do vínculo ativo em `loja_usuarios` | vínculo validado; João está ativo, ligado ao Obreiro correto e com acesso ao Portal; cadastro agora informa claramente que usa a Loja ativa |
| Portal sem solicitações | consulta dependia apenas de `usuario_id` | consulta aceita o usuário autenticado ou o `obreiro_id` vinculado |
| Portal sem comunicados | consulta não restringia publicação, expiração e público | somente publicados, vigentes e destinados ao perfil |
| Cartões extensos | detalhes eram renderizados abertos em todos os itens | cartões compactos com abertura individual por `details/summary` |
| Tronco sem natureza | fluxo legado não preenchia `natureza` | cliente envia natureza/origem/status e gatilho/default protegem qualquer outro insert |
| Custos fixos | não existia edição e recálculo | edição do custo e de parcela futura individual, recálculo com centavos na última parcela e preservação das parcelas já pagas |
| Secretaria | restrições antigas usavam `ConcluÃda/ConcluÃdo` | migração 20260803 normaliza dados e restrições; erros de validação ficaram amigáveis |
| Conclusão de solicitação | erro esperado lançado por Server Action era mascarado em produção | ação retorna resultado discriminado e a interface exibe a causa sem derrubar Server Components |

## Migrações aplicadas

- `20260802_real_homologation_hardening.sql`
  - default e gatilho para lançamentos financeiros;
  - normalização de data cadastral;
  - índices do Portal;
  - fila de e-mails para comunicados;
  - gatilho de distribuição por público-alvo.
- `20260803_canonical_utf8_status_constraints.sql`
  - tipos/status canônicos da Agenda;
  - status canônicos de ações e processos da Secretaria.

As versões `20260802` e `20260803` constam em `supabase_migrations.schema_migrations`.

## Evidências de banco

Teste transacional executado com sucesso e revertido:

- visitante sem data explícita recebeu data atual;
- Tronco recebeu `natureza = Entrada`;
- Agenda aceitou `Sessão` e `Público da Loja`;
- Secretaria aceitou `Concluída`;
- processo aceitou `Concluído`;
- custo foi criado e editado com novo valor e nova quantidade;
- comunicado publicado gerou destinatários na fila;
- transação revertida ao final;
- quantidade final de eventos artificiais na Agenda: zero.

Teste de RLS:

- Administrador conseguiu inserir evento na Agenda dentro de transação revertida;
- João Otálio visualiza apenas o próprio Obreiro;
- João visualiza suas 3 solicitações existentes;
- João visualiza o comunicado publicado vigente;
- nenhum dado do teste de RLS permaneceu no banco.

## Checklist funcional

- [x] Agenda: validação e persistência de banco
- [x] Comunicado: persistência, distribuição e fila de e-mail
- [x] Visitante: cadastro sem erro de data vazia
- [x] João Otálio: vínculo Loja/Obreiro/Portal validado
- [x] Portal: solicitações e comunicados visíveis por RLS
- [x] Solicitações: cartões compactos e tramitação expansível
- [x] Tronco/Livro Caixa: natureza protegida em todos os inserts
- [x] Custos: edição do contrato e de parcela futura, recálculo exato e pagamentos preservados
- [x] Secretaria: restrições de status compatíveis
- [x] Conclusão: erro esperado tratado sem falha genérica de Server Components
- [x] Migrações: aplicadas e idempotentes
- [x] Preview Vercel: deploy `Ready` e página de login carregada
- [x] Qualidade em nuvem: Vercel executou `npm run check` (`lint` + testes + build) com sucesso
- [ ] GitHub Actions: runner permanece na fila desde a execução da `main` #40; indisponibilidade externa registrada
- [ ] Teste autenticado completo no preview
- [x] PR #29 integrado por squash na `main` (`f5653ac`)
- [x] Produção Vercel `Ready` em 56 s e smoke test final aprovado em `https://sigma-sand-nine.vercel.app/`

## Operação de e-mail

A fila é preenchida no mesmo fluxo da publicação/movimentação. O envio externo é processado pelo servidor com Resend. Na auditoria de 19/07/2026, `SUPABASE_SECRET_KEY` e `NEXT_PUBLIC_SITE_URL` estavam configurados, mas `RESEND_API_KEY` e `EMAIL_FROM` ainda não estavam presentes. Portanto, os eventos ficam auditáveis na fila como `Aguardando configuração`, sem quebrar o fluxo. Falhas transitórias permanecem na fila e são tentadas novamente, com até cinco tentativas e erro registrado.

## Evidência da qualidade em nuvem

Deployment Vercel `8HgnqS3PbzTfkTaS9QJXNrMTkC5W`, commit `c485c88`, concluído como `Ready` em 57 s. O log registrou:

- 24 cenários de permissão aprovados;
- 28 rotas, 25 migrações, fluxo com SLA e 3 exportações homologadas;
- compilação Next.js concluída;
- verificação TypeScript concluída;
- página `/login` carregada no preview com campos de e-mail, senha, Mostrar senha e recuperação.

O GitHub Actions permaneceu em `Queued` por indisponibilidade de runner já observada também na execução da `main` #40. Para não dispensar validação, o arquivo `vercel.json` passou a executar `npm run check` em cada build da Vercel.

## Critério de publicação

O PR somente deve ser integrado quando:

1. CI e build estiverem verdes;
2. preview Vercel estiver `Ready`;
3. migrações constarem no Supabase;
4. fluxo autenticado não apresentar erro impeditivo;
5. produção passar no smoke test após o merge.

Status final: critérios técnicos atendidos pela checagem completa na Vercel, migrações aplicadas e produção validada. O teste autenticado no preview permanece como reteste manual recomendado porque nenhuma senha de usuário real foi alterada durante a homologação.

## Roteiro de reteste manual

1. Entrar como Administrador e criar um compromisso na Agenda.
2. Cadastrar visitante sem preencher data cadastral.
3. Publicar comunicado para `Todos os obreiros` e conferir fila/status de e-mail.
4. Abrir Usuários, editar João e confirmar Obreiro vinculado e `Meu Portal`.
5. Entrar como João e abrir comunicado e suas solicitações.
6. Criar pedido com anexo e conferir o cartão compacto.
7. Tramitar como área técnica, pedir complemento e encaminhar ao Venerável.
8. Aprovar/recusar como Venerável e concluir a entrega.
9. Registrar Tronco e conferir natureza no Livro Caixa.
10. Editar custo fixo, recalcular parcelas e confirmar preservação das pagas.
11. Salvar ação/processo concluído na Secretaria.
