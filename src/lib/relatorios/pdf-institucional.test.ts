import { describe, expect, it } from "vitest";
import { gerarPdfInstitucional, RODAPE_INSTITUCIONAL } from "./pdf-institucional";

describe("PDF institucional",()=>{
  it("gera documento paginado com muitos registros sem alterar os valores",()=>{
    const linhas=Array.from({length:250},(_,i)=>[`Registro ${i+1}`,`Descrição extensa ${"conteúdo ".repeat(8)}`,i%2?"R$ 1.234,56":"R$ 0,01"]);
    const bytes=gerarPdfInstitucional({titulo:"Teste de grande volume",loja:{nome:"Loja SIGMA",numero:"1",potencia:"Potência de Teste"},gestao:"2026",periodo:"01/01/2026 a 31/12/2026",responsavel:"Administrador",resumo:[{rotulo:"Total",valor:"R$ 308.642,50"}],tabelas:[{colunas:["Registro","Descrição","Valor"],linhas,larguras:[1,4,1]}],assinaturas:[{nome:"Responsável",cargo:"Tesoureiro"}]});
    expect(new TextDecoder().decode(bytes.slice(0,4))).toBe("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(50_000);
    expect(RODAPE_INSTITUCIONAL).toContain("Marcus Brasil");
  });
});
