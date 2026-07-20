# UX mobile do Portal e da Diretoria

## Resultado

A interface prioriza leitura e operação em telas pequenas sem alterar o modelo de permissões ou o isolamento por Loja. O Obreiro continua restrito ao Meu Portal, enquanto as funções administrativas permanecem condicionadas ao perfil e às permissões da Loja ativa.

## Portal do Obreiro

- Resumo inicial em cartões compactos.
- Dados, tesouraria, frequência, agenda, comunicados e documentos recolhidos por padrão.
- Formulário de nova solicitação aberto por uma ação explícita.
- Solicitações e tramitação recolhidas por padrão, com ação **Ver detalhes**.
- Resposta da Loja sinalizada como **Nova resposta** até o protocolo ser aberto naquele dispositivo.
- Documento aprovado e comprovante disponíveis em botões próprios.

O indicador de novidade usa apenas armazenamento local do navegador. Ele não transfere dados entre usuários e não modifica o status oficial do protocolo.

## Diretoria

- Usuários mostram perfil, Loja, vínculo, Portal, último acesso, senha definida e status, além de ações rápidas.
- Custos exibem rótulos, explicação do parcelamento e resumo antes da gravação.
- A Chancelaria usa cartões de chamada no celular e mantém a tabela operacional no desktop.
- A Agenda inicia em lista no celular e mantém calendário/lista selecionáveis.
- Solicitações administrativas e comunicados usam detalhes e formulários recolhidos.

## Validação

Execute:

```bash
npm run test:ux
npm run check
```

O teste confirma os controles essenciais, o comportamento compacto e as duas barreiras que impedem o perfil Obreiro de receber ou abrir módulos administrativos.
