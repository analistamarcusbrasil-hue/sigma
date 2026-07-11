# SIGMA LUMP

Sistema integrado de gestão maçônica para Secretaria, Chancelaria, Tesouraria e cadastro de obreiros.

## Execução local

```powershell
cd C:\Users\USER\Downloads\sigma-nuvem
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Configuração do Supabase

1. Crie um projeto no Supabase e, no **SQL Editor**, execute as migrações em ordem:

   - `supabase/migrations/20260710_create_profiles.sql`
   - `supabase/migrations/20260711_create_operational_core.sql`
   - `supabase/migrations/20260712_complete_operational_schema.sql`

   A segunda migração cria o núcleo multi-loja e as tabelas operacionais, com índices, timestamps, chaves estrangeiras e RLS. Se já existir um Administrador ativo, ela também cria a loja inicial `Loja SIGMA` e vincula esse administrador.
2. Crie o arquivo `.env.local` (não envie ao Git) com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
SUPABASE_SECRET_KEY=sua_chave_secreta
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Em **Authentication > URL Configuration**, inclua `http://localhost:3000/auth/confirm` como URL de redirecionamento. Inclua também a URL da Vercel quando publicar.
4. Crie o primeiro usuário no painel **Authentication > Users**. Depois, no SQL Editor, associe-o como administrador (troque o e-mail):

```sql
insert into public.profiles (id, nome, email, perfil, status, permissoes, ativado_em)
select id, 'Administrador SIGMA', email, 'Administrador', 'ativo',
  '["/dashboard", "/obreiros", "/secretaria", "/chancelaria", "/tesouraria", "/prestacao-contas", "/configuracoes", "/backup", "/usuarios"]'::jsonb,
  timezone('utc', now())
from auth.users where email = 'seu-email@exemplo.com';
```

Após entrar como administrador, use **Usuários e Acessos** para enviar convites e gerenciar permissões. Senhas não são armazenadas pelo SIGMA: recuperação, convite e autenticação são tratados pelo Supabase Auth.

## Persistência operacional

Obreiros, visitantes, sessões e presenças já leem e gravam no Supabase. As tabelas dos demais módulos também são criadas pela migração operacional, mas suas telas continuam temporariamente no armazenamento local até a migração incremental de cada fluxo. Consulte `docs/AUDITORIA_PERSISTENCIA.md` para o inventário completo.

## Validação

```powershell
npm run lint
npm run build
```

Para produção, publique em uma plataforma com runtime completo, como a Vercel. O projeto não usa exportação estática nem GitHub Pages, pois autenticação por cookies exige runtime de servidor.
