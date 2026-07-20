import { createClient } from "@/lib/supabase/server";
import { dataBR, gerarPdfInstitucional } from "@/lib/relatorios/pdf-institucional";

export const dynamic="force-dynamic";
export async function GET(request:Request,contexto:RouteContext<"/api/secretaria/documentos/[id]/pdf">){
  const{id}=await contexto.params;const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();
  if(!user)return Response.json({erro:"Não autenticado."},{status:401});
  const{data:documento,error}=await supabase.from("secretaria_documentos").select("*").eq("id",id).single();
  if(error||!documento)return Response.json({erro:"Documento não encontrado ou sem permissão."},{status:404});
  if(!["Aprovado","Arquivado"].includes(documento.status))return Response.json({erro:"O PDF definitivo só é liberado após aprovação."},{status:409});
  const[{data:loja},{data:gestao},{data:perfil}]=await Promise.all([
    supabase.from("lojas").select("nome,numero,potencia,oriente,uf").eq("id",documento.loja_id).single(),
    documento.administracao_id?supabase.from("administracoes").select("nome").eq("id",documento.administracao_id).single():Promise.resolve({data:null}),
    supabase.from("profiles").select("nome").eq("id",user.id).maybeSingle(),
  ]);
  if(!loja)return Response.json({erro:"Dados institucionais da Loja indisponíveis."},{status:404});
  const url=new URL(request.url);const disposicao=url.searchParams.get("disposition")==="attachment"?"attachment":"inline";const cargos=(documento.cargos||{}) as Record<string,string>;
  const{error:auditoria}=await supabase.from("relatorios_geracoes").insert({loja_id:documento.loja_id,usuario_id:user.id,tipo:"balaustre-ata",periodo_inicio:documento.data,periodo_fim:documento.data,parametros:{documentoId:id,versao:documento.versao},disposicao});
  if(auditoria)return Response.json({erro:"O PDF foi preparado, mas sua auditoria não pôde ser registrada."},{status:500});
  const bytes=gerarPdfInstitucional({titulo:`${documento.tipo} nº ${documento.numero}`,loja,gestao:gestao?.nome,periodo:dataBR(documento.data),responsavel:perfil?.nome||user.email||"Usuário autenticado",resumo:[{rotulo:"Status",valor:documento.status},{rotulo:"Grau",valor:documento.grau||"Não aplicável"},{rotulo:"Versão",valor:String(documento.versao)}],tabelas:[{titulo:"Texto oficial",colunas:["Documento aprovado"],linhas:[[documento.texto_oficial]]}],assinaturas:[{nome:cargos.secretario,cargo:"Secretário"},{nome:cargos.veneravelMestre,cargo:"Venerável Mestre"},...(documento.orador_aplicavel?[{nome:cargos.orador,cargo:"Orador"}]:[]),...(documento.tem_financeiro?[{nome:cargos.tesoureiro,cargo:"Tesoureiro"}]:[]),...(documento.tem_presenca?[{nome:cargos.chanceler,cargo:"Chanceler"}]:[])]});
  const nome=`${documento.categoria==="Balaústre"?"balaustre":"ata"}-${String(documento.numero).replace(/[^a-zA-Z0-9-]/g,"-")}.pdf`;
  return new Response(bytes,{headers:{"Content-Type":"application/pdf","Content-Disposition":`${disposicao}; filename="${nome}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
