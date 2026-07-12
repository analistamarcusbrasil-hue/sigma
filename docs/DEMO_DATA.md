# Dados de demonstração

Os dados ficam em `src/lib/demo-data.ts`, não contêm informações pessoais reais e não são gravados automaticamente no Supabase.

Por padrão, `obterDadosDemo()` recusa o acesso. Para testes locais ou em um ambiente isolado de homologação, defina:

```env
NEXT_PUBLIC_ENABLE_DEMO_DATA=true
```

Nunca habilite essa variável na produção. O conjunto cobre Loja Demo, seis obreiros, Gestão Demo 2026, mensalidades, Tronco, entradas, despesas com e sem comprovante, rascunho, cancelado, fechamentos, prestação, repasse, patrimônio e documentos.

O arquivo serve como fixture para testes e referência para uma futura seed transacional. Não cria usuários no Supabase Auth e não deve ser convertido em seed de produção.

