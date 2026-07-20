import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ler = (arquivo) => readFileSync(join(process.cwd(), arquivo), "utf8");
const portal = ler("src/components/PortalSolicitacoesClient.tsx");
const portalInicio = ler("src/components/PortalObreiroClient.tsx");
const usuarios = ler("src/components/UsuariosClient.tsx");
const chancelaria = ler("src/components/ChancelariaClient.tsx");
const tesouraria = ler("src/components/TesourariaClient.tsx");
const agenda = ler("src/components/AgendaClient.tsx");
const comunicados = ler("src/components/ComunicadosClient.tsx");
const shell = ler("src/components/AppShell.tsx");

for (const regra of ["Ver detalhes", "Baixar documento aprovado", "Nova resposta", "sigma-solicitacoes-vistas", "Recolher formulário"])
  assert.ok(portal.includes(regra), `Portal mobile sem: ${regra}`);
assert.ok(!portal.includes('open={!encerrada(item.status)}'), "A tramitação deve iniciar recolhida.");
assert.ok(portalInicio.includes("grid-cols-2") && portalInicio.includes("TituloPainel"), "Resumo do Portal não está compacto.");

for (const regra of ["Liberar Portal", "Definir senha", "Suspender usuário", "Editar perfil", "Último acesso", "Obreiro vinculado", "Senha definida"])
  assert.ok(usuarios.includes(regra), `Ação/status de usuário ausente: ${regra}`);
for (const regra of ["Presente", "Falta", "Justificado", "md:hidden", "Cadastrar visitante", "Relatório"])
  assert.ok(chancelaria.includes(regra), `Chancelaria mobile sem: ${regra}`);
for (const regra of ["Valor total da obrigação", "Quantidade de parcelas", "Primeiro vencimento", "Resumo antes de salvar"])
  assert.ok(tesouraria.includes(regra), `Tesouraria sem orientação: ${regra}`);
assert.ok(agenda.includes("matchMedia") && agenda.includes('setModo("Lista")'), "Agenda não prioriza lista no celular.");
assert.ok(comunicados.includes("line-clamp-3") && comunicados.includes("Novo comunicado"), "Comunicados não estão compactos.");

assert.ok(shell.includes('if (usuario.perfil === "Obreiro") return portalDisponivel ? modulos.filter((modulo) => modulo.href === "/portal-obreiro") : []'), "Obreiro pode receber menu administrativo.");
assert.ok(shell.includes('usuario.perfil === "Obreiro" ? false'), "Bloqueio administrativo do Obreiro foi removido.");
console.log("UX mobile: Portal, usuários, tesouraria, chancelaria, agenda, solicitações, comunicados e isolamento do Obreiro validados.");
