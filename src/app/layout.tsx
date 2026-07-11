import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SIGMA 2.0 | Gestão Maçônica",
    template: "%s | SIGMA 2.0",
  },
  description: "SIGMA 2.0 — Sistema Integrado de Gestão Maçônica",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
