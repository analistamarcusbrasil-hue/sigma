# Checklist de produção

- [ ] Confirmar URL, anon key e demais variáveis da Vercel sem expor valores em logs.
- [ ] Confirmar `NEXT_PUBLIC_ENABLE_DEMO_DATA` ausente ou diferente de `true`.
- [ ] Conferir migrations locais e remotas em ordem com `supabase migration list`.
- [ ] Executar `supabase db lint --linked` e confirmar RLS ativo.
- [ ] Confirmar ao menos um Administrador SIGMA ativo.
- [ ] Confirmar que o último administrador não pode ser removido, rebaixado ou suspenso.
- [ ] Testar login, logout, recuperação de senha e usuário sem perfil.
- [ ] Testar Dashboard e ausência de Loja/Gestão Atual.
- [ ] Testar criação, ativação e proteção de Gestão.
- [ ] Testar Livro Caixa com entrada, saída, rascunho, cancelado e comprovante.
- [ ] Testar Fechamento Mensal, aprovação e bloqueio do período.
- [ ] Testar Prestação Final, aprovação, proteção e PDF.
- [ ] Testar Repasse, Termo em PDF, finalização e encerramento da gestão.
- [ ] Testar Patrimônio, documento, baixa justificada e item sem documentação.
- [ ] Testar permissões com Administrador, Venerável, Tesoureiro, Secretário, Chanceler, Consulta e Obreiro.
- [ ] Conferir auditoria operacional, evento bloqueado e desbloqueio administrativo.
- [ ] Executar `npm run lint`.
- [ ] Executar `npm run test`.
- [ ] Executar `npm run build`.
- [ ] Confirmar checks do GitHub e deploy da Vercel.
- [ ] Testar Obreiro vinculado e sem vínculo no Portal.
- [ ] Confirmar que um Obreiro não consulta frequência, mensalidade ou documento individual de outro.
- [ ] Testar comunicado publicado e solicitação respondida.
- [ ] Registrar commit, data, responsável e versão publicada.
- [ ] Testar usuário com duas Lojas, troca da Loja ativa e isolamento dos dados.
- [ ] Confirmar perfil e vínculo de Obreiro específicos em cada Loja.



## Módulo Backup por Loja

- [ ] Confirmar migration `20260804_backup_module.sql`.
- [ ] Confirmar bucket privado `backups-sigma` e ausência de acesso público.
- [ ] Testar Administrador e Venerável Mestre na própria Loja.
- [ ] Confirmar bloqueio de Obreiro, Tesoureiro e usuário de outra Loja.
- [ ] Criar backup, conferir SHA-256, contagens, nome e download sem cache.
- [ ] Confirmar que o JSON não contém usuários, senhas, tokens, chaves ou variáveis de ambiente.
- [ ] Pré-visualizar restauração com `RESTAURAR`, justificativa e backup automático anterior.
- [ ] Confirmar que a pré-visualização não altera dados atuais.
- [ ] Apagar com `APAGAR` e conferir histórico em status `Excluído`.
- [ ] Conferir eventos de criação, download, restauração simulada, exclusão e bloqueio.
