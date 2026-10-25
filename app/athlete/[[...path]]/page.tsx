import { session } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Athlete from "@/components/athlete/athlete";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const user = await session();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/portal");
  const { path = [] } = await params;
  const page = path[0] || "inicio";
  if (
    !["inicio", "treinos", "evolucao", "agenda", "perfil", "executar"].includes(
      page,
    ) ||
    path.length > 1
  )
    notFound();
  return <Athlete page={page} />;
}
