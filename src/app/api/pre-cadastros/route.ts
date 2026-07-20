import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarEntradaPreCadastro, type EntradaPreCadastro } from "@/lib/pre-cadastro-validacao";
import { enfileirarAvisoUsuario, processarNotificacoesPendentes } from "@/lib/notificacoes-email";

export const dynamic = "force-dynamic";

const respostaGenerica = "Não foi possível concluir agora. Revise os dados e tente novamente mais tarde.";
const ipDaRequisicao = (request: NextRequest) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "indisponivel";
const hash = (valor: string) => createHash("sha256").update(`sigma-pre-cadastro:${valor}`).digest("hex");

async function registrarEvento(lojaId: string | null, preCadastroId: string | null, acao: string, resultado: "permitido" | "bloqueado" | "erro", detalhes: Record<string, unknown>) {
  try { await createAdminClient().from("pre_cadastros_eventos").insert({ loja_id: lojaId, pre_cadastro_id: preCadastroId, acao, resultado, detalhes }); } catch { /* auditoria não expõe falhas ao público */ }
}

export async function POST(request: NextRequest) {
  let entrada: EntradaPreCadastro;
  try { entrada = await request.json() as EntradaPreCadastro; }
  catch { return NextResponse.json({ ok: false, erro: respostaGenerica }, { status: 400 }); }

  if (typeof entrada.website === "string" && entrada.website.trim()) {
    return NextResponse.json({ ok: true, protocolo: "Recebido", nome: entrada.nomeCompleto?.slice(0, 160) || "Solicitante", loja: "Loja selecionada", criadoEm: new Date().toISOString() });
  }

  const validacao = validarEntradaPreCadastro(entrada);
  if (!validacao.ok) {
    await registrarEvento(entrada.lojaId || null, null, "erro no envio ou validação", "bloqueado", { motivo: validacao.erro.slice(0, 180) });
    return NextResponse.json({ ok: false, erro: validacao.erro }, { status: 400 });
  }

  const admin = createAdminClient();
  const dados = validacao.dados;
  const { data: loja } = await admin.from("lojas").select("id,nome,numero").eq("id", dados.lojaId).eq("ativa", true).maybeSingle();
  if (!loja) return NextResponse.json({ ok: false, erro: "A Loja selecionada não está disponível." }, { status: 400 });

  const ipHash = hash(ipDaRequisicao(request));
  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ count: enviosEmail }, { count: enviosIp }] = await Promise.all([
    admin.from("pre_cadastros_obreiro").select("id", { count: "exact", head: true }).gte("criado_em", desde).eq("email", dados.email),
    admin.from("pre_cadastros_obreiro").select("id", { count: "exact", head: true }).gte("criado_em", desde).eq("ip_origem", ipHash),
  ]);
  if ((enviosEmail ?? 0) >= 3 || (enviosIp ?? 0) >= 3) {
    await registrarEvento(dados.lojaId, null, "limite de envio", "bloqueado", { canal: "ip_ou_email" });
    return NextResponse.json({ ok: false, erro: "Aguarde antes de enviar uma nova solicitação." }, { status: 429 });
  }

  const agora = new Date();
  const protocolo = `PC-${agora.toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const { data: criado, error } = await admin.from("pre_cadastros_obreiro").insert({
    protocolo, loja_id: dados.lojaId, nome_completo: dados.nomeCompleto, nome_preferido: dados.nomePreferido || null,
    email: dados.email, telefone: dados.telefone, cpf: dados.cpf || null, data_nascimento: dados.dataNascimento || null,
    cim: dados.cim, grau: dados.grau, situacao_informada: dados.situacao, loja_origem: dados.lojaOrigem || null,
    oriente: dados.oriente || null, potencia: dados.potencia || null, cargo_funcao: dados.cargoFuncao || null,
    observacoes: dados.observacoes || null, consentimento: true, ip_origem: ipHash,
    user_agent: request.headers.get("user-agent")?.slice(0, 500) || null, token_acompanhamento: hash(randomBytes(32).toString("hex")),
  }).select("id,protocolo,criado_em").single();
  if (error || !criado) {
    await registrarEvento(dados.lojaId, null, "pré-cadastro enviado", "erro", { motivo: "persistencia" });
    return NextResponse.json({ ok: false, erro: respostaGenerica }, { status: 500 });
  }
  await registrarEvento(dados.lojaId, criado.id, "pré-cadastro enviado", "permitido", { protocolo });

  try {
    const { data: destinatarios } = await admin.from("loja_usuarios").select("usuario_id,perfil,status")
      .eq("loja_id", dados.lojaId).eq("status", "ativo").in("perfil", ["Administrador", "Venerável Mestre", "Secretário"]);
    const filas: string[] = [];
    for (const destinatario of destinatarios ?? []) {
      const fila = await enfileirarAvisoUsuario({ lojaId: dados.lojaId, usuarioId: destinatario.usuario_id,
        evento: "Pré-cadastro recebido", rotaDestino: "/pre-cadastros", dedupeKey: `pre-cadastro:${criado.id}:${destinatario.usuario_id}` });
      if (fila.enfileirada && fila.id) filas.push(fila.id);
    }
    if (filas.length) await processarNotificacoesPendentes({ ids: filas, limite: filas.length });
  } catch { /* e-mail nunca impede o pré-cadastro */ }

  return NextResponse.json({ ok: true, protocolo: criado.protocolo, nome: dados.nomeCompleto, loja: loja.numero ? `${loja.nome} nº ${loja.numero}` : loja.nome, criadoEm: criado.criado_em }, { status: 201 });
}
