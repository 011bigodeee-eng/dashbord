import Workspace from "@/components/workspace";
import { session } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
export const dynamic = "force-dynamic";
const routes = [
  "dashboard",
  "alunos",
  "treinos",
  "evolucao",
  "avaliacoes",
  "agenda",
  "check-ins",
  "financeiro",
  "planos",
  "comunicacao",
  "relatorios",
  "configuracoes",
  "login",
];
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const page = path[0] || "dashboard";
  if (
    !routes.includes(page) ||
    path.length > 2 ||
    (path.length === 2 && page !== "alunos")
  )
    notFound();
  const user = await session();
  if (!user && page !== "login") redirect("/login");
  if (user && page === "login") redirect("/");
  return <Workspace page={page} studentId={path[1]} initialUser={user} />;
}
