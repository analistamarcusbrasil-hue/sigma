import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const ler = (arquivo) => readFileSync(join(raiz, arquivo), "utf8");

const migration = ler("supabase/migrations/20260805_email_notifications_resend.sql");
for (const regra of [
  "Aguardando configuração",
  "Pendente",
  "Enviado",
  "Falhou",
  "Ignorado",
  "enfileirar_email_comunicado",
  "enfileirar_email_tramitacao",
  "notificacoes_email_eventos",
  "pode_gerenciar_notificacoes",
  "p.status='ativo'",
  "lu.status='ativo'",
  "create unique index notificacoes_email_dedupe_uidx",
  "on conflict do nothing",
]) assert.ok(migration.includes(regra), `Regra de notificação ausente: ${regra}`);

const service = ler("src/lib/notificacoes-email.ts");
for (const regra of [
  'import "server-only"',
  "process.env.RESEND_API_KEY",
  "process.env.EMAIL_FROM",
  "https://api.resend.com/emails",
  "SIGMA LUMP",
  "Acessar o SIGMA",
  "Sistema desenvolvido por Marcus Brasil",
  "analista.marcusbrasil@gmail.com",
  "destinatarioValido",
]) assert.ok(service.includes(regra), `Serviço Resend incompleto: ${regra}`);
assert.ok(!service.includes("onboarding@resend.dev"), "Não deve existir remetente padrão inseguro.");
assert.ok(!service.includes("item.mensagem}"), "O corpo da fila não deve ser interpolado no e-mail.");

const client = ler("src/components/NotificacoesEmailClient.tsx");
assert.ok(!client.includes("process.env."), "Variáveis privadas não podem aparecer no componente client.");
for (const status of ["Aguardando configuração", "Pendente", "Enviado", "Falhou", "Ignorado"]) {
  assert.ok(client.includes(status), `Status não exibido no painel: ${status}`);
}
for (const acao of ["Testar no meu e-mail", "Reenviar", "Processar pendentes"]) {
  assert.ok(client.includes(acao), `Ação ausente no painel: ${acao}`);
}

const comunicados = ler("src/app/comunicados/actions.ts");
assert.match(
  comunicados,
  /item\.status === "Publicado" \? await processarNotificacoesPendentes\(\)/,
  "Comunicado em rascunho não pode disparar processamento de e-mail.",
);

const usuarios = ler("src/app/usuarios/actions.ts");
assert.ok(usuarios.includes('"Senha definida pelo Administrador"'), "Definição de senha deve gerar aviso.");
assert.ok(usuarios.includes('"Acesso ao Portal liberado"'), "Liberação do Portal deve gerar aviso.");
assert.ok(!/enfileirarAvisoUsuario\([\s\S]{0,400}senhaTemporaria/.test(usuarios), "Senha não pode ser enviada à fila.");

const actions = ler("src/app/notificacoes/actions.ts");
for (const regra of ["contextoAdministrador", "reenviarNotificacaoAction", "testarEnvioAdministradorAction"]) {
  assert.ok(actions.includes(regra), `Ação administrativa ausente: ${regra}`);
}

assert.ok(existsSync(join(raiz, "src/app/notificacoes/page.tsx")), "Rota /notificacoes ausente.");
assert.ok(existsSync(join(raiz, "docs/NOTIFICACOES_EMAIL.md")), "Documentação de e-mail ausente.");

console.log("Notificações Resend: segurança, fila, painel, reenvio e eventos homologados.");
