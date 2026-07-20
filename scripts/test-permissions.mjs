import assert from "node:assert/strict";
import { moduloDaRota, podeAcessarModulo, podeExecutar, permissoesPadrao } from "../src/lib/auth.ts";

const cenarios = [
  ["Administrador", "/tesouraria", "excluir", true],
  ["Administrador", "/usuarios", "desbloquear", true],
  ["Administrador", "/backup", "excluir", true],
  ["Venerável Mestre", "/backup", "criar", true],
  ["Venerável Mestre", "/backup", "excluir", true],
  ["Obreiro", "/backup", "visualizar", false],
  ["Tesoureiro", "/backup", "visualizar", false],
  ["Venerável Mestre", "/prestacao-contas", "aprovar", true],
  ["Venerável Mestre", "/tesouraria", "excluir", false],
  ["Tesoureiro", "/tesouraria", "editar", true],
  ["Tesoureiro", "/documentos", "criar", true],
  ["Tesoureiro", "/secretaria", "editar", false],
  ["Tesoureiro", "/secretaria", "visualizar", true],
  ["Secretário", "/secretaria", "editar", true],
  ["Secretário", "/agenda", "criar", true],
  ["Secretário", "/tesouraria", "editar", false],
  ["Chanceler", "/chancelaria", "editar", true],
  ["Chanceler", "/tesouraria", "editar", false],
  ["Chanceler", "/secretaria", "visualizar", true],
  ["Chanceler", "/relatorios", "gerar_pdf", true],
  ["Tesoureiro", "/relatorios", "gerar_pdf", true],
  ["Obreiro", "/relatorios", "visualizar", false],
  ["Orador", "/documentos", "visualizar", true],
  ["Orador", "/documentos", "editar", false],
  ["Consulta", "/prestacao-contas", "visualizar", true],
  ["Consulta", "/prestacao-contas", "aprovar", false],
  ["Obreiro", "/portal-obreiro", "visualizar", true],
  ["Obreiro", "/portal-obreiro", "criar", true],
  ["Obreiro", "/dashboard", "visualizar", false],
];

for (const [perfil, modulo, acao, esperado] of cenarios) {
  assert.equal(podeExecutar(perfil, modulo, acao), esperado, `${perfil} / ${modulo} / ${acao}`);
}

assert.equal(podeAcessarModulo(permissoesPadrao("Tesoureiro"), "/tesouraria/livro-caixa"), true);
assert.equal(podeAcessarModulo(permissoesPadrao("Tesoureiro"), "/secretaria"), true);
assert.equal(podeAcessarModulo(permissoesPadrao("Consulta"), "/usuarios"), false);
assert.equal(podeAcessarModulo(permissoesPadrao("Venerável Mestre"), "/backup"), true);
assert.deepEqual(permissoesPadrao("Obreiro"), ["/portal-obreiro"]);
assert.equal(podeAcessarModulo(permissoesPadrao("Obreiro"), "/dashboard"), false);
assert.equal(moduloDaRota("/tesouraria/fechamento-mensal"), "/tesouraria");
assert.equal(moduloDaRota("/usuarios/desbloqueios"), "/usuarios");

console.log(`${cenarios.length + 5} cenários de permissão aprovados.`);
