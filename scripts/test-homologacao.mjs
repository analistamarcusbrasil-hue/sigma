import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const rotas = ["/", "/login", "/dashboard", "/agenda", "/obreiros", "/configuracoes", "/tesouraria", "/tesouraria/livro-caixa", "/tesouraria/fechamento-mensal", "/prestacao-contas", "/prestacao-contas/final", "/repasse-gestao", "/configuracoes/repasse", "/patrimonio", "/documentos", "/chancelaria", "/secretaria", "/auditoria", "/usuarios", "/usuarios/desbloqueios", "/backup"];
for (const rota of rotas) {
  const arquivo = rota === "/" ? "src/app/page.tsx" : `src/app${rota}/page.tsx`;
  assert.ok(existsSync(join(raiz, arquivo)), `Rota sem page.tsx: ${rota}`);
}
const migrations = readdirSync(join(raiz, "supabase/migrations")).filter((nome) => nome.endsWith(".sql")).sort();
assert.equal(migrations.length, 17, "A cadeia homologada deve conter 17 migrations");
assert.deepEqual(migrations.map((nome) => nome.slice(0, 8)), Array.from({ length: 17 }, (_, indice) => String(20260710 + indice)), "Migrations fora de ordem");
const operacional = readFileSync(join(raiz, "src/lib/supabase/operacional.ts"), "utf8");
assert.match(operacional, /\["Rascunho",\s*"Cancelado"\]\.includes/, "Rascunho e cancelado devem ficar fora dos totais");
for (const componente of ["FechamentoMensalClient.tsx", "PrestacaoFinalClient.tsx", "RepasseGestaoClient.tsx"]) {
  const conteudo = readFileSync(join(raiz, "src/components", componente), "utf8");
  assert.match(conteudo, /Sistema desenvolvido por Marcus Brasil/, `${componente} sem identificação no PDF`);
  assert.match(conteudo, /analista\.marcusbrasil@gmail\.com/, `${componente} sem contato no PDF`);
}
const rls = readFileSync(join(raiz, "supabase/migrations/20260726_homologation_rls_alignment.sql"), "utf8");
for (const regra of ["documentos: cria por acao", "documentos: edita por acao", "patrimonio: cria por acao", "patrimonio: edita por acao"]) assert.ok(rls.includes(regra), `Policy ausente: ${regra}`);
console.log(`${rotas.length} rotas, ${migrations.length} migrations e 3 exportações homologadas.`);
