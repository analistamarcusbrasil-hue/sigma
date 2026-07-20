import { createClient } from "@/lib/supabase/server";
import { dataBR, gerarPdfInstitucional, moedaBR, periodoBR, type RelatorioInstitucional } from "@/lib/relatorios/pdf-institucional";

export const dynamic = "force-dynamic";
const tipos = ["frequencia-sessao","frequencia-mensal","livro-caixa","fechamento-mensal","prestacao-contas","repasse-gestao","tronco-solidariedade","custos-fixos","solicitacoes"] as const;
type Tipo = typeof tipos[number];
type ValorLinha = string | number | boolean | null | undefined | Record<string,string> | Record<string,string>[];
type Linha = Record<string, ValorLinha>;
function relacao(valor: ValorLinha): Record<string,string> { return Array.isArray(valor) ? (valor[0] || {}) : (valor && typeof valor === "object" ? valor : {}); }
const financeiro = new Set<Tipo>(["livro-caixa","fechamento-mensal","prestacao-contas","repasse-gestao","tronco-solidariedade","custos-fixos"]);

function nomeArquivo(tipo: Tipo, inicio: string, fim: string) { return `${tipo}-${inicio || "inicio"}-${fim || "atual"}.pdf`; }
function intervalo(url: URL) {
  const hoje = new Date().toISOString().slice(0, 10); const mes = hoje.slice(0, 7);
  const inicio = url.searchParams.get("inicio") || `${mes}-01`;
  const fim = url.searchParams.get("fim") || hoje;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || inicio > fim) throw new Error("Período inválido.");
  return { inicio, fim };
}
function perfilPermitido(tipo: Tipo, perfil: string) {
  if (["Administrador","Venerável Mestre"].includes(perfil)) return true;
  if (financeiro.has(tipo)) return perfil === "Tesoureiro";
  if (["frequencia-sessao","frequencia-mensal"].includes(tipo)) return ["Chanceler","Secretário"].includes(perfil);
  return ["Secretário","Tesoureiro","Chanceler"].includes(perfil);
}
function oficiais(gestao: Linha | null) {
  const cargos = (gestao?.cargos || {}) as Record<string,string>;
  return { veneravel: cargos.veneravelMestre || cargos.veneravel || "", secretario: cargos.secretario || "", tesoureiro: cargos.tesoureiro || "", chanceler: cargos.chanceler || "" };
}

export async function GET(request: Request, contexto: RouteContext<"/api/relatorios/[tipo]">) {
  try {
    const { tipo: tipoParam } = await contexto.params;
    if (!tipos.includes(tipoParam as Tipo)) return Response.json({ erro: "Tipo de relatório inválido." }, { status: 404 });
    const tipo = tipoParam as Tipo; const url = new URL(request.url); const lojaId = url.searchParams.get("lojaId") || "";
    if (!/^[0-9a-f-]{36}$/i.test(lojaId)) return Response.json({ erro: "Informe a Loja ativa." }, { status: 400 });
    const { inicio, fim } = intervalo(url); const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ erro: "Não autenticado." }, { status: 401 });
    const [{ data: vinculo }, { data: loja }, { data: gestao }, { data: perfil }] = await Promise.all([
      supabase.from("loja_usuarios").select("perfil,status").eq("loja_id",lojaId).eq("usuario_id",user.id).eq("status","ativo").maybeSingle(),
      supabase.from("lojas").select("id,nome,numero,potencia,oriente,uf").eq("id",lojaId).maybeSingle(),
      supabase.from("administracoes").select("id,nome,data_inicio,data_fim,cargos,diretoria").eq("loja_id",lojaId).eq("ativa",true).maybeSingle(),
      supabase.from("profiles").select("nome,perfil").eq("id",user.id).maybeSingle(),
    ]);
    if (!vinculo || !loja) return Response.json({ erro: "Loja não encontrada ou sem permissão." }, { status: 403 });
    const papel = vinculo.perfil || perfil?.perfil || "";
    if (!perfilPermitido(tipo, papel)) return Response.json({ erro: "Seu perfil não pode gerar este relatório." }, { status: 403 });
    const responsavel = perfil?.nome || user.email || "Usuário autenticado"; const assinatura = oficiais(gestao);
    const base = { loja, gestao: gestao?.nome || null, periodo: periodoBR(inicio,fim), responsavel };
    let relatorio: RelatorioInstitucional;

    if (tipo === "frequencia-sessao") {
      let consulta = supabase.from("sessoes").select("id,data,tipo,grau,titulo").eq("loja_id",lojaId);
      const sessaoId = url.searchParams.get("sessaoId");
      consulta = sessaoId ? consulta.eq("id",sessaoId) : consulta.gte("data",inicio).lte("data",fim).order("data",{ascending:false}).limit(1);
      const { data: sessao } = await consulta.maybeSingle();
      if (!sessao) return Response.json({ erro: "Nenhuma sessão encontrada no período." }, { status: 404 });
      const { data: presencas, error } = await supabase.from("presencas").select("status,observacao,cargo_sessao,obreiros(nome,grau,cargo)").eq("sessao_id",sessao.id);
      if (error) throw error; const linhas = (presencas || []) as Linha[];
      const presentes = linhas.filter(i=>i.status==="Presente").length; const faltas=linhas.filter(i=>i.status==="Falta").length; const justificadas=linhas.filter(i=>i.status==="Justificado").length;
      relatorio={...base,titulo:"Relatório de Frequência da Sessão",periodo:dataBR(sessao.data),resumo:[{rotulo:"Presentes",valor:String(presentes)},{rotulo:"Faltas",valor:String(faltas)},{rotulo:"Justificadas",valor:String(justificadas)}],tabelas:[{titulo:`${sessao.titulo} • ${sessao.tipo} • ${sessao.grau}`,colunas:["Obreiro","Grau / cargo","Situação","Observação"],larguras:[3,2,1.3,3],linhas:linhas.map(i=>{const obreiro=relacao(i.obreiros);return[obreiro.nome,obreiro.grau+(i.cargo_sessao?` • ${i.cargo_sessao}`:""),i.status,i.observacao];})}],assinaturas:[{nome:assinatura.chanceler,cargo:"Chanceler"},{nome:assinatura.veneravel,cargo:"Venerável Mestre"}]};
    } else if (tipo === "frequencia-mensal") {
      const { data: sessoes, error }=await supabase.from("sessoes").select("id,data").eq("loja_id",lojaId).gte("data",inicio).lte("data",fim).neq("status","cancelada"); if(error)throw error;
      const ids=(sessoes||[]).map(i=>i.id); let registros:Linha[]=[];
      if(ids.length){const resposta=await supabase.from("presencas").select("status,obreiro_id,obreiros(nome,grau,cargo)").in("sessao_id",ids);if(resposta.error)throw resposta.error;registros=(resposta.data||[]) as Linha[];}
      const mapa=new Map<string,{nome:string;grau:string;presentes:number;faltas:number;justificadas:number}>();
      registros.forEach(i=>{const obreiro=relacao(i.obreiros);const chave=String(i.obreiro_id);const atual=mapa.get(chave)||{nome:obreiro.nome||"—",grau:obreiro.grau||"—",presentes:0,faltas:0,justificadas:0};if(i.status==="Presente")atual.presentes++;if(i.status==="Falta")atual.faltas++;if(i.status==="Justificado")atual.justificadas++;mapa.set(chave,atual);});
      const linhas=[...mapa.values()].sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
      relatorio={...base,titulo:"Relatório Mensal de Frequência",resumo:[{rotulo:"Sessões",valor:String(ids.length)},{rotulo:"Obreiros relacionados",valor:String(linhas.length)},{rotulo:"Registros",valor:String(registros.length)}],tabelas:[{colunas:["Obreiro","Grau","Presentes","Faltas","Justificadas","Frequência"],larguras:[3,2,1,1,1.2,1.2],linhas:linhas.map(i=>{const computadas=i.presentes+i.faltas;return[i.nome,i.grau,i.presentes,i.faltas,i.justificadas,`${computadas?Math.round(i.presentes/computadas*100):0}%`];})}],assinaturas:[{nome:assinatura.chanceler,cargo:"Chanceler"},{nome:assinatura.veneravel,cargo:"Venerável Mestre"}]};
    } else if (tipo === "livro-caixa" || tipo === "tronco-solidariedade") {
      const { data, error }=await supabase.from("lancamentos_financeiros").select("data,natureza,origem,tipo,descricao,valor,status_caixa,documento_numero").eq("loja_id",lojaId).gte("data",inicio).lte("data",fim).order("data");if(error)throw error;
      const todos=(data||[]) as Linha[]; const linhas=tipo==="tronco-solidariedade"?todos.filter(i=>i.origem==="Tronco"||i.tipo==="Tronco de Solidariedade"):todos.filter(i=>!["Rascunho","Cancelado"].includes(String(i.status_caixa||"Lançado")));
      const entradas=linhas.filter(i=>(i.natureza||"Entrada")==="Entrada").reduce((s,i)=>s+Number(i.valor),0);const saidas=linhas.filter(i=>i.natureza==="Saída").reduce((s,i)=>s+Number(i.valor),0);
      relatorio={...base,titulo:tipo==="livro-caixa"?"Relatório do Livro Caixa":"Relatório do Tronco de Solidariedade",resumo:[{rotulo:"Entradas",valor:moedaBR(entradas)},{rotulo:"Saídas",valor:moedaBR(saidas)},{rotulo:"Resultado",valor:moedaBR(entradas-saidas)}],tabelas:[{colunas:["Data","Natureza","Origem / descrição","Documento","Valor"],larguras:[1.2,1.2,4,1.4,1.5],linhas:linhas.map(i=>[dataBR(i.data),i.natureza||"Entrada",`${i.origem||i.tipo} • ${i.descricao}`,i.documento_numero,moedaBR(i.valor)])}],assinaturas:[{nome:assinatura.tesoureiro,cargo:"Tesoureiro"},{nome:assinatura.veneravel,cargo:"Venerável Mestre"}]};
    } else if (tipo === "fechamento-mensal") {
      const { data, error }=await supabase.from("fechamentos_mensais").select("*").eq("loja_id",lojaId).gte("competencia",inicio.slice(0,7)+"-01").lte("competencia",fim.slice(0,7)+"-01").order("competencia",{ascending:false});if(error)throw error;const linhas=(data||[]) as Linha[];
      relatorio={...base,titulo:"Relatório de Fechamento Mensal",tabelas:[{colunas:["Competência","Status","Saldo inicial","Entradas","Saídas","Saldo final","Tronco"],larguras:[1.3,1.3,1.5,1.5,1.5,1.5,1.4],linhas:linhas.map(i=>[dataBR(i.competencia),i.status,moedaBR(i.saldo_inicial),moedaBR(i.total_entradas),moedaBR(i.total_saidas),moedaBR(i.saldo_final),moedaBR(i.total_tronco)])}],observacoes:linhas.flatMap(i=>[i.observacoes_tesoureiro,i.observacoes_aprovacao]).filter(Boolean).map(String),assinaturas:[{nome:assinatura.tesoureiro,cargo:"Tesoureiro"},{nome:assinatura.veneravel,cargo:"Venerável Mestre"}],orientacao:"landscape"};
    } else if (tipo === "prestacao-contas") {
      const { data, error }=await supabase.from("prestacoes_finais").select("*").eq("loja_id",lojaId).order("criado_em",{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(!data)return Response.json({erro:"Nenhuma prestação de contas encontrada."},{status:404});
      relatorio={...base,titulo:"Prestação de Contas",resumo:[{rotulo:"Receitas",valor:moedaBR(data.total_receitas)},{rotulo:"Despesas",valor:moedaBR(data.total_despesas)},{rotulo:"Saldo final",valor:moedaBR(data.saldo_final)}],tabelas:[{titulo:"Consolidação financeira",colunas:["Item","Valor"],larguras:[3,2],linhas:[["Saldo inicial",moedaBR(data.saldo_inicial)],["Mensalidades recebidas",moedaBR(data.mensalidades_recebidas)],["Tronco de Solidariedade",moedaBR(data.total_tronco)],["Despesas pendentes",moedaBR(data.despesas_pendentes)],["Créditos a receber",moedaBR(data.creditos_a_receber)],["Obrigações a pagar",moedaBR(data.obrigacoes_a_pagar)],["Saldo líquido de repasse",moedaBR(data.saldo_liquido_repasse)]]}],observacoes:[data.observacoes_tesoureiro,data.observacoes_veneravel,data.observacoes_gerais].filter(Boolean),assinaturas:[{nome:assinatura.tesoureiro,cargo:"Tesoureiro"},{nome:assinatura.veneravel,cargo:"Venerável Mestre"}]};
    } else if (tipo === "repasse-gestao") {
      const { data,error }=await supabase.from("repasses_gestao").select("*").eq("loja_id",lojaId).order("criado_em",{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(!data)return Response.json({erro:"Nenhum repasse encontrado."},{status:404});
      relatorio={...base,titulo:"Termo de Repasse de Gestão",periodo:data.data_repasse?dataBR(data.data_repasse):base.periodo,resumo:[{rotulo:"Caixa",valor:moedaBR(data.caixa)},{rotulo:"Banco",valor:moedaBR(data.banco)},{rotulo:"Saldo líquido",valor:moedaBR(data.saldo_liquido)}],tabelas:[{colunas:["Componente","Valor"],larguras:[3,2],linhas:[["Caixa físico",moedaBR(data.caixa)],["Conta bancária",moedaBR(data.banco)],["Créditos",moedaBR(data.creditos)],["Obrigações",moedaBR(data.obrigacoes)],["Saldo líquido",moedaBR(data.saldo_liquido)]]}],observacoes:[data.pendencias_financeiras,data.pendencias_administrativas,data.documentos_pendentes,data.observacoes].filter(Boolean),assinaturas:[{cargo:"Responsável pelo repasse"},{cargo:"Responsável pelo recebimento"},{nome:assinatura.veneravel,cargo:"Venerável Mestre"},{nome:assinatura.tesoureiro,cargo:"Tesoureiro"}]};
    } else if (tipo === "custos-fixos") {
      const { data,error }=await supabase.from("custos_loja").select("*").eq("loja_id",lojaId).lte("data_inicio",fim).or(`data_fim.is.null,data_fim.gte.${inicio}`).order("data_inicio");if(error)throw error;const linhas=(data||[]) as Linha[];const total=linhas.reduce((s,i)=>s+Number(i.valor_total),0);
      relatorio={...base,titulo:"Relatório de Custos Fixos",resumo:[{rotulo:"Contratos / custos",valor:String(linhas.length)},{rotulo:"Valor total",valor:moedaBR(total)},{rotulo:"Média",valor:moedaBR(linhas.length?total/linhas.length:0)}],tabelas:[{colunas:["Fornecedor","Tipo / descrição","Vigência","Parcelas","Valor total"],larguras:[2.2,3,2,1,1.6],linhas:linhas.map(i=>[i.fornecedor_nome,`${i.tipo_divida} • ${i.descricao||"—"}`,periodoBR(String(i.data_inicio||""),i.data_fim?String(i.data_fim):null),i.parcelas_qtd,moedaBR(i.valor_total)])}],assinaturas:[{nome:assinatura.tesoureiro,cargo:"Tesoureiro"},{nome:assinatura.veneravel,cargo:"Venerável Mestre"}],orientacao:"landscape"};
    } else {
      const { data,error }=await supabase.from("solicitacoes_obreiro").select("protocolo,tipo,assunto,status,area_destino,criado_em,prazo_em,obreiro_id,obreiros(nome)").eq("loja_id",lojaId).gte("criado_em",`${inicio}T00:00:00`).lte("criado_em",`${fim}T23:59:59`).order("criado_em");if(error)throw error;const linhas=(data||[]) as Linha[];
      relatorio={...base,titulo:"Relatório de Solicitações",resumo:[{rotulo:"Total",valor:String(linhas.length)},{rotulo:"Pendentes",valor:String(linhas.filter(i=>i.status==="Pendente").length)},{rotulo:"Concluídas",valor:String(linhas.filter(i=>["Concluída","Aprovada"].includes(String(i.status))).length)}],tabelas:[{colunas:["Protocolo","Obreiro","Tipo / assunto","Área","Status","Prazo"],larguras:[1.4,2,3,1.5,1.6,1.2],linhas:linhas.map(i=>[i.protocolo,relacao(i.obreiros).nome,`${i.tipo} • ${i.assunto}`,i.area_destino,i.status,dataBR(i.prazo_em)])}],assinaturas:[{nome:assinatura.secretario,cargo:"Secretário"},{nome:assinatura.veneravel,cargo:"Venerável Mestre"}],orientacao:"landscape"};
    }

    const disposicao=url.searchParams.get("disposition")==="attachment"?"attachment":"inline";
    const { error: auditoriaError }=await supabase.from("relatorios_geracoes").insert({loja_id:lojaId,usuario_id:user.id,tipo,periodo_inicio:inicio,periodo_fim:fim,parametros:{sessaoId:url.searchParams.get("sessaoId")||null},disposicao});
    if(auditoriaError) return Response.json({erro:"O PDF foi preparado, mas sua auditoria não pôde ser registrada."},{status:500});
    const bytes=gerarPdfInstitucional(relatorio);
    return new Response(bytes,{headers:{"Content-Type":"application/pdf","Content-Disposition":`${disposicao}; filename="${nomeArquivo(tipo,inicio,fim)}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  } catch (erro) {
    const mensagem=erro instanceof Error?erro.message:"Não foi possível gerar o relatório.";
    return Response.json({erro:mensagem},{status:500});
  }
}
