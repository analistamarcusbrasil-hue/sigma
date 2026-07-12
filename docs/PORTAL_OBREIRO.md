# Portal do Obreiro

O Portal oferece autoatendimento em `/portal-obreiro` para o usuário consultar somente seus dados cadastrais, frequência, mensalidades, agenda pública, documentos liberados, comunicados e solicitações.

## Vínculo e permissões

O vínculo usa `profiles.obreiro_id`, preenchido por Administrador em Usuários e Acessos. O Obreiro não pode alterar o próprio vínculo. Sem vínculo, o Portal mostra orientação para procurar a Secretaria.

## Solicitações

Atualização cadastral, justificativa de falta e informação de pagamento são gravadas em `solicitacoes_obreiro` como pendentes. Nenhuma solicitação altera automaticamente presença, mensalidade ou cadastro oficial. A diretoria analisa em `/solicitacoes` e registra resposta/status, com auditoria.

## Comunicados

Perfis autorizados gerenciam `/comunicados`. O Portal recebe apenas comunicados publicados, válidos e destinados ao perfil do usuário. Rascunhos, arquivados e expirados não são expostos ao Obreiro.

## Segurança

A migration `20260727_worker_portal_communication.sql` adiciona RLS por `auth.uid()` e `obreiro_atual()`. Para perfil Obreiro, Obreiros, presenças, mensalidades e recebimentos são limitados ao próprio `obreiro_id`; agenda exige visibilidade pública; documentos exigem visibilidade “Todos os obreiros” ou “Individual” vinculado ao próprio cadastro; solicitações são próprias.

## Limitações

Comprovantes usam link ou observação até a implantação de Storage privado. A classificação de documentos novos começa como Restrito, evitando exposição acidental. A publicação individual deve ser configurada pela administração por integração/tela ampliada futura.
