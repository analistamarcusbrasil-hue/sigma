import { jsPDF } from "jspdf";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function textoSeguro(valor: unknown) { return String(valor || "").trim(); }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: documento, error } = await supabase.from("secretaria_documentos").select("*").eq("id", id).single();
  if (error || !documento) return Response.json({ erro: "Documento não encontrado ou sem permissão." }, { status: 404 });
  if (!["Aprovado", "Arquivado"].includes(documento.status)) return Response.json({ erro: "O PDF definitivo só é liberado após aprovação." }, { status: 409 });

  const [{ data: loja }, { data: gestao }] = await Promise.all([
    supabase.from("lojas").select("nome,numero,potencia,oriente,uf,endereco,cidade,jurisdicao").eq("id", documento.loja_id).single(),
    documento.administracao_id ? supabase.from("administracoes").select("nome,data_inicio,data_fim").eq("id", documento.administracao_id).single() : Promise.resolve({ data: null }),
  ]);
  if (!loja) return Response.json({ erro: "Dados institucionais da Loja indisponíveis." }, { status: 404 });
  const lojaDados = loja;

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const largura = 210; const margem = 20; const limite = 277;
  const rodape = "Sistema desenvolvido por Marcus Brasil • Contato: analista.marcusbrasil@gmail.com";
  let y = 20;
  function cabecalho() {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(15); pdf.text(textoSeguro(lojaDados.nome).toUpperCase(), largura / 2, 18, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
    const linha = [lojaDados.numero && `Nº ${lojaDados.numero}`, lojaDados.potencia, lojaDados.oriente, lojaDados.uf].filter(Boolean).join(" • ");
    pdf.text(linha, largura / 2, 24, { align: "center" });
    if (gestao?.nome) pdf.text(`Gestão: ${gestao.nome}`, largura / 2, 29, { align: "center" });
    pdf.setDrawColor(180, 140, 20); pdf.line(margem, 33, largura - margem, 33); y = 42;
  }
  function aplicarRodape() {
    const paginas = pdf.getNumberOfPages();
    for (let pagina = 1; pagina <= paginas; pagina += 1) {
      pdf.setPage(pagina); pdf.setDrawColor(180); pdf.line(margem, 282, largura - margem, 282);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(90);
      pdf.text(rodape, largura / 2, 287, { align: "center" }); pdf.text(`Página ${pagina} de ${paginas}`, largura / 2, 292, { align: "center" }); pdf.setTextColor(0);
    }
  }
  function novaPaginaSePreciso(altura = 8) { if (y + altura > limite) { pdf.addPage(); cabecalho(); } }
  function paragrafo(texto: string, negrito = false) {
    if (!texto.trim()) return;
    pdf.setFont("helvetica", negrito ? "bold" : "normal"); pdf.setFontSize(negrito ? 12 : 10.5);
    const linhas = pdf.splitTextToSize(texto, largura - margem * 2) as string[];
    for (const linha of linhas) { novaPaginaSePreciso(6); pdf.text(linha, margem, y); y += 5.5; }
    y += 2;
  }

  cabecalho();
  paragrafo(`${textoSeguro(documento.tipo).toUpperCase()} Nº ${textoSeguro(documento.numero)}`, true);
  paragrafo(`Data: ${String(documento.data).split("-").reverse().join("/")}  •  Grau: ${textoSeguro(documento.grau) || "Não aplicável"}  •  Versão: ${documento.versao}`);
  y += 2; paragrafo(textoSeguro(documento.texto_oficial));

  const cargos = (documento.cargos || {}) as Record<string, string>;
  const assinaturas = [
    [cargos.secretario, "Secretário"], [cargos.veneravelMestre, "Venerável Mestre"],
    ...(documento.orador_aplicavel ? [[cargos.orador, "Orador"]] : []),
    ...(documento.tem_financeiro ? [[cargos.tesoureiro, "Tesoureiro"]] : []),
    ...(documento.tem_presenca ? [[cargos.chanceler, "Chanceler"]] : []),
  ].filter(([nome]) => textoSeguro(nome));
  if (assinaturas.length) {
    novaPaginaSePreciso(32); y += 10;
    for (let indice = 0; indice < assinaturas.length; indice += 2) {
      novaPaginaSePreciso(28); const dupla = assinaturas.slice(indice, indice + 2);
      dupla.forEach(([nome, cargo], coluna) => { const x = coluna === 0 ? 55 : 155; pdf.line(x - 35, y + 12, x + 35, y + 12); pdf.setFontSize(9); pdf.text(textoSeguro(nome), x, y + 17, { align: "center" }); pdf.text(textoSeguro(cargo), x, y + 22, { align: "center" }); });
      y += 30;
    }
  }
  aplicarRodape();
  const bytes = new Uint8Array(pdf.output("arraybuffer"));
  const nome = `${documento.categoria === "Balaústre" ? "balaustre" : "ata"}-${String(documento.numero).replace(/[^a-zA-Z0-9-]/g, "-")}.pdf`;
  return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nome}"`, "Cache-Control": "private, no-store" } });
}
