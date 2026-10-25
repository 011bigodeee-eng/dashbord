import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "MD Nation Athlete · Seu próximo nível",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MD Nation Athlete",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
