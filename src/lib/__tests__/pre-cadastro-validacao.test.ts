import { describe, expect, it } from "vitest";
import { validarEntradaPreCadastro, type EntradaPreCadastro } from "../pre-cadastro-validacao";

const valido: EntradaPreCadastro = { lojaId: "00000000-0000-4000-8000-000000000001", nomeCompleto: "João Otálio Chave Brasil", email: "brasil_ap@msn.com", telefone: "(96) 99999-9999", cim: "3934001", grau: "Mestre", situacao: "Ativo", consentimento: true };
describe("validação do pré-cadastro público", () => {
  it("aceita dados obrigatórios válidos", () => expect(validarEntradaPreCadastro(valido).ok).toBe(true));
  it.each([["lojaId", ""], ["nomeCompleto", ""], ["email", ""], ["telefone", ""], ["cim", ""]] as const)("bloqueia campo obrigatório %s", (campo, valor) => expect(validarEntradaPreCadastro({ ...valido, [campo]: valor }).ok).toBe(false));
  it("bloqueia sem consentimento", () => expect(validarEntradaPreCadastro({ ...valido, consentimento: false }).ok).toBe(false));
  it("valida e-mail", () => expect(validarEntradaPreCadastro({ ...valido, email: "email-invalido" }).ok).toBe(false));
  it("valida telefone", () => expect(validarEntradaPreCadastro({ ...valido, telefone: "123" }).ok).toBe(false));
  it("limita observações", () => expect(validarEntradaPreCadastro({ ...valido, observacoes: "x".repeat(1501) }).ok).toBe(false));
});
