# Secretaria — Balaústres e Atas Administrativas

O módulo profissional de Secretaria registra Balaústres de Sessões Ordinárias e Magnas, Atas de Reunião Administrativa, Atas de Diretoria e documentos avulsos. Todo registro pertence a uma Loja e pode ser associado à Gestão e à Sessão.

## Rotas

- `/secretaria/balaustres` e `/secretaria/balaustres/novo`;
- `/secretaria/balaustres/[id]`;
- `/secretaria/atas-administrativas` e `/secretaria/atas-administrativas/nova`;
- `/secretaria/atas-administrativas/[id]`;
- `/api/secretaria/documentos/[id]/pdf` para o PDF privado autenticado.

## Fluxo e bloqueio

1. Secretário ou Administrador cria e edita o `Rascunho`.
2. O texto oficial pode ser gerado a partir dos campos e editado manualmente.
3. `Enviar para revisão` muda para `Em revisão`.
4. Venerável Mestre ou Administrador revisa e muda para `Aguardando aprovação`.
5. Venerável Mestre ou Administrador aprova. O documento passa a `Aprovado`, recebe URL privada do PDF e fica bloqueado pelo trigger do banco.
6. A reabertura exige justificativa de no mínimo 10 caracteres, incrementa a versão, remove a aprovação anterior e registra histórico/auditoria.
7. Documento aprovado pode ser arquivado, mantendo o bloqueio.

O bloqueio não depende da interface: `preparar_documento_secretaria` impede alteração direta de documentos aprovados ou arquivados. Mudanças de status só ocorrem pela função controlada `movimentar_documento_secretaria`.

## Permissões e isolamento

- Administrador: vê todos os documentos da Loja, cria, edita e executa o fluxo;
- Venerável Mestre: vê todos, revisa, aprova, arquiva e reabre;
- Secretário: vê todos, cria e edita somente rascunhos, envia para revisão;
- Tesoureiro: lê somente documentos marcados com conteúdo financeiro;
- Chanceler: lê somente documentos marcados com presença/frequência;
- Orador: lê somente documentos em que sua assinatura é aplicável;
- Obreiro: não acessa documentos internos. A tabela de liberações permite somente leitura nominal e específica, sem abrir acesso geral ao módulo.

Todas as consultas são protegidas por RLS e `loja_id`. O PDF consulta o documento com a sessão autenticada, portanto não aceita leitura cruzada entre Lojas.

## PDF institucional

O PDF definitivo só é gerado para `Aprovado` ou `Arquivado`. Ele contém cabeçalho da Loja, Gestão, texto oficial, versão, assinaturas do Secretário e Venerável Mestre e, conforme as marcações, Orador, Tesoureiro e Chanceler. Todas as páginas recebem o rodapé:

`Sistema desenvolvido por Marcus Brasil • Contato: analista.marcusbrasil@gmail.com`

## Integrações

- Agenda/Sessões: seleção da Sessão preenche data, grau e Gestão;
- Gestão: associação obrigatória e cabeçalho do PDF;
- Chancelaria e Tesouraria: visibilidade e assinaturas condicionais;
- Dashboard: resumo das filas de revisão, aprovação e aprovados;
- Documentos: atalhos para consulta e impressão;
- Deliberações: responsável, prazo e situação no documento.

## Validação

Execute `npm run check`. O teste `npm run test:secretaria` verifica rotas, matriz de acesso, RLS, fluxo, bloqueio pós-aprovação, reabertura justificada e rodapé do PDF.

