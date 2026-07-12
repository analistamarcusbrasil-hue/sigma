import { AppShell } from "@/components/AppShell";
import { LivroCaixaClient } from "@/components/LivroCaixaClient";

export default function LivroCaixaPage() {
  return <AppShell secao="Tesouraria" titulo="Livro Caixa" subtitulo="Controle oficial, auditável e vinculado à gestão atual."><LivroCaixaClient/></AppShell>;
}
