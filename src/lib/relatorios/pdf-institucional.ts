import { jsPDF } from "jspdf";

export const RODAPE_INSTITUCIONAL = "Sistema desenvolvido por Marcus Brasil • Contato: analista.marcusbrasil@gmail.com";

export type CelulaRelatorio = unknown;
export type TabelaRelatorio = { titulo?: string; colunas: string[]; linhas: CelulaRelatorio[][]; larguras?: number[] };
export type RelatorioInstitucional = {
  titulo: string;
  loja: { nome: string; numero?: string | null; potencia?: string | null; oriente?: string | null; uf?: string | null };
  gestao?: string | null;
  periodo: string;
  responsavel: string;
  resumo?: Array<{ rotulo: string; valor: string }>;
  tabelas: TabelaRelatorio[];
  observacoes?: string[];
  assinaturas?: Array<{ nome?: string | null; cargo: string }>;
  orientacao?: "portrait" | "landscape";
};

export const moedaBR = (valor: unknown) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataBR = (valor: unknown) => {
  const texto = String(valor || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto.split("-").reverse().join("/") : "—";
};
export const periodoBR = (inicio?: string | null, fim?: string | null) => inicio || fim ? `${dataBR(inicio)} a ${dataBR(fim || inicio)}` : "Todos os registros disponíveis";

function seguro(valor: CelulaRelatorio) { return String(valor ?? "—").replace(/\s+/g, " ").trim() || "—"; }

export function gerarPdfInstitucional(relatorio: RelatorioInstitucional) {
  const pdf = new jsPDF({ orientation: relatorio.orientacao ?? "portrait", unit: "mm", format: "a4" });
  const larguraPagina = pdf.internal.pageSize.getWidth();
  const alturaPagina = pdf.internal.pageSize.getHeight();
  const margem = 14;
  const inicioConteudo = 47;
  const limiteConteudo = alturaPagina - 24;
  let y = inicioConteudo;

  function cabecalho() {
    pdf.setTextColor(20, 25, 35);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
    pdf.text(seguro(relatorio.loja.nome).toUpperCase(), larguraPagina / 2, 15, { align: "center", maxWidth: larguraPagina - 28 });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5);
    const identidade = [relatorio.loja.numero && `Loja nº ${relatorio.loja.numero}`, relatorio.loja.potencia, relatorio.loja.oriente, relatorio.loja.uf].filter(Boolean).join(" • ");
    pdf.text(identidade || "Identificação institucional da Loja", larguraPagina / 2, 21, { align: "center" });
    pdf.setDrawColor(190, 145, 20); pdf.setLineWidth(0.6); pdf.line(margem, 25, larguraPagina - margem, 25);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text(relatorio.titulo, margem, 32);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.8);
    pdf.text(`Gestão: ${seguro(relatorio.gestao)}  •  Período: ${relatorio.periodo}`, margem, 38, { maxWidth: larguraPagina - margem * 2 });
    pdf.text(`Emissão: ${new Date().toLocaleString("pt-BR")}  •  Responsável: ${relatorio.responsavel}`, margem, 43, { maxWidth: larguraPagina - margem * 2 });
    y = inicioConteudo;
  }

  function novaPagina() { pdf.addPage(); cabecalho(); }
  function garantir(altura: number) { if (y + altura > limiteConteudo) novaPagina(); }
  function tituloSecao(titulo: string) {
    garantir(9); pdf.setFillColor(245, 242, 232); pdf.roundedRect(margem, y, larguraPagina - margem * 2, 7, 1, 1, "F");
    pdf.setTextColor(45, 40, 30); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.text(titulo, margem + 3, y + 4.8); y += 10;
  }

  cabecalho();
  if (relatorio.resumo?.length) {
    tituloSecao("Resumo");
    const larguraCard = (larguraPagina - margem * 2 - 6) / 3;
    relatorio.resumo.forEach((item, indice) => {
      if (indice > 0 && indice % 3 === 0) y += 19;
      garantir(18);
      const coluna = indice % 3; const x = margem + coluna * (larguraCard + 3);
      pdf.setDrawColor(220); pdf.roundedRect(x, y, larguraCard, 16, 1.5, 1.5, "S");
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(90); pdf.text(item.rotulo, x + 3, y + 5, { maxWidth: larguraCard - 6 });
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(20); pdf.text(item.valor, x + 3, y + 12, { maxWidth: larguraCard - 6 });
    });
    y += 22;
  }

  for (const tabela of relatorio.tabelas) {
    if (tabela.titulo) tituloSecao(tabela.titulo);
    const disponivel = larguraPagina - margem * 2;
    const pesos = tabela.larguras?.length === tabela.colunas.length ? tabela.larguras : tabela.colunas.map(() => 1);
    const somaPesos = pesos.reduce((s, n) => s + n, 0);
    const larguras = pesos.map((peso) => disponivel * peso / somaPesos);
    const desenharCabecalho = () => {
      garantir(9); let x = margem; pdf.setFillColor(35, 43, 56); pdf.rect(margem, y, disponivel, 8, "F");
      pdf.setTextColor(255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
      tabela.colunas.forEach((coluna, i) => { pdf.text(seguro(coluna), x + 2, y + 5, { maxWidth: larguras[i] - 4 }); x += larguras[i]; });
      y += 8;
    };
    desenharCabecalho();
    if (!tabela.linhas.length) {
      pdf.setTextColor(100); pdf.setFont("helvetica", "italic"); pdf.setFontSize(8); pdf.text("Nenhum registro no período.", margem + 2, y + 6); y += 10;
    }
    tabela.linhas.forEach((linha, indice) => {
      const quebradas = linha.map((celula, i) => pdf.splitTextToSize(seguro(celula), Math.max(8, larguras[i] - 4)) as string[]);
      const altura = Math.max(7, Math.max(...quebradas.map((item) => item.length), 1) * 3.6 + 3);
      if (y + altura > limiteConteudo) { novaPagina(); desenharCabecalho(); }
      if (indice % 2 === 1) { pdf.setFillColor(248, 248, 248); pdf.rect(margem, y, disponivel, altura, "F"); }
      let x = margem; pdf.setTextColor(35); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.2);
      quebradas.forEach((texto, i) => { pdf.text(texto, x + 2, y + 4.5); x += larguras[i]; });
      pdf.setDrawColor(228); pdf.line(margem, y + altura, margem + disponivel, y + altura); y += altura;
    });
    y += 5;
  }

  if (relatorio.observacoes?.length) {
    tituloSecao("Observações"); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(35);
    for (const observacao of relatorio.observacoes.filter(Boolean)) {
      const linhas = pdf.splitTextToSize(observacao, larguraPagina - margem * 2) as string[];
      for (const linha of linhas) { garantir(5); pdf.text(linha, margem, y); y += 4; }
      y += 2;
    }
  }

  if (relatorio.assinaturas?.length) {
    garantir(30); y += 10;
    for (let i = 0; i < relatorio.assinaturas.length; i += 2) {
      garantir(27); const dupla = relatorio.assinaturas.slice(i, i + 2);
      dupla.forEach((assinatura, coluna) => {
        const x = coluna === 0 ? larguraPagina * .28 : larguraPagina * .72;
        pdf.setDrawColor(80); pdf.line(x - 31, y + 10, x + 31, y + 10);
        pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.text(seguro(assinatura.nome), x, y + 15, { align: "center", maxWidth: 62 });
        pdf.setFont("helvetica", "bold"); pdf.text(assinatura.cargo, x, y + 20, { align: "center" });
      });
      y += 27;
    }
  }

  const paginas = pdf.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    pdf.setPage(pagina); pdf.setDrawColor(190); pdf.line(margem, alturaPagina - 15, larguraPagina - margem, alturaPagina - 15);
    pdf.setTextColor(90); pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.8);
    pdf.text(RODAPE_INSTITUCIONAL, larguraPagina / 2, alturaPagina - 10.5, { align: "center" });
    pdf.text(`Página ${pagina} de ${paginas}`, larguraPagina / 2, alturaPagina - 6.5, { align: "center" });
  }
  return new Uint8Array(pdf.output("arraybuffer"));
}
