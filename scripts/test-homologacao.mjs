import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const rotas = ["/", "/login", "/dashboard", "/agenda", "/obreiros", "/configuracoes", "/tesouraria", "/tesouraria/livro-caixa", "/tesouraria/fechamento-mensal", "/prestacao-contas", "/prestacao-contas/final", "/repasse-gestao", "/configuracoes/repasse", "/patrimonio", "/documentos", "/chancelaria", "/secretaria", "/auditoria", "/usuarios", "/usuarios/desbloqueios", "/backup", "/portal-obreiro", "/alterar-senha", "/comunicados", "/solicitacoes", "/loja", "/onboarding", "/admin-sigma"];
for (const rota of rotas) {
  const arquivo = rota === "/" ? "src/app/page.tsx" : `src/app${rota}/page.tsx`;
  assert.ok(existsSync(join(raiz, arquivo)), `Rota sem page.tsx: ${rota}`);
}
const migrations = readdirSync(join(raiz, "supabase/migrations")).filter((nome) => nome.endsWith(".sql")).sort();
assert.equal(migrations.length, 20, "A cadeia homologada deve conter 20 migrations");
assert.deepEqual(migrations.map((nome) => nome.slice(0, 8)), Array.from({ length: 20 }, (_, indice) => String(20260710 + indice)), "Migrations fora de ordem");
const operacional = readFileSync(join(raiz, "src/lib/supabase/operacional.ts"), "utf8");
assert.match(operacional, /\["Rascunho",\s*"Cancelado"\]\.includes/, "Rascunho e cancelado devem ficar fora dos totais");
for (const componente of ["FechamentoMensalClient.tsx", "PrestacaoFinalClient.tsx", "RepasseGestaoClient.tsx"]) {
  const conteudo = readFileSync(join(raiz, "src/components", componente), "utf8");
  assert.match(conteudo, /Sistema desenvolvido por Marcus Brasil/, `${componente} sem identificação no PDF`);
  assert.match(conteudo, /analista\.marcusbrasil@gmail\.com/, `${componente} sem contato no PDF`);
}
const rls = readFileSync(join(raiz, "supabase/migrations/20260726_homologation_rls_alignment.sql"), "utf8");
for (const regra of ["documentos: cria por acao", "documentos: edita por acao", "patrimonio: cria por acao", "patrimonio: edita por acao"]) assert.ok(rls.includes(regra), `Policy ausente: ${regra}`);
const portalRls=readFileSync(join(raiz,"supabase/migrations/20260727_worker_portal_communication.sql"),"utf8");
for(const regra of ["obreiro_id=public.obreiro_atual()","mensalidades: acesso por perfil","presencas: acesso por perfil","documentos: acesso por visibilidade","solicitacoes: proprio obreiro cria"])assert.ok(portalRls.includes(regra),`Proteção do Portal ausente: ${regra}`);
const multi=readFileSync(join(raiz,"supabase/migrations/20260728_multistore_saas_onboarding.sql"),"utf8");for(const regra of ["usuario_tem_acesso_loja","usuario_perfil_na_loja","usuario_obreiro_na_loja","loja_usuarios_contexto_idx"])assert.ok(multi.includes(regra),`Isolamento multi-Loja ausente: ${regra}`);
const credenciais=readFileSync(join(raiz,"supabase/migrations/20260729_temporary_password_portal_access.sql"),"utf8");
for(const regra of ["acesso_portal_obreiro","deve_trocar_senha","senha_temporaria_definida_em","usuario_tem_acesso_portal","loja_usuarios_acesso_portal_valido"])assert.ok(credenciais.includes(regra),`Controle de credenciais ausente: ${regra}`);
const proxy=readFileSync(join(raiz,"src/proxy.ts"),"utf8");for(const regra of ["deve_trocar_senha","/alterar-senha","acesso_portal_obreiro"])assert.ok(proxy.includes(regra),`Bloqueio de primeiro acesso ausente: ${regra}`);
const usuariosActions=readFileSync(join(raiz,"src/app/usuarios/actions.ts"),"utf8");for(const regra of ["loja_usuarios","obreiro_id: input.obreiroId","Não é permitido alterar o próprio vínculo","criarUsuarioComSenhaTemporaria","definirSenhaTemporaria","updateUserById","senha.length < 6"])assert.ok(usuariosActions.includes(regra),`Vínculo Usuário–Obreiro ausente: ${regra}`);
const usuariosClient=readFileSync(join(raiz,"src/components/UsuariosClient.tsx"),"utf8");
for(const regra of ['modo: "senha"','obrigarTroca: false','Pode ser qualquer senha com pelo menos 6 caracteres','Exigir troca no próximo login (opcional)'])assert.ok(usuariosClient.includes(regra),`Interface de senha administrativa ausente: ${regra}`);
const portalAction=readFileSync(join(raiz,"src/app/portal-obreiro/actions.ts"),"utf8");
for(const regra of ["enviarSolicitacaoPortal","acesso_portal_obreiro","obreiro_id","solicitacoes_obreiro","criar_solicitacao"])assert.ok(portalAction.includes(regra),`Ação segura do Portal ausente: ${regra}`);
const portalClient=readFileSync(join(raiz,"src/components/PortalObreiroClient.tsx"),"utf8");
for(const regra of ["onSubmit={e=>void enviar(e)}","type=\"submit\"","minLength={10}","Enviando com segurança","Nenhuma solicitação enviada",'data-permission-action="criar"'])assert.ok(portalClient.includes(regra),`Formulário do Portal ausente: ${regra}`);
const accessBoundary=readFileSync(join(raiz,"src/components/AccessBoundary.tsx"),"utf8");
assert.ok(accessBoundary.includes('!podeExecutar(perfil,modulo,"criar")'),"Perfil com ação criar não pode ser tratado como somente consulta");
console.log(`${rotas.length} rotas, ${migrations.length} migrations e 3 exportações homologadas.`);
