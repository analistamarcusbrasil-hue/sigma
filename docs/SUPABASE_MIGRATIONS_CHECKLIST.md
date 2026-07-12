# Checklist de migrations do Supabase

Homologado em 12/07/2026 no projeto `rvkkwspikkgjgruosdwh`.

## Ordem e finalidade

| Migration | Finalidade principal | Objetos relevantes |
|---|---|---|
| 20260710 | Perfis de autenticação | `profiles` |
| 20260711 | Núcleo operacional | lojas, usuários, obreiros, sessões e finanças |
| 20260712 | Operação completa | secretaria, chancelaria e regras auxiliares |
| 20260713 | Ativação transacional de gestão | `ativar_administracao` |
| 20260714 | Documentos transacionais | RPCs de documentos e decisões |
| 20260715 | Auditoria operacional | `auditoria_eventos`, função e triggers |
| 20260716 | Agenda | `agenda_eventos`, RLS e auditoria |
| 20260717 | Tesouraria profissional | contas, categorias e centros de custo |
| 20260718 | Gestão como eixo central | vínculos `administracao_id` e gestão atual |
| 20260719 | Livro Caixa | status, comprovantes, índices e trigger |
| 20260720 | Fechamento mensal | `fechamentos_mensais` e proteção de período |
| 20260721 | Prestação final | `prestacoes_finais` e proteção de aprovação |
| 20260722 | Repasse | `repasses_gestao` e encerramento da gestão |
| 20260723 | Patrimônio e documentos | tabelas, vínculos, RLS e auditoria |
| 20260724 | Segurança de acesso | perfis, ações e eventos de segurança |
| 20260725 | Permissões por ação | RLS financeira e desbloqueios justificados |
| 20260726 | Alinhamento da homologação | RLS por ação em documentos e patrimônio |

As migrations 10–25 já constavam no histórico remoto durante a homologação. A migration 26 é aditiva, não remove dados e deve ser aplicada depois do merge.

## Aplicação segura

```powershell
npx.cmd --yes supabase@latest login
npx.cmd --yes supabase@latest link --project-ref rvkkwspikkgjgruosdwh
npx.cmd --yes supabase@latest migration list
npx.cmd --yes supabase@latest db push --dry-run
npx.cmd --yes supabase@latest db push
npx.cmd --yes supabase@latest db lint --linked --level warning
```

Antes do `db push`, confirme backup recente, projeto correto e ausência de migration remota sem correspondente local. Nunca altere migrations já aplicadas; correções posteriores devem ser aditivas.

