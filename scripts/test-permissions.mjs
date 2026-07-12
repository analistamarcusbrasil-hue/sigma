import assert from "node:assert/strict";
import { moduloDaRota, podeAcessarModulo, podeExecutar, permissoesPadrao } from "../src/lib/auth.ts";

const cenarios = [
  ["Administrador", "/tesouraria", "excluir", true],
  ["Administrador", "/usuarios", "desbloquear", true],
  ["Venerável Mestre", "/prestacao-contas", "aprovar", true],
  ["Venerável Mestre", "/tesouraria", "excluir", false],
  ["Tesoureiro", "/tesouraria", "editar", true],
  ["Tesoureiro", "/documentos", "criar", true],
  ["Tesoureiro", "/secretaria", "editar", false],
  ["Secretário", "/secretaria", "editar", true],
  ["Secretário", "/agenda", "criar", true],
  ["Secretário", "/tesouraria", "editar", false],
  ["Chanceler", "/chancelaria", "editar", true],
  ["Chanceler", "/tesouraria", "editar", false],
  ["Orador", "/documentos", "visualizar", true],
  ["Orador", "/documentos", "editar", false],
  ["Consulta", "/prestacao-contas", "visualizar", true],
  ["Consulta", "/prestacao-contas", "aprovar", false],
  ["Obreiro", "/dashboard", "visualizar", true],
  ["Obreiro", "/dashboard", "editar", false],
];

for (const [perfil, modulo, acao, esperado] of cenarios) {
  assert.equal(podeExecutar(perfil, modulo, acao), esperado, `${perfil} / ${modulo} / ${acao}`);
}

assert.equal(podeAcessarModulo(permissoesPadrao("Tesoureiro"), "/tesouraria/livro-caixa"), true);
assert.equal(podeAcessarModulo(permissoesPadrao("Tesoureiro"), "/secretaria"), false);
assert.equal(podeAcessarModulo(permissoesPadrao("Consulta"), "/usuarios"), false);
assert.equal(moduloDaRota("/tesouraria/fechamento-mensal"), "/tesouraria");
assert.equal(moduloDaRota("/usuarios/desbloqueios"), "/usuarios");

console.log(`${cenarios.length + 5} cenários de permissão aprovados.`);
