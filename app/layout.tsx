import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import "./athlete.css";
export const metadata: Metadata = {
  title: `${brand.name} · ${brand.descriptor}`,
  description: "Sua operação. Seus alunos. Sua evolução.",
  icons: { icon: "data:," },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
