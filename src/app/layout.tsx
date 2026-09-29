import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Observabilidade | Plataforma PIPA",
  description: "Visão geral operacional dos serviços e ferramentas da Plataforma PIPA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
