# Relatórios e PDFs Institucionais do SIGMA

## Visão geral

A rota `/relatorios` concentra a emissão profissional dos documentos da Loja. Todo PDF é gerado no servidor, usa os dados da sessão autenticada e exige a identificação da Loja ativa. A API confirma que o usuário possui vínculo ativo antes de consultar qualquer informação.

## Relatórios disponíveis

1. Frequência da Sessão;
2. Frequência Mensal;
3. Livro Caixa;
4. Fechamento Mensal;
5. Prestação de Contas;
6. Termo de Repasse de Gestão;
7. Tronco de Solidariedade;
8. Custos Fixos;
9. Solicitações;
10. Balaústres e Atas aprovados.

## Padrão institucional

O gerador compartilhado inclui em todas as páginas:

- nome e número da Loja;
- Potência, Oriente e UF quando cadastrados;
- Gestão e período;
- data/hora e responsável pela emissão;
- tabelas paginadas sem cortar registros;
- moeda brasileira e datas em `dd/mm/aaaa`;
- totais destacados e assinaturas adequadas ao documento;
- paginação e o rodapé obrigatório: `Sistema desenvolvido por Marcus Brasil • Contato: analista.marcusbrasil@gmail.com`.

Documentos com muitas colunas usam A4 horizontal. Linhas extensas são quebradas dentro da célula e levadas integralmente para a página seguinte quando necessário.

## Visualização e download

`Visualizar` abre o PDF em um painel responsivo. `Baixar PDF` usa o mesmo conteúdo com `Content-Disposition: attachment`. As respostas usam cache privado desativado e `nosniff`.

## Segurança multi-Loja

Todas as consultas aplicam `loja_id` validado contra `loja_usuarios`. O perfil também é validado por tipo: Tesouraria emite documentos financeiros; Chancelaria e Secretaria emitem frequência; Administrador e Venerável Mestre têm visão gerencial. Obreiro não recebe a rota `/relatorios`.

## Auditoria

A migration `20260807_professional_reports_pdfs.sql` cria `relatorios_geracoes`. Antes de entregar o arquivo, a API registra Loja, usuário, tipo, período, parâmetros e modo de saída. Se a auditoria falhar, o PDF não é liberado. A tabela possui RLS e também alimenta a auditoria operacional.

## Validação

Execute:

```bash
npm run test:relatorios
npm run check
npm run build
```

O teste cobre as dez prioridades, rodapé, BRL, datas brasileiras, paginação, RLS, auditoria e ausência de chave privilegiada no fluxo.
