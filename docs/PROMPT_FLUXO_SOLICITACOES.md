# Prompt executável — Fluxo completo de Solicitações dos Obreiros

## Objetivo

Evoluir o Portal do Obreiro do SIGMA 2.0 para receber, classificar, distribuir, acompanhar e concluir solicitações com segurança, prazo e transparência, mantendo isolamento por Loja e autorização por perfil.

## Regras funcionais

1. Toda solicitação recebe protocolo único no formato `SIG-AAAAMMDD-XXXXXXXX`.
2. O tipo escolhido define automaticamente área, perfil responsável e SLA:
   - assunto financeiro, pagamento ou comprovante: **Tesouraria / Tesoureiro**, 3 dias corridos;
   - frequência, presença ou justificativa de falta: **Chancelaria / Chanceler**, 2 dias corridos;
   - solicitação geral à Chancelaria: **Chancelaria / Chanceler**, 3 dias corridos;
   - Kit Placet, documento ou certidão: **Secretaria / Secretário**, 5 dias corridos;
   - atualização cadastral: **Secretaria / Secretário**, 3 dias corridos;
   - demais assuntos: **Administração / Venerável Mestre**, 5 dias corridos.
3. Administrador e Venerável Mestre veem todas as solicitações da Loja.
4. Secretário, Tesoureiro e Chanceler veem somente as filas destinadas ao próprio perfil.
5. O Obreiro vê somente as próprias solicitações.
6. O acesso administrativo não depende de liberação do Portal do Obreiro nem de vínculo pessoal com cadastro de Obreiro.
7. Cada mudança registra status anterior, novo status, etapa, mensagem, perfil responsável, data/hora e documento relacionado.
8. Estados de atendimento: Pendente, Em análise, Aprovada, Recusada e Concluída.
9. A conclusão exige resposta final. O documento final, quando houver, deve usar link HTTPS.
10. O Obreiro pode abrir/baixar o documento final dentro da solicitação concluída.

## Experiência do gestor

Criar uma Central de Solicitações com:

- indicadores de pendentes, em análise, vencimento próximo e atraso;
- filtros por status, área e prazo;
- protocolo, Obreiro, assunto, classificação, responsável, prioridade, etapa e prazo;
- contagem de dias restantes ou dias em atraso;
- histórico cronológico completo;
- campo de resposta visível ao Obreiro;
- campo HTTPS para documento final;
- ações Em análise, Aprovada, Recusada e Concluída;
- retorno imediato de sucesso ou erro sem atualização manual da página.

No Dashboard da Gestão, exibir:

- total em andamento;
- pendentes;
- vencimentos hoje/amanhã;
- atrasadas;
- distribuição por área;
- lista de atenção imediata;
- acesso direto à Central de Solicitações.

## Experiência do Obreiro

No Portal do Obreiro:

- apresentar tipos claros de solicitação;
- informar que a distribuição será automática;
- após enviar, mostrar protocolo, área responsável e prazo;
- exibir status e etapa atual;
- exibir linha do tempo completa;
- exibir resposta do responsável;
- oferecer botão **Baixar documento final** quando disponível.

## Segurança e arquitetura

- Validar autenticação e autorização em toda Server Action.
- Validar UUID, status, tamanho da resposta e URL HTTPS no servidor.
- Aplicar RLS por Loja, usuário e perfil.
- Impedir que um perfil responda solicitações de outra área.
- Registrar alterações por função transacional no banco.
- Não confiar em campos de perfil enviados pelo navegador.
- Revalidar Portal, Central e Dashboard após cada mudança.
- Preservar todas as regras existentes de credenciais, primeiro acesso e múltiplas Lojas.

## Critérios de aceite

- Administrador acessa `/solicitacoes` sem a mensagem de bloqueio do Portal.
- Solicitação financeira aparece para Tesoureiro e administradores.
- Solicitação de presença aparece para Chanceler e administradores.
- Kit Placet/documentos aparecem para Secretário e administradores.
- Perfis de área não veem filas alheias.
- João Otálio vê protocolo, prazo e tramitação da própria solicitação.
- Toda alteração feita pelo gestor aparece para João após recarregar.
- Solicitação concluída com documento mostra o botão de download.
- Dashboard apresenta volumes e atrasos corretamente.
- Migração, lint, testes, build e deploy Vercel são aprovados.
